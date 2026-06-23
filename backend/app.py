from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
import os
import json
import re
import time
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

client = genai.Client(api_key=GEMINI_API_KEY)

DB_FILE = "tasks_db.json"


def load_db():
    if not os.path.exists(DB_FILE):
        return {"plans": []}

    try:
        with open(DB_FILE, "r", encoding="utf-8") as file:
            return json.load(file)
    except Exception:
        return {"plans": []}


def save_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)


def extract_json(text):
    if not text:
        raise ValueError("Empty response from Gemini")

    cleaned = text.strip()
    cleaned = cleaned.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(cleaned)
    except Exception:
        pass

    match = re.search(r"\{[\s\S]*\}", cleaned)

    if not match:
        raise ValueError("No valid JSON found in Gemini response")

    return json.loads(match.group(0))


def build_prompt(user_input):
    now = datetime.now()
    today_full = now.strftime("%A, %d %B %Y, %I:%M %p")
    today_date = now.strftime("%Y-%m-%d")
    today_day = now.strftime("%A")

    return f"""
You are Deadline Guardian AI, an AI-powered productivity companion for students and professionals.

Current date and time:
{today_full}

Today date:
{today_date}

Today day:
{today_day}

User input:
{user_input}

Your job:
Convert the user's messy tasks into a practical productivity plan.

VERY IMPORTANT:
Do not invent extra tasks.
Only use tasks, habits, deadlines, and events that the user actually mentioned.

DATE HANDLING RULES:
1. If the user mentions today, tonight, this morning, this afternoon, or this evening, assign that task to today's date.
2. If the user gives no day/date for a task, assign it to today.
3. If the user says tomorrow, assign that task to the next day after today.
4. If the user says after 2 days, after 3 days, etc., calculate the correct future date.
5. If the user mentions Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, or Sunday, assign that task to the next upcoming occurrence of that day.
6. If the user mentions a specific date, assign the task to that exact date.
7. Do not move future tasks into today_schedule.
8. today_schedule must contain only tasks assigned to today.
9. weekly_plan must contain only future tasks explicitly mentioned by the user.
10. Do not add preparation/revision/checkpoint tasks unless the user clearly mentioned preparation, revision, or checkpoint.
11. If the user says "Gym daily", put it in habits only. Do not repeat it inside weekly_plan for every day.
12. If the user says "Python daily", "reading daily", "gym daily", or any repeated routine, put it in habits.
13. weekly_plan should not include habits unless the user gave a specific day/time for that habit.
14. Keep weekly_plan short and factual. No extra invented schedule.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanation outside JSON.

Use this exact JSON structure:

{{
  "summary": "Short summary of user's situation",
  "tasks": [
    {{
      "title": "Task name",
      "category": "Study/Work/Personal/Bill/Health/Other",
      "priority": "High/Medium/Low",
      "assigned_date": "YYYY-MM-DD",
      "assigned_day": "Monday/Tuesday/etc",
      "deadline": "Detected deadline or estimated deadline",
      "estimated_time": "Estimated time required",
      "reason": "Why this priority was chosen",
      "next_action": "Very small first action user should do"
    }}
  ],
  "today_schedule": [
    {{
      "time": "Time range",
      "activity": "What user should do today",
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
      "action": "What user should do when reminder appears"
    }}
  ],
  "habits": [
    {{
      "name": "Habit name",
      "frequency": "Daily/Weekly/One-time",
      "streak": "Demo streak such as 1 day or New habit",
      "status": "Pending/In Progress/Done",
      "next_action": "Small action to maintain the habit"
    }}
  ],
  "motivational_cards": [
    {{
      "title": "Short motivational title",
      "quote": "Short productivity quote or thought",
      "action": "Tiny action user can take"
    }}
  ],
  "next_best_action": "The one action user should start right now",
  "productivity_tip": "One personalized productivity tip"
}}

OUTPUT RULES:
1. Be practical and realistic.
2. Focus on action, not only reminders.
3. Prioritize urgent deadlines first.
4. Break tasks into small next actions.
5. Do not overcrowd today_schedule.
6. Create 3 to 5 context-aware reminders.
7. Detect habits separately from one-time tasks.
8. Create 2 to 4 motivational_cards.
9. Never create tasks that are not clearly present in the user input.
10. If weekly_plan has no future one-time tasks, return an empty weekly_plan array.
"""
def generate_with_fallback(prompt):
    models = []

    if GEMINI_MODEL:
        models.append(GEMINI_MODEL)

    fallback_models = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
    ]

    for model in fallback_models:
        if model not in models:
            models.append(model)

    for model in models:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt
                )

                if response and response.text:
                    return response.text, model

            except Exception:
                time.sleep(2)

    raise Exception(
        "Gemini is temporarily busy or unavailable. Please try again after a few seconds."
    )


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Deadline Guardian AI Backend is running"
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": GEMINI_MODEL
    })


@app.route("/api/plan", methods=["POST"])
def create_plan():
    try:
        if not GEMINI_API_KEY:
            return jsonify({
                "success": False,
                "error": "Gemini API key is missing. Please add GEMINI_API_KEY in .env file."
            }), 500

        data = request.get_json()
        user_input = data.get("taskText", "").strip()

        if not user_input:
            return jsonify({
                "success": False,
                "error": "Task text is required."
            }), 400

        prompt = build_prompt(user_input)

        ai_text, used_model = generate_with_fallback(prompt)
        plan = extract_json(ai_text)

        default_keys = {
            "tasks": [],
            "today_schedule": [],
            "weekly_plan": [],
            "reminders": [],
            "habits": [],
            "motivational_cards": [],
            "next_best_action": "Start with the most urgent high-priority task.",
            "productivity_tip": "Focus on one task at a time and use short work sessions.",
            "summary": "Your tasks have been organized into a practical plan."
        }

        for key, value in default_keys.items():
            if key not in plan:
                plan[key] = value

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

        return jsonify({
            "success": True,
            "model_used": used_model,
            "plan": plan
        })

    except Exception as e:
        error_message = str(e)

        if (
            "503" in error_message
            or "UNAVAILABLE" in error_message
            or "high demand" in error_message
            or "temporarily busy" in error_message
        ):
            clean_error = "Gemini is temporarily busy. Please try again in a few seconds."
        else:
            clean_error = error_message

        return jsonify({
            "success": False,
            "error": clean_error
        }), 500


@app.route("/api/history", methods=["GET"])
def history():
    db = load_db()
    return jsonify({
        "success": True,
        "history": db.get("plans", [])
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)