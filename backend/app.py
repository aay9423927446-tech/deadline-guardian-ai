from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
import os
import json
import re
import time
from datetime import datetime

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder="static", static_url_path="")

CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=False,
)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite").strip()

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

DB_FILE = os.path.join(BASE_DIR, "tasks_db.json")
CACHE_FILE = os.path.join(BASE_DIR, "plan_cache.json")
PROMPT_VERSION = "deadline_guardian_v8_cloudrun_cors"


def load_json_file(filename, default_data):
    if not os.path.exists(filename):
        return default_data

    try:
        with open(filename, "r", encoding="utf-8") as file:
            return json.load(file)
    except Exception:
        return default_data


def save_json_file(filename, data):
    with open(filename, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)


def load_db():
    return load_json_file(DB_FILE, {"plans": []})


def save_db(data):
    save_json_file(DB_FILE, data)


def load_cache():
    return load_json_file(CACHE_FILE, {})


def save_cache(data):
    save_json_file(CACHE_FILE, data)


def normalize_cache_text(text):
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def get_cache_key(user_input):
    today = datetime.now().strftime("%Y-%m-%d")
    return f"{PROMPT_VERSION}::{today}::{normalize_cache_text(user_input)}"


def extract_json(text):
    if not text:
        raise ValueError("Empty response from Gemini")

    cleaned = str(text).strip()

    cleaned = cleaned.replace("```json", "")
    cleaned = cleaned.replace("```JSON", "")
    cleaned = cleaned.replace("```", "")
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except Exception:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")

    if start != -1 and end != -1 and end > start:
        possible_json = cleaned[start:end + 1]

        try:
            return json.loads(possible_json)
        except Exception:
            pass

    raise ValueError("No valid JSON found in Gemini response")

def is_quota_error(error_message):
    text = str(error_message).lower()

    return (
        "429" in text
        or "resource_exhausted" in text
        or "quota" in text
        or "rate limit" in text
    )


def clean_text(value, fallback="", max_chars=300):
    text = str(value or "").replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()

    if not text:
        return fallback

    if len(text) > max_chars:
        return text[:max_chars].strip() + "..."

    return text


def normalize_title_key(title):
    text = str(title or "").lower()
    text = re.sub(r"[^a-z0-9]+", "", text)
    return text


def clean_title(value, fallback="Task"):
    title = clean_text(value, fallback=fallback, max_chars=80)

    bad_titles = {
        "hour",
        "hours",
        "something",
        "anything",
        "for",
        "home",
        "task",
        "none",
        "null",
    }

    if title.lower().strip() in bad_titles:
        return fallback

    words = title.split()

    if len(words) > 8:
        title = " ".join(words[:8])

    return title


def ensure_list(value):
    return value if isinstance(value, list) else []


def normalize_user_input(user_input):
    text = str(user_input or "").strip()
    text = re.sub(r"\s+", " ", text)

    replacements = {
        "for and hour": "for 1 hour",
        "for an hour": "for 1 hour",
        "for a hour": "for 1 hour",
        "for an hours": "for 1 hour",
        "for a hours": "for 1 hour",
        "an hours": "1 hour",
        "and hour": "1 hour",
        "go to be": "go to bed",
        "go to be in night": "go to bed at night",
        "paper work": "paperwork",
        "prof": "professor",
    }

    for wrong, right in replacements.items():
        text = re.sub(wrong, right, text, flags=re.IGNORECASE)

    return text


def candidate_task(
    title,
    category,
    priority,
    time_text,
    estimated_time,
    reason,
    next_action,
):
    today = datetime.now()

    return {
        "title": title,
        "category": category,
        "priority": priority,
        "assigned_date": today.strftime("%Y-%m-%d"),
        "assigned_day": today.strftime("%A"),
        "deadline": today.strftime("%Y-%m-%d"),
        "estimated_time": estimated_time,
        "reason": reason,
        "next_action": next_action,
        "schedule_time": time_text,
    }


def add_unique_candidate(candidates, task):
    existing = {normalize_title_key(item["title"]) for item in candidates}
    key = normalize_title_key(task["title"])

    if key not in existing:
        candidates.append(task)


def extract_candidate_blocks(user_input):
    text = normalize_user_input(user_input)
    lower = text.lower()

    candidates = []

    if "gym" in lower or "workout" in lower:
        time_text = "6:00 AM - 8:30 AM" if "6:00" in lower and "8:30" in lower else "Morning"
        estimated = "2 hr 30 min" if "6:00" in lower and "8:30" in lower else "1 hour"

        add_unique_candidate(
            candidates,
            candidate_task(
                title="Gym Workout",
                category="Health",
                priority="Medium",
                time_text=time_text,
                estimated_time=estimated,
                reason="The user mentioned going to the gym for workout.",
                next_action="Keep gym clothes and water bottle ready.",
            ),
        )

    if "fresh" in lower or "shower" in lower:
        add_unique_candidate(
            candidates,
            candidate_task(
                title="Fresh Up & Shower",
                category="Health",
                priority="Medium",
                time_text="After Gym",
                estimated_time="30 minutes",
                reason="The user mentioned freshening up and taking a shower.",
                next_action="Finish shower quickly before the next routine block.",
            ),
        )

    if "breakfast" in lower:
        time_text = "9:30 AM" if "9:30" in lower else "Morning"

        add_unique_candidate(
            candidates,
            candidate_task(
                title="Breakfast",
                category="Health",
                priority="Medium",
                time_text=time_text,
                estimated_time="30 minutes",
                reason="The user mentioned breakfast.",
                next_action="Have breakfast before starting study or work.",
            ),
        )

    if "python" in lower or "course" in lower:
        add_unique_candidate(
            candidates,
            candidate_task(
                title="Python Course",
                category="Study",
                priority="High",
                time_text="Flexible",
                estimated_time="1 hour",
                reason="The user mentioned doing a Python course.",
                next_action="Open the Python course and complete one module.",
            ),
        )

    if "meeting" in lower:
        title = "Paperwork Meeting"

        if "friend" in lower and "professor" in lower:
            title = "Friend & Professor Meeting"

        add_unique_candidate(
            candidates,
            candidate_task(
                title=title,
                category="Work",
                priority="High",
                time_text="Flexible",
                estimated_time="1 hour",
                reason="The user mentioned a meeting related to paperwork.",
                next_action="Confirm meeting time and agenda.",
            ),
        )

    if "paperwork" in lower:
        add_unique_candidate(
            candidates,
            candidate_task(
                title="Complete Paperwork",
                category="Work",
                priority="High",
                time_text="Flexible",
                estimated_time="1 hour",
                reason="The user mentioned paperwork that needs to be completed.",
                next_action="Gather required documents for paperwork.",
            ),
        )

    if "lunch" in lower:
        time_text = "1:00 PM" if "1:00" in lower else "Afternoon"

        add_unique_candidate(
            candidates,
            candidate_task(
                title="Lunch",
                category="Health",
                priority="Medium",
                time_text=time_text,
                estimated_time="30 minutes",
                reason="The user mentioned lunch.",
                next_action="Take lunch on time and avoid skipping meals.",
            ),
        )

    if "nap" in lower:
        add_unique_candidate(
            candidates,
            candidate_task(
                title="Quick Nap",
                category="Health",
                priority="Medium",
                time_text="After Lunch",
                estimated_time="1 hour",
                reason="The user mentioned taking a quick nap.",
                next_action="Set an alarm before starting the nap.",
            ),
        )

    if "read" in lower or "reading" in lower or "book" in lower:
        add_unique_candidate(
            candidates,
            candidate_task(
                title="Reading Session",
                category="Study",
                priority="Medium",
                time_text="Flexible",
                estimated_time="1 hour",
                reason="The user mentioned reading a book.",
                next_action="Choose the book and read the first few pages.",
            ),
        )

    if "tea" in lower or "family time" in lower or "family" in lower:
        if "5:30" in lower and "10:00" in lower:
            time_text = "5:30 PM - 10:00 PM"
            estimated = "4 hr 30 min"
        elif "5:30" in lower:
            time_text = "5:30 PM"
            estimated = "1 hour"
        else:
            time_text = "Evening"
            estimated = "1 hour"

        add_unique_candidate(
            candidates,
            candidate_task(
                title="Tea & Family Time",
                category="Personal",
                priority="Medium",
                time_text=time_text,
                estimated_time=estimated,
                reason="The user mentioned tea and family time.",
                next_action="Keep this as a relaxed evening block.",
            ),
        )

    if "dinner" in lower:
        add_unique_candidate(
            candidates,
            candidate_task(
                title="Dinner",
                category="Health",
                priority="Medium",
                time_text="10:00 PM" if "10:00" in lower else "Night",
                estimated_time="30 minutes",
                reason="The user mentioned dinner.",
                next_action="Finish dinner without delaying sleep too much.",
            ),
        )

    if "youtube" in lower:
        add_unique_candidate(
            candidates,
            candidate_task(
                title="Watch YouTube",
                category="Personal",
                priority="Low",
                time_text="Night",
                estimated_time="30 minutes",
                reason="The user mentioned watching YouTube content.",
                next_action="Limit YouTube time so it does not disturb sleep.",
            ),
        )

    if "sleep" in lower or "bed" in lower or "12:30" in lower:
        add_unique_candidate(
            candidates,
            candidate_task(
                title="Sleep",
                category="Health",
                priority="High",
                time_text="12:30 AM" if "12:30" in lower else "Night",
                estimated_time="Rest block",
                reason="The user mentioned going to bed or sleeping.",
                next_action="Keep phone aside and prepare for sleep.",
            ),
        )

    if "break" in lower:
        add_unique_candidate(
            candidates,
            candidate_task(
                title="Break Between Tasks",
                category="Health",
                priority="Medium",
                time_text="Between Tasks",
                estimated_time="15 minutes",
                reason="The user mentioned needing breaks between tasks.",
                next_action="Take short breaks between heavy task blocks.",
            ),
        )

    return candidates


def time_sort_key(time_text):
    text = str(time_text or "").lower()

    if "after gym" in text:
        return 8 * 60 + 40

    if "after lunch" in text:
        return 14 * 60

    if "between" in text:
        return 15 * 60

    if "flexible" in text:
        return 16 * 60

    if "morning" in text:
        return 8 * 60

    if "afternoon" in text:
        return 13 * 60

    if "evening" in text:
        return 17 * 60

    if "night" in text:
        return 21 * 60

    match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", text)

    if not match:
        return 20 * 60

    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    period = match.group(3)

    if period == "pm" and hour != 12:
        hour += 12

    if period == "am" and hour == 12:
        hour = 0

    if not period:
        if hour <= 4:
            hour += 12

    return hour * 60 + minute


def sanitize_plan(plan, candidate_blocks=None):
    candidate_blocks = candidate_blocks or []

    if not isinstance(plan, dict):
        plan = {}

    default_keys = {
        "summary": "Your routine has been converted into a practical day plan.",
        "tasks": [],
        "today_schedule": [],
        "weekly_plan": [],
        "reminders": [],
        "habits": [],
        "motivational_cards": [],
        "next_best_action": "Start with the first planned block.",
        "productivity_tip": "Follow your day in blocks and take short breaks between heavy tasks.",
    }

    for key, value in default_keys.items():
        if key not in plan:
            plan[key] = value

    cleaned_tasks = []

    for task in ensure_list(plan.get("tasks")):
        if not isinstance(task, dict):
            continue

        title = clean_title(task.get("title"), "Task")

        if normalize_title_key(title) in ["hour", "something", "for", "home", "task"]:
            continue

        cleaned_tasks.append({
            "title": title,
            "category": clean_text(task.get("category"), "Other", 40),
            "priority": clean_text(task.get("priority"), "Medium", 20),
            "assigned_date": clean_text(
                task.get("assigned_date"),
                datetime.now().strftime("%Y-%m-%d"),
                30,
            ),
            "assigned_day": clean_text(
                task.get("assigned_day"),
                datetime.now().strftime("%A"),
                30,
            ),
            "deadline": clean_text(
                task.get("deadline"),
                task.get("assigned_date") or datetime.now().strftime("%Y-%m-%d"),
                60,
            ),
            "estimated_time": clean_text(task.get("estimated_time"), "Flexible", 40),
            "reason": clean_text(
                task.get("reason"),
                "This task was detected from your input.",
                220,
            ),
            "next_action": clean_text(
                task.get("next_action"),
                "Start with one small step.",
                160,
            ),
        })

    existing_task_keys = {normalize_title_key(task["title"]) for task in cleaned_tasks}

    for candidate in candidate_blocks:
        key = normalize_title_key(candidate["title"])

        if key not in existing_task_keys:
            cleaned_tasks.append({
                "title": candidate["title"],
                "category": candidate["category"],
                "priority": candidate["priority"],
                "assigned_date": candidate["assigned_date"],
                "assigned_day": candidate["assigned_day"],
                "deadline": candidate["deadline"],
                "estimated_time": candidate["estimated_time"],
                "reason": candidate["reason"],
                "next_action": candidate["next_action"],
            })
            existing_task_keys.add(key)

    plan["tasks"] = cleaned_tasks

    cleaned_schedule = []

    for item in ensure_list(plan.get("today_schedule")):
        if not isinstance(item, dict):
            continue

        activity = clean_title(item.get("activity"), "Scheduled Activity")

        cleaned_schedule.append({
            "time": clean_text(item.get("time"), "Flexible", 50),
            "activity": activity,
            "reason": clean_text(
                item.get("reason"),
                "This item belongs to today's routine.",
                180,
            ),
        })

    existing_schedule_keys = {
        normalize_title_key(item["activity"]) for item in cleaned_schedule
    }

    for candidate in candidate_blocks:
        key = normalize_title_key(candidate["title"])

        if key not in existing_schedule_keys:
            cleaned_schedule.append({
                "time": candidate["schedule_time"],
                "activity": candidate["title"],
                "reason": candidate["reason"],
            })
            existing_schedule_keys.add(key)

    cleaned_schedule.sort(key=lambda item: time_sort_key(item.get("time")))
    plan["today_schedule"] = cleaned_schedule

    cleaned_weekly = []

    for day_block in ensure_list(plan.get("weekly_plan")):
        if not isinstance(day_block, dict):
            continue

        cleaned_items = []

        for item in ensure_list(day_block.get("items")):
            if not isinstance(item, dict):
                continue

            cleaned_items.append({
                "time": clean_text(item.get("time"), "Flexible", 50),
                "title": clean_title(item.get("title"), "Task"),
                "category": clean_text(item.get("category"), "Other", 40),
                "reason": clean_text(
                    item.get("reason"),
                    "This belongs to this future day.",
                    180,
                ),
            })

        if cleaned_items:
            cleaned_weekly.append({
                "day": clean_text(day_block.get("day"), "Future Day", 30),
                "date": clean_text(day_block.get("date"), "", 30),
                "items": cleaned_items,
            })

    plan["weekly_plan"] = cleaned_weekly

    cleaned_reminders = []

    for reminder in ensure_list(plan.get("reminders"))[:5]:
        if not isinstance(reminder, dict):
            continue

        cleaned_reminders.append({
            "time": clean_text(reminder.get("time"), "Before task", 60),
            "message": clean_text(reminder.get("message"), "Reminder", 120),
            "context": clean_text(
                reminder.get("context"),
                "This reminder helps you stay on track.",
                180,
            ),
            "action": clean_text(
                reminder.get("action"),
                "Take the next small action.",
                150,
            ),
        })

    if len(cleaned_reminders) < 3:
        for candidate in candidate_blocks[:5]:
            cleaned_reminders.append({
                "time": candidate["schedule_time"],
                "message": f"Reminder: {candidate['title']}",
                "context": candidate["reason"],
                "action": candidate["next_action"],
            })

            if len(cleaned_reminders) >= 5:
                break

    plan["reminders"] = cleaned_reminders[:5]

    cleaned_habits = []

    for habit in ensure_list(plan.get("habits")):
        if not isinstance(habit, dict):
            continue

        cleaned_habits.append({
            "name": clean_title(habit.get("name"), "Habit"),
            "frequency": clean_text(habit.get("frequency"), "Daily", 40),
            "streak": clean_text(habit.get("streak"), "New habit", 40),
            "status": clean_text(habit.get("status"), "Pending", 40),
            "next_action": clean_text(
                habit.get("next_action"),
                "Do a small version today.",
                150,
            ),
        })

    plan["habits"] = cleaned_habits

    cleaned_cards = []

    for card in ensure_list(plan.get("motivational_cards"))[:4]:
        if not isinstance(card, dict):
            continue

        cleaned_cards.append({
            "title": clean_title(card.get("title"), "Keep Going"),
            "quote": clean_text(
                card.get("quote"),
                "Small progress is still progress.",
                160,
            ),
            "action": clean_text(card.get("action"), "Start now.", 100),
        })

    if not cleaned_cards:
        cleaned_cards = [
            {
                "title": "One Block At A Time",
                "quote": "A long day becomes easier when it is divided into small blocks.",
                "action": "Start with the first block.",
            },
            {
                "title": "Protect Your Energy",
                "quote": "Meals, breaks, and sleep are part of productivity.",
                "action": "Take short breaks between heavy tasks.",
            },
        ]

    plan["motivational_cards"] = cleaned_cards

    plan["summary"] = clean_text(
        plan.get("summary"),
        default_keys["summary"],
        250,
    )

    plan["next_best_action"] = clean_text(
        plan.get("next_best_action"),
        candidate_blocks[0]["next_action"] if candidate_blocks else default_keys["next_best_action"],
        180,
    )

    plan["productivity_tip"] = clean_text(
        plan.get("productivity_tip"),
        default_keys["productivity_tip"],
        180,
    )

    return plan


def build_prompt(user_input, candidate_blocks):
    now = datetime.now()
    today_full = now.strftime("%A, %d %B %Y, %I:%M %p")
    today_date = now.strftime("%Y-%m-%d")
    today_day = now.strftime("%A")

    candidate_json = json.dumps(candidate_blocks, indent=2, ensure_ascii=False)

    return f"""
You are Deadline Guardian AI, an AI-powered productivity companion.

Current date and time:
{today_full}

Today date:
{today_date}

Today day:
{today_day}

User input:
{user_input}

Detected candidate routine blocks from the user input:
{candidate_json}

TASK:
Convert the user's messy natural language into a full productivity plan.

CRITICAL RULE:
If detected candidate routine blocks are provided, include those blocks in BOTH:
1. tasks
2. today_schedule

Do not reduce them to only 3 important tasks.
The user expects all meaningful routine blocks to appear.

TASK EXTRACTION RULES:
1. Extract every meaningful action from the user input.
2. For daily routine input, include:
   gym/workout, shower/fresh up, breakfast, study/course, meeting, paperwork,
   lunch, nap, reading, tea/family time, dinner, entertainment, sleep, breaks.
3. Do not create meaningless tasks like "Hour", "Something", "For", "Home".
4. Task titles must be short and clean, maximum 6 words.
5. If the user gives a time range like "6:00 to 8:30", preserve it.
6. If the user says "around 9:30", preserve it.
7. If the user says "for 1 hour", preserve duration.
8. If user describes today's routine without saying today, treat it as today.
9. If many tasks are present, return many tasks.
10. Do not invent revision/preparation tasks unless the user clearly mentioned revision or preparation.

DATE RULES:
1. today/tonight/morning/afternoon/evening = today's date.
2. no day/date = today's date.
3. tomorrow = next day.
4. after 2 days / after 3 days = calculate date.
5. weekday names = next upcoming occurrence.
6. specific date = that exact date.
7. Future tasks must not go inside today_schedule.
8. weekly_plan should contain only future tasks explicitly mentioned by the user.
9. If no future tasks exist, weekly_plan must be [].
10. Daily habits like "gym daily" go in habits, not repeated across weekly_plan.

Return ONLY valid JSON.
No markdown.
No explanation outside JSON.

Use exactly this structure:

{{
  "summary": "Short summary of user's situation",
  "tasks": [
    {{
      "title": "Short task name",
      "category": "Study/Work/Personal/Bill/Health/Other",
      "priority": "High/Medium/Low",
      "assigned_date": "YYYY-MM-DD",
      "assigned_day": "Monday/Tuesday/etc",
      "deadline": "Detected deadline or estimated deadline",
      "estimated_time": "Estimated time required",
      "reason": "Why this priority was chosen",
      "next_action": "Very small first action"
    }}
  ],
  "today_schedule": [
    {{
      "time": "Time range or flexible",
      "activity": "Short activity name",
      "reason": "Why this is scheduled today"
    }}
  ],
  "weekly_plan": [
    {{
      "day": "Day name",
      "date": "YYYY-MM-DD",
      "items": [
        {{
          "time": "Time or flexible",
          "title": "Task title",
          "category": "Study/Work/Personal/Bill/Health/Other",
          "reason": "Why it belongs on this day"
        }}
      ]
    }}
  ],
  "reminders": [
    {{
      "time": "Suggested reminder time",
      "message": "Reminder message",
      "context": "Why this reminder is important",
      "action": "What user should do"
    }}
  ],
  "habits": [
    {{
      "name": "Habit name",
      "frequency": "Daily/Weekly/One-time",
      "streak": "New habit",
      "status": "Pending",
      "next_action": "Small action to maintain habit"
    }}
  ],
  "motivational_cards": [
    {{
      "title": "Short motivational title",
      "quote": "Short productivity quote",
      "action": "Tiny action"
    }}
  ],
  "next_best_action": "The one action user should start right now",
  "productivity_tip": "One personalized productivity tip"
}}

QUALITY RULES:
1. Be practical.
2. Keep output realistic for a student.
3. Include all clear routine blocks.
4. Create 3 to 5 reminders.
5. Create 2 to 4 motivational cards.
6. Do not invent tasks not present in user input.
"""


def build_rescue_prompt(task, plan_summary, today_schedule, weekly_plan, current_status, raw_input):
    now = datetime.now().strftime("%A, %d %B %Y, %I:%M %p")

    return f"""
You are Deadline Guardian AI Rescue Agent.

Current date and time:
{now}

Original input:
{raw_input}

Plan summary:
{plan_summary}

Current task status:
{current_status}

Task needing rescue:
{json.dumps(task, indent=2, ensure_ascii=False)}

Today's schedule:
{json.dumps(today_schedule, indent=2, ensure_ascii=False)}

Weekly plan:
{json.dumps(weekly_plan, indent=2, ensure_ascii=False)}

Create a small recovery plan because the user is delayed or stuck.

Return ONLY valid JSON.

Use this structure:

{{
  "rescue_summary": "Short summary",
  "missed_task": "Task name",
  "risk_level": "High/Medium/Low",
  "emergency_sprint": {{
    "duration": "15 minutes / 25 minutes / 45 minutes",
    "goal": "Small recovery goal",
    "steps": [
      "Step 1",
      "Step 2",
      "Step 3"
    ]
  }},
  "schedule_adjustments": [
    {{
      "change": "What to shift or reduce",
      "reason": "Why this helps"
    }}
  ],
  "recovery_message": "Short encouraging message",
  "calendar_suggestion": "Suggested calendar update"
}}

Rules:
1. No shame.
2. Keep it small and doable.
3. Prefer 15 minutes for urgent tasks.
4. Protect high-priority tasks.
5. Suggest postponing low-priority tasks.
"""


def generate_with_fallback(prompt, max_output_tokens=4096):
    if not client:
        raise Exception("Gemini API key is missing.")

    models = []

    if GEMINI_MODEL:
        models.append(GEMINI_MODEL)

    fallback_models = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
    ]

    for model in fallback_models:
        if model not in models:
            models.append(model)

    last_error = None

    for model in models:
        try:
            print(f"Trying Gemini model: {model}")

            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "temperature": 0.2,
                        "top_p": 0.9,
                        "max_output_tokens": max_output_tokens,
                        "response_mime_type": "application/json",
                    },
                )
            except TypeError:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                )

            if response and response.text:
                print(f"Success with model: {model}")
                return response.text, model

        except Exception as e:
            last_error = str(e)
            print(f"Gemini error on {model}: {last_error}")

            if is_quota_error(last_error):
                raise Exception(
                    "Gemini quota is exhausted. Please wait for quota reset or use another API key."
                )

            time.sleep(1)

    raise Exception(f"Gemini is temporarily unavailable. Last error: {last_error}")


@app.route("/api/health", methods=["GET", "OPTIONS"])
def health():
    return jsonify({
        "success": True,
        "status": "ok",
        "message": "Deadline Guardian AI Backend is running",
        "model": GEMINI_MODEL,
        "time": datetime.now().isoformat(),
    })


@app.route("/api/plan", methods=["POST", "OPTIONS"])
def create_plan():
    if request.method == "OPTIONS":
        return jsonify({"success": True})

    try:
        if not GEMINI_API_KEY:
            return jsonify({
                "success": False,
                "error": "Gemini API key is missing. Please add GEMINI_API_KEY in backend/.env file."
            }), 500

        data = request.get_json() or {}
        user_input = data.get("taskText", "").strip()

        if not user_input:
            return jsonify({
                "success": False,
                "error": "Task text is required."
            }), 400

        candidate_blocks = extract_candidate_blocks(user_input)

        cache_key = get_cache_key(user_input)
        cache = load_cache()

        if cache_key in cache:
            cached = cache[cache_key]

            return jsonify({
                "success": True,
                "model_used": f"{cached.get('model_used', 'Gemini')} (cached)",
                "plan": cached.get("plan")
            })

        prompt = build_prompt(user_input, candidate_blocks)

        ai_text, used_model = generate_with_fallback(prompt, max_output_tokens=4096)
        plan = extract_json(ai_text)
        plan = sanitize_plan(plan, candidate_blocks)

        db = load_db()

        plan_record = {
            "id": len(db["plans"]) + 1,
            "created_at": datetime.now().isoformat(),
            "raw_input": user_input,
            "model_used": used_model,
            "plan": plan
        }

        db["plans"].append(plan_record)
        save_db(db)

        cache[cache_key] = {
            "created_at": datetime.now().isoformat(),
            "model_used": used_model,
            "plan": plan
        }

        save_cache(cache)

        return jsonify({
            "success": True,
            "model_used": used_model,
            "plan": plan
        })

    except Exception as e:
        error_message = str(e)
        print("Create plan error:", error_message)

        if is_quota_error(error_message):
            clean_error = "Gemini quota is exhausted. Please wait for quota reset or use another API key."
        elif (
            "503" in error_message
            or "UNAVAILABLE" in error_message
            or "high demand" in error_message
            or "temporarily unavailable" in error_message
        ):
            clean_error = "Gemini is temporarily busy. Please try again in a few seconds."
        else:
            clean_error = error_message

        return jsonify({
            "success": False,
            "error": clean_error
        }), 500


@app.route("/api/rescue", methods=["POST", "OPTIONS"])
def rescue_task():
    if request.method == "OPTIONS":
        return jsonify({"success": True})

    try:
        if not GEMINI_API_KEY:
            return jsonify({
                "success": False,
                "error": "Gemini API key is missing."
            }), 500

        data = request.get_json() or {}

        task = data.get("task", {})
        plan_summary = data.get("plan_summary", "")
        today_schedule = data.get("today_schedule", [])
        weekly_plan = data.get("weekly_plan", [])
        current_status = data.get("current_status", "Pending")
        raw_input = data.get("raw_input", "")

        if not task:
            return jsonify({
                "success": False,
                "error": "Task is required for rescue planning."
            }), 400

        prompt = build_rescue_prompt(
            task=task,
            plan_summary=plan_summary,
            today_schedule=today_schedule,
            weekly_plan=weekly_plan,
            current_status=current_status,
            raw_input=raw_input
        )

        ai_text, used_model = generate_with_fallback(prompt, max_output_tokens=1800)
        rescue_plan = extract_json(ai_text)

        default_rescue = {
            "rescue_summary": "This task needs a quick recovery plan.",
            "missed_task": task.get("title", "Selected task"),
            "risk_level": task.get("priority", "Medium"),
            "emergency_sprint": {
                "duration": "15 minutes",
                "goal": "Make meaningful progress immediately.",
                "steps": [
                    "Open the required material.",
                    "Work only on the smallest first step.",
                    "Stop distractions for the next 15 minutes."
                ]
            },
            "schedule_adjustments": [
                {
                    "change": "Postpone one low-priority task.",
                    "reason": "This creates space for the urgent task."
                }
            ],
            "recovery_message": "You are not behind forever. Restart with one small action.",
            "calendar_suggestion": "Create a short recovery block in your calendar."
        }

        for key, value in default_rescue.items():
            if key not in rescue_plan:
                rescue_plan[key] = value

        return jsonify({
            "success": True,
            "model_used": used_model,
            "rescue_plan": rescue_plan
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/history", methods=["GET", "OPTIONS"])
def history():
    db = load_db()

    return jsonify({
        "success": True,
        "history": db.get("plans", [])
    })


@app.route("/", methods=["GET"])
def serve_root():
    index_file = os.path.join(app.static_folder, "index.html")

    if app.static_folder and os.path.exists(index_file):
        return send_from_directory(app.static_folder, "index.html")

    return jsonify({
        "message": "Deadline Guardian AI Backend is running"
    })


@app.route("/<path:path>", methods=["GET"])
def serve_react(path):
    if path.startswith("api/"):
        return jsonify({
            "success": False,
            "error": "API route not found"
        }), 404

    static_file = os.path.join(app.static_folder, path)

    if app.static_folder and os.path.exists(static_file):
        return send_from_directory(app.static_folder, path)

    index_file = os.path.join(app.static_folder, "index.html")

    if app.static_folder and os.path.exists(index_file):
        return send_from_directory(app.static_folder, "index.html")

    return jsonify({
        "message": "Deadline Guardian AI Backend is running"
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)