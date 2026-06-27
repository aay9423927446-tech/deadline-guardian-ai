import { useEffect, useRef, useState } from "react";
import {
  Brain,
  Mic,
  Send,
  CalendarDays,
  CheckCircle2,
  Clock,
  Zap,
  Loader2,
  Sparkles,
  ArrowDown,
  CircleCheckBig,
  Timer,
  Target,
  PlayCircle,
  History,
  Download,
  BarChart3,
  BellRing,
  Repeat2,
  CalendarPlus,
} from "lucide-react";
import "./App.css";

const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

const API_URL =
  import.meta.env.VITE_API_URL || (isLocalhost ? "http://127.0.0.1:5000" : "");

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const USER_TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

const DEMO_TEXT =
  "In morning need to go to the gym for workout from 6:00 to 8:30, come back home, fresh up and take shower, grab breakfast around 9:30, do Python course for 1 hour, get in meeting with my friend and professor for paperwork, have lunch around 1:00, take a quick nap for 1 hour, read my book, make tea around 5:30 and have family time till 10:00, dinner, complete my paper work, watch YouTube content, sleep around 12:30 at night, and take breaks between tasks.";

const SAMPLE_TASKS = [
  "DBMS assignment tomorrow",
  "Java viva on Friday",
  "Maths test after 2 days",
  "Pay electricity bill today",
  "Gym daily",
];

function AntiGravityParticles() {
  return <CanvasParticles />;
}

function CanvasParticles() {
  const [canvasEl, setCanvasEl] = useState(null);

  useEffect(() => {
    if (!canvasEl) return;

    const canvas = canvasEl;
    const ctx = canvas.getContext("2d");

    let animationFrame;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const googleColors = ["#4285F4", "#DB4437", "#F4B400", "#0F9D58"];

    const mouse = {
      x: width / 2,
      y: height / 2,
      lastX: width / 2,
      lastY: height / 2,
      vx: 0,
      vy: 0,
      active: false,
      lastMoveTime: Date.now(),
    };

    const particles = Array.from({ length: 130 }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      baseX: Math.random() * width,
      baseY: Math.random() * height,
      vx: 0,
      vy: 0,
      radius: Math.random() * 3.2 + 1.4,
      color: googleColors[index % googleColors.length],
      opacity: Math.random() * 0.45 + 0.22,
      floatSpeed: Math.random() * 0.45 + 0.18,
      angle: Math.random() * Math.PI * 2,
      drift: Math.random() * 0.9 + 0.25,
    }));

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(
        window.devicePixelRatio,
        0,
        0,
        window.devicePixelRatio,
        0,
        0
      );
    };

    const handleMouseMove = (event) => {
      mouse.lastX = mouse.x;
      mouse.lastY = mouse.y;

      mouse.x = event.clientX;
      mouse.y = event.clientY;

      mouse.vx = mouse.x - mouse.lastX;
      mouse.vy = mouse.y - mouse.lastY;

      mouse.active = true;
      mouse.lastMoveTime = Date.now();
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.vx = 0;
      mouse.vy = 0;
    };

    const drawParticle = (particle) => {
      ctx.save();

      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawCursorGlow = () => {
      if (!mouse.active) return;

      const gradient = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        210
      );

      gradient.addColorStop(0, "rgba(66, 133, 244, 0.10)");
      gradient.addColorStop(0.35, "rgba(244, 180, 0, 0.07)");
      gradient.addColorStop(0.7, "rgba(15, 157, 88, 0.04)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.save();
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 210, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      if (Date.now() - mouse.lastMoveTime > 1500) {
        mouse.active = false;
      }

      mouse.vx *= 0.88;
      mouse.vy *= 0.88;

      drawCursorGlow();

      particles.forEach((particle) => {
        particle.angle += particle.floatSpeed * 0.01;

        const floatX = Math.cos(particle.angle) * particle.drift * 18;
        const floatY = Math.sin(particle.angle * 1.35) * particle.drift * 22;

        const targetX = particle.baseX + floatX;
        const targetY = particle.baseY + floatY;

        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const attractionRadius = 280;

        if (mouse.active && distance < attractionRadius) {
          const force = Math.pow(1 - distance / attractionRadius, 2);

          particle.vx += dx * 0.0048 * force;
          particle.vy += dy * 0.0048 * force;

          particle.vx += mouse.vx * 0.06 * force;
          particle.vy += mouse.vy * 0.06 * force;
        } else {
          particle.vx += (targetX - particle.x) * 0.002;
          particle.vy += (targetY - particle.y) * 0.002;
        }

        particle.vx *= 0.92;
        particle.vy *= 0.92;

        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.baseY < -80) {
          particle.baseY = height + 80;
          particle.baseX = Math.random() * width;
        } else {
          particle.baseY -= particle.floatSpeed * 0.22;
        }

        if (particle.x < -100) particle.x = width + 100;
        if (particle.x > width + 100) particle.x = -100;
        if (particle.y < -100) particle.y = height + 100;
        if (particle.y > height + 100) particle.y = -100;

        drawParticle(particle);
      });

      animationFrame = requestAnimationFrame(animate);
    };

    resize();
    animate();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [canvasEl]);

  return <canvas ref={setCanvasEl} className="antiGravityCanvas" />;
}

function App() {
  const [taskText, setTaskText] = useState("");
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [modelUsed, setModelUsed] = useState("");
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [googleReady, setGoogleReady] = useState(false);
  const [calendarTokenClient, setCalendarTokenClient] = useState(null);
  const [calendarAccessToken, setCalendarAccessToken] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState("");
  const [calendarError, setCalendarError] = useState("");

  const [rescuePlan, setRescuePlan] = useState(null);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescueLoadingIndex, setRescueLoadingIndex] = useState(null);
  const [rescueError, setRescueError] = useState("");

  const tokenRequestRef = useRef(null);

  const totalTasks = plan?.tasks?.length || 0;
  const completedTasks = taskStatuses.filter((status) => status === "Done").length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  useEffect(() => {
    if (window.google?.accounts?.oauth2) {
      setGoogleReady(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => setGoogleReady(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    script.onerror = () =>
      setCalendarError("Google Calendar login script failed to load.");

    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!googleReady || !window.google?.accounts?.oauth2 || !GOOGLE_CLIENT_ID) {
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error) {
          const message =
            response.error_description ||
            response.error ||
            "Google Calendar authorization failed.";

          setCalendarConnected(false);
          setCalendarAccessToken("");
          setCalendarError(message);

          if (tokenRequestRef.current) {
            tokenRequestRef.current.reject(new Error(message));
            tokenRequestRef.current = null;
          }

          return;
        }

        setCalendarAccessToken(response.access_token);
        setCalendarConnected(true);
        setCalendarError("");
        setCalendarStatus("Google Calendar connected successfully.");

        if (tokenRequestRef.current) {
          tokenRequestRef.current.resolve(response.access_token);
          tokenRequestRef.current = null;
        }
      },
    });

    setCalendarTokenClient(tokenClient);
  }, [googleReady]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const startDemoMode = () => {
    setTaskText(DEMO_TEXT);
    setError("");
    setPlan(null);
    setModelUsed("");
    setTaskStatuses([]);
    setRescuePlan(null);
    setRescueOpen(false);
    setRescueError("");
    setTimeout(() => scrollToSection("planner"), 100);
  };

  const addSampleTask = (sample) => {
    setTaskText((prev) => {
      if (!prev.trim()) return sample;
      return `${prev}, ${sample}`;
    });
  };

  const updateTaskStatus = (index, status) => {
    setTaskStatuses((prev) => {
      const updated = [...prev];
      updated[index] = status;
      return updated;
    });
  };

  const generatePlan = async () => {
    if (!taskText.trim()) {
      setError("Please enter your tasks first.");
      return;
    }

    setLoading(true);
    setError("");
    setPlan(null);
    setModelUsed("");
    setTaskStatuses([]);
    setCalendarStatus("");
    setCalendarError("");
    setRescuePlan(null);
    setRescueOpen(false);
    setRescueError("");
    setRescueLoadingIndex(null);

    try {
      const response = await fetch(`${API_URL}/api/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskText }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Gemini is temporarily busy. Please try again."
        );
      }

      setPlan(data.plan);
      setModelUsed(data.model_used || "Gemini");

      const initialStatuses = data.plan?.tasks?.map(() => "Pending") || [];
      setTaskStatuses(initialStatuses);

      setTimeout(() => scrollToSection("results"), 200);
    } catch (err) {
      const message = err.message || "";

      if (
        message.includes("503") ||
        message.includes("UNAVAILABLE") ||
        message.includes("high demand") ||
        message.includes("temporarily busy")
      ) {
        setError("Gemini is temporarily busy. Please try again in a few seconds.");
      } else if (message.includes("Failed to fetch")) {
        setError(
          `Backend is not reachable at ${
            API_URL || "the deployed server"
          }. Start Flask backend locally or check your Cloud Run deployment.`
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/history`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error("Could not load plan history.");
      }

      const latestHistory = [...(data.history || [])].reverse().slice(0, 5);
      setHistory(latestHistory);
      setHistoryOpen(true);
    } catch (err) {
      setError(err.message || "Could not load plan history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadPlanFromHistory = (record) => {
    setPlan(record.plan);
    setTaskText(record.raw_input || "");
    setModelUsed(record.model_used || "Gemini");
    setTaskStatuses(record.plan?.tasks?.map(() => "Pending") || []);
    setRescuePlan(null);
    setRescueOpen(false);
    setRescueError("");
    setTimeout(() => scrollToSection("results"), 150);
  };

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTaskText((prev) => `${prev} ${transcript}`.trim());
    };

    recognition.onerror = () => {
      setError("Voice input failed. Please try again.");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const resetApp = () => {
    setTaskText("");
    setPlan(null);
    setError("");
    setModelUsed("");
    setTaskStatuses([]);
    setCalendarStatus("");
    setCalendarError("");
    setRescuePlan(null);
    setRescueOpen(false);
    setRescueError("");
    setRescueLoadingIndex(null);
  };

  const generateRescuePlan = async (task, index) => {
    setRescueLoadingIndex(index);
    setRescueError("");
    setCalendarStatus("");
    setCalendarError("");

    try {
      const response = await fetch(`${API_URL}/api/rescue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task,
          plan_summary: plan?.summary || "",
          today_schedule: plan?.today_schedule || [],
          weekly_plan: plan?.weekly_plan || [],
          current_status: taskStatuses[index] || "Pending",
          raw_input: taskText,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not generate rescue plan.");
      }

      setRescuePlan(data.rescue_plan);
      setRescueOpen(true);

      setTimeout(() => {
        document.getElementById("rescue-panel")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    } catch (err) {
      setRescueError(err.message || "Could not generate rescue plan.");
    } finally {
      setRescueLoadingIndex(null);
    }
  };

  const escapeICS = (text = "") => {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;")
      .replace(/\n/g, "\\n");
  };

  const pad = (num) => String(num).padStart(2, "0");

  const getTodayDateValue = () => {
    const date = new Date();
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}`;
  };

  const formatDateForICS = (date) => {
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return `${year}${month}${day}`;
  };

  const formatDateTimeForICS = (date) => {
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    const seconds = pad(date.getUTCSeconds());
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  const cleanDateValue = (value) => {
    const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : getTodayDateValue();
  };

  const addDaysToDateValue = (dateValue, days) => {
    const date = new Date(`${dateValue}T00:00:00`);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}`;
  };

  const parseClockToMinutes = (hourRaw, minuteRaw, periodRaw) => {
    let hour = Number(hourRaw);
    const minute = Number(minuteRaw || 0);
    const period = String(periodRaw || "").toUpperCase();

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    return hour * 60 + minute;
  };

  const getDefaultTimeRange = (text = "") => {
    const lower = String(text).toLowerCase();

    if (lower.includes("morning")) return { start: 9 * 60, end: 10 * 60 };
    if (lower.includes("afternoon")) return { start: 14 * 60, end: 15 * 60 };
    if (lower.includes("evening")) return { start: 19 * 60, end: 20 * 60 };
    if (lower.includes("night")) return { start: 21 * 60, end: 22 * 60 };
    if (lower.includes("lunch")) return { start: 13 * 60, end: 14 * 60 };
    if (lower.includes("breakfast")) return { start: 9 * 60, end: 9 * 60 + 30 };
    if (lower.includes("flexible")) return { start: 10 * 60, end: 11 * 60 };

    return { start: 10 * 60, end: 11 * 60 };
  };

  const parseTimeRange = (timeText = "") => {
    const text = String(timeText || "");
    const matches = [
      ...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi),
    ];

    if (matches.length >= 2) {
      const firstPeriod = matches[0][3] || matches[1][3] || "";
      const secondPeriod = matches[1][3] || firstPeriod;

      let start = parseClockToMinutes(matches[0][1], matches[0][2], firstPeriod);
      let end = parseClockToMinutes(matches[1][1], matches[1][2], secondPeriod);

      if (end <= start) end += 24 * 60;

      return { start, end };
    }

    if (matches.length === 1) {
      const time = parseClockToMinutes(matches[0][1], matches[0][2], matches[0][3]);
      const lower = text.toLowerCase();

      if (lower.includes("before")) {
        return { start: Math.max(time - 60, 0), end: time };
      }

      return { start: time, end: time + 60 };
    }

    return getDefaultTimeRange(text);
  };

  const localDateTimeString = (baseDateValue, minutesFromStart) => {
    const offsetDays = Math.floor(minutesFromStart / (24 * 60));
    const minutes = ((minutesFromStart % (24 * 60)) + 24 * 60) % (24 * 60);
    const dateValue = addDaysToDateValue(baseDateValue, offsetDays);

    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;

    return `${dateValue}T${pad(hour)}:${pad(minute)}:00`;
  };

  const buildGoogleCalendarEvent = ({
    title,
    description,
    dateValue,
    timeText,
    source,
  }) => {
    const cleanDate = cleanDateValue(dateValue);
    const range = parseTimeRange(timeText);

    return {
      summary: `Deadline Guardian AI: ${title}`,
      description: `${description || "Generated by Deadline Guardian AI"}\n\nSource: ${source}`,
      start: {
        dateTime: localDateTimeString(cleanDate, range.start),
        timeZone: USER_TIMEZONE,
      },
      end: {
        dateTime: localDateTimeString(cleanDate, range.end),
        timeZone: USER_TIMEZONE,
      },
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: "popup",
            minutes: 10,
          },
        ],
      },
    };
  };

  const buildGoogleCalendarEvents = () => {
    if (!plan) return [];

    const todayDate = getTodayDateValue();

    const todayEvents =
      plan.today_schedule?.map((item) =>
        buildGoogleCalendarEvent({
          title: item.activity || "AI scheduled task",
          description: item.reason || "Today’s AI schedule item.",
          dateValue: todayDate,
          timeText: item.time || "Flexible",
          source: "Today’s Schedule",
        })
      ) || [];

    const weeklyEvents =
      plan.weekly_plan?.flatMap((dayBlock) => {
        const dateValue = cleanDateValue(dayBlock.date);

        if (dateValue === todayDate) {
          return [];
        }

        return (
          dayBlock.items?.map((item) =>
            buildGoogleCalendarEvent({
              title: item.title || "Weekly plan task",
              description: item.reason || "Weekly AI plan item.",
              dateValue,
              timeText: item.time || "Flexible",
              source: `Weekly Plan - ${dayBlock.day || dateValue}`,
            })
          ) || []
        );
      }) || [];

    return [...todayEvents, ...weeklyEvents];
  };

  const connectGoogleCalendar = () => {
    setCalendarError("");
    setCalendarStatus("");

    if (!GOOGLE_CLIENT_ID) {
      const message =
        "Missing VITE_GOOGLE_CLIENT_ID. Add it in frontend/.env and restart npm run dev.";
      setCalendarError(message);
      return Promise.reject(new Error(message));
    }

    if (!googleReady || !calendarTokenClient) {
      const message = "Google Calendar login is still loading. Try again in a few seconds.";
      setCalendarError(message);
      return Promise.reject(new Error(message));
    }

    if (calendarAccessToken) {
      setCalendarConnected(true);
      setCalendarStatus("Google Calendar is already connected.");
      return Promise.resolve(calendarAccessToken);
    }

    return new Promise((resolve, reject) => {
      tokenRequestRef.current = { resolve, reject };
      calendarTokenClient.requestAccessToken({ prompt: "consent" });
    });
  };

  const handleConnectCalendar = async () => {
    try {
      await connectGoogleCalendar();
    } catch (err) {
      setCalendarError(err.message || "Could not connect Google Calendar.");
    }
  };

  const createGoogleCalendarEvent = async (accessToken, eventPayload) => {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to create Google Calendar event.");
    }

    return data;
  };

  const addPlanToGoogleCalendar = async () => {
    if (!plan) {
      setCalendarError("Generate a plan first before adding it to Google Calendar.");
      return;
    }

    const events = buildGoogleCalendarEvents();

    if (events.length === 0) {
      setCalendarError("No schedule or weekly plan items available to add.");
      return;
    }

    setCalendarSyncing(true);
    setCalendarError("");
    setCalendarStatus("Connecting to Google Calendar...");

    try {
      const accessToken = await connectGoogleCalendar();

      setCalendarStatus(`Creating ${events.length} calendar events...`);

      let createdCount = 0;

      for (const eventPayload of events) {
        await createGoogleCalendarEvent(accessToken, eventPayload);
        createdCount += 1;
      }

      setCalendarStatus(
        `Done. ${createdCount} event${createdCount === 1 ? "" : "s"} added to Google Calendar.`
      );
      setCalendarConnected(true);
    } catch (err) {
      setCalendarError(err.message || "Could not add events to Google Calendar.");

      if (String(err.message || "").includes("401")) {
        setCalendarAccessToken("");
        setCalendarConnected(false);
      }
    } finally {
      setCalendarSyncing(false);
    }
  };

  const exportScheduleICS = () => {
    if (!plan?.today_schedule?.length) {
      setError("No schedule available to export.");
      return;
    }

    const today = new Date();
    const dateValue = formatDateForICS(today);
    const stamp = formatDateTimeForICS(new Date());

    const events = plan.today_schedule
      .map((item, index) => {
        return [
          "BEGIN:VEVENT",
          `UID:deadline-guardian-${Date.now()}-${index}@deadlineguardian.ai`,
          `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${dateValue}`,
          `SUMMARY:${escapeICS(`${item.time} - ${item.activity}`)}`,
          `DESCRIPTION:${escapeICS(
            item.reason || "Generated by Deadline Guardian AI"
          )}`,
          "END:VEVENT",
        ].join("\n");
      })
      .join("\n");

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Deadline Guardian AI//AI Schedule//EN",
      "CALSCALE:GREGORIAN",
      events,
      "END:VCALENDAR",
    ].join("\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "deadline-guardian-schedule.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusClass = (status) => {
    return String(status || "Pending")
      .toLowerCase()
      .replace(/\s+/g, "-");
  };

  const cleanUiText = (value = "", maxLength = 120) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength).trim()}...`;
  };

  const cleanTitle = (value = "Task") => {
    return cleanUiText(value, 70);
  };

  return (
    <div className="app">
      <AntiGravityParticles />
      <div className="heroGlow heroGlowBlue"></div>
      <div className="heroGlow heroGlowYellow"></div>
      <div className="heroGlow heroGlowGreen"></div>

      <header className="navbar">
        <div className="brand">
          <div className="brandIcon">
            <span></span>
          </div>
          <strong>Deadline Guardian AI</strong>
        </div>

        <nav className="navLinks">
          <button onClick={() => scrollToSection("product")} type="button">
            Product
          </button>
          <button onClick={() => scrollToSection("features")} type="button">
            Use Cases
          </button>
          <button onClick={() => scrollToSection("planner")} type="button">
            AI Agent
          </button>
          <button onClick={startDemoMode} type="button">
            Demo
          </button>
        </nav>

        <button
          className="downloadBtn"
          onClick={() => scrollToSection("planner")}
          type="button"
        >
          Try planner
          <ArrowDown size={17} />
        </button>
      </header>

      <main>
        <section className="hero" id="product">
          <div className="miniBrand">
            <div className="miniLogo">
              <span></span>
            </div>
            <span>Google AI Studio powered</span>
          </div>

          <h1>Experience liftoff from last-minute panic to planned action.</h1>

          <p>
            Deadline Guardian AI turns messy tasks, exams, bills, meetings, and
            habits into prioritized actions using Gemini.
          </p>

          <div className="heroActions">
            <button
              className="primaryHeroBtn"
              onClick={() => scrollToSection("planner")}
              type="button"
            >
              <Sparkles size={19} />
              Create AI plan
            </button>

            <button className="secondaryHeroBtn" onClick={startDemoMode} type="button">
              <PlayCircle size={19} />
              Demo Mode
            </button>
          </div>
        </section>

        <section className="featureStrip" id="features">
          <div className="featurePill">
            <Target size={20} />
            Priority detection
          </div>

          <div className="featurePill">
            <CalendarDays size={20} />
            AI scheduling
          </div>

          <div className="featurePill">
            <Timer size={20} />
            Next action mode
          </div>

          <div className="featurePill">
            <Brain size={20} />
            Agentic planning
          </div>
        </section>

        <section className="productFrame" id="planner">
          <div className="frameHeader">
            <div>
              <p className="sectionLabel">AI Command Center</p>
              <h2>Create your deadline plan</h2>
            </div>

            <div className="frameActions">
              <button className="historyBtn" onClick={loadHistory} type="button">
                <History size={17} />
                {historyLoading ? "Loading..." : "History"}
              </button>

              <button className="resetBtn" onClick={resetApp} type="button">
                Reset
              </button>
            </div>
          </div>

          <div className="plannerGrid">
            <div className="inputConsole">
              <div className="consoleTop">
                <div className="windowDots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <div className="agentStatus">
                  <span></span>
                  Agent ready
                </div>
              </div>

              <textarea
                value={taskText}
                onChange={(event) => setTaskText(event.target.value)}
                placeholder="Example: I have DBMS assignment tomorrow, Java viva on Friday, maths test after 2 days, gym daily, and electricity bill payment today..."
              />

              <div className="sampleChips">
                {SAMPLE_TASKS.map((sample) => (
                  <button
                    key={sample}
                    onClick={() => addSampleTask(sample)}
                    type="button"
                  >
                    + {sample}
                  </button>
                ))}
              </div>

              {error && <div className="error">{error}</div>}

              <div className="buttons">
                <button className="voiceBtn" onClick={startVoiceInput} type="button">
                  <Mic size={18} />
                  {listening ? "Listening..." : "Voice Input"}
                </button>

                <button className="demoBtn" onClick={startDemoMode} type="button">
                  <PlayCircle size={18} />
                  Demo Mode
                </button>

                <button
                  className="mainBtn"
                  onClick={generatePlan}
                  disabled={loading}
                  type="button"
                >
                  {loading ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                  {loading ? "Gemini is planning..." : "Generate Plan"}
                </button>
              </div>
            </div>

            <div className="sidePreview">
              <p className="sectionLabel">What the agent does</p>

              <div className="previewItem">
                <CircleCheckBig size={20} />
                <div>
                  <strong>Reads messy input</strong>
                  <span>Understands deadlines, tasks, and urgency.</span>
                </div>
              </div>

              <div className="previewItem">
                <Zap size={20} />
                <div>
                  <strong>Chooses next action</strong>
                  <span>Moves beyond passive reminders.</span>
                </div>
              </div>

              <div className="previewItem">
                <CalendarDays size={20} />
                <div>
                  <strong>Builds schedule</strong>
                  <span>Creates a practical day plan.</span>
                </div>
              </div>

              <div className="previewNote">
                Core AI layer: <strong>Gemini API via Google AI Studio</strong>
              </div>
            </div>
          </div>

          {historyOpen && (
            <div className="historyPanel">
              <div className="historyHeader">
                <h3>Recent AI Plans</h3>
                <button onClick={() => setHistoryOpen(false)} type="button">
                  Close
                </button>
              </div>

              {history.length === 0 ? (
                <p className="emptyHistory">No plans generated yet.</p>
              ) : (
                <div className="historyList">
                  {history.map((record) => (
                    <button
                      className="historyItem"
                      key={record.id}
                      onClick={() => loadPlanFromHistory(record)}
                      type="button"
                    >
                      <strong>{record.plan?.summary || "Untitled plan"}</strong>
                      <span>
                        {record.created_at
                          ? new Date(record.created_at).toLocaleString()
                          : "Recent plan"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {plan && (
          <section className="results" id="results">
            <div className="dashboardHeader">
              <div>
                <p className="sectionLabelLight">Execution Dashboard</p>
                <h2>Your AI productivity command center</h2>
              </div>

              <div className="resultActions">
                <div className="modelBadge">
                  <Sparkles size={16} />
                  {modelUsed || "Gemini"}
                </div>

                <button className="exportBtn" onClick={exportScheduleICS} type="button">
                  <Download size={17} />
                  Export .ics
                </button>

                <button
                  className={`calendarConnectBtn ${
                    calendarConnected ? "calendarConnected" : ""
                  }`}
                  onClick={handleConnectCalendar}
                  type="button"
                >
                  <CalendarPlus size={17} />
                  {calendarConnected ? "Calendar Connected" : "Connect Calendar"}
                </button>

                <button
                  className="calendarAddBtn"
                  onClick={addPlanToGoogleCalendar}
                  disabled={calendarSyncing}
                  type="button"
                >
                  {calendarSyncing ? (
                    <Loader2 className="spin" size={17} />
                  ) : (
                    <CalendarPlus size={17} />
                  )}
                  {calendarSyncing ? "Adding..." : "Add to Google Calendar"}
                </button>
              </div>
            </div>

            {(calendarStatus || calendarError) && (
              <div
                className={`calendarMessage ${
                  calendarError ? "calendarMessageError" : "calendarMessageSuccess"
                }`}
              >
                {calendarError || calendarStatus}
              </div>
            )}

            <div className="overviewGrid">
              <div className="overviewCard">
                <p>AI Summary</p>
                <h3>{cleanUiText(plan.summary, 180)}</h3>
              </div>

              <div className="overviewCard focusOverview">
                <p>Next Best Action</p>
                <h3>{cleanUiText(plan.next_best_action, 180)}</h3>
              </div>

              <div className="overviewCard progressOverview">
                <p>Completion Progress</p>
                <div className="progressMain">
                  <strong>{progressPercent}%</strong>
                  <span>
                    {completedTasks} / {totalTasks} done
                  </span>
                </div>

                <div className="progressBar">
                  <span style={{ width: `${progressPercent}%` }}></span>
                </div>
              </div>
            </div>

            {rescueError && (
              <div className="calendarMessage calendarMessageError">
                {rescueError}
              </div>
            )}

            {rescueOpen && rescuePlan && (
              <section className="rescuePanel" id="rescue-panel">
                <div className="rescueHeader">
                  <div>
                    <p className="cardLabel">AI Rescue Trigger</p>
                    <h2>
                      <Zap size={24} />
                      Recovery plan activated
                    </h2>
                  </div>

                  <button onClick={() => setRescueOpen(false)} type="button">
                    Close
                  </button>
                </div>

                <div className="rescueGrid">
                  <div className="rescueMainCard">
                    <span className="riskBadge">
                      {rescuePlan.risk_level || "Medium"} Risk
                    </span>

                    <h3>{cleanTitle(rescuePlan.missed_task)}</h3>
                    <p>{cleanUiText(rescuePlan.rescue_summary, 220)}</p>
                  </div>

                  <div className="rescueSprintCard">
                    <p className="cardLabel">Emergency Sprint</p>
                    <h3>{rescuePlan.emergency_sprint?.duration}</h3>
                    <p>{cleanUiText(rescuePlan.emergency_sprint?.goal, 160)}</p>

                    <div className="sprintSteps">
                      {rescuePlan.emergency_sprint?.steps?.map((step, stepIndex) => (
                        <div className="sprintStep" key={stepIndex}>
                          <span>{stepIndex + 1}</span>
                          <p>{cleanUiText(step, 140)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rescueAdjustCard">
                    <p className="cardLabel">Schedule Adjustments</p>

                    <div className="adjustList">
                      {rescuePlan.schedule_adjustments?.map((item, itemIndex) => (
                        <div className="adjustItem" key={itemIndex}>
                          <strong>{cleanUiText(item.change, 100)}</strong>
                          <p>{cleanUiText(item.reason, 150)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rescueMessageCard">
                    <p className="cardLabel">Recovery Message</p>
                    <h3>{cleanUiText(rescuePlan.recovery_message, 180)}</h3>

                    <div className="calendarSuggestion">
                      <CalendarPlus size={18} />
                      {cleanUiText(rescuePlan.calendar_suggestion, 160)}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="executionLayout">
              <section className="taskQueue">
                <div className="queueHeader">
                  <div>
                    <p className="cardLabel">Priority Queue</p>
                    <h2>
                      <CheckCircle2 size={22} />
                      Tasks to execute
                    </h2>
                  </div>

                  <div className="queueStats">
                    <BarChart3 size={18} />
                    {totalTasks} tasks
                  </div>
                </div>

                <div className="taskList">
                  {plan.tasks?.map((task, index) => (
                    <div
                      className={`taskCard status-${getStatusClass(
                        taskStatuses[index]
                      )}`}
                      key={index}
                    >
                      <div className="taskTop">
                        <div>
                          <h3 title={task.title}>{cleanTitle(task.title)}</h3>

                          <div className="taskMeta">
                            <span>{task.category}</span>
                            <span>{cleanUiText(task.deadline, 40)}</span>
                            <span>{task.estimated_time}</span>
                          </div>
                        </div>

                        <span className={`priority ${task.priority?.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </div>

                      <p>{cleanUiText(task.reason, 170)}</p>

                      <div className="smallAction">
                        <strong>First Action:</strong>{" "}
                        {cleanUiText(task.next_action, 130)}
                      </div>

                      <div className="statusControls">
                        {["Pending", "In Progress", "Done"].map((status) => (
                          <button
                            key={status}
                            className={
                              taskStatuses[index] === status ? "activeStatus" : ""
                            }
                            onClick={() => updateTaskStatus(index, status)}
                            type="button"
                          >
                            {status}
                          </button>
                        ))}

                        <button
                          className="rescueBtn"
                          onClick={() => generateRescuePlan(task, index)}
                          disabled={
                            rescueLoadingIndex === index ||
                            taskStatuses[index] === "Done"
                          }
                          type="button"
                        >
                          {rescueLoadingIndex === index ? (
                            <Loader2 className="spin" size={14} />
                          ) : (
                            <Zap size={14} />
                          )}
                          Rescue
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="intelligenceRail">
                <section className="railPanel schedulePanel">
                  <h2>
                    <CalendarDays size={21} />
                    Today’s Schedule
                  </h2>

                  <div className="timelineList">
                    {plan.today_schedule?.map((item, index) => (
                      <div className="timelineItem" key={index}>
                        <div className="timelineDot"></div>

                        <div className="timelineCard">
                          <div className="time">
                            <Clock size={15} />
                            {item.time}
                          </div>

                          <h3 title={item.activity}>
                            {cleanTitle(item.activity)}
                          </h3>
                          <p>{cleanUiText(item.reason, 150)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="railPanel remindersPanel">
                  <h2>
                    <BellRing size={21} />
                    Smart Reminders
                  </h2>

                  {plan.reminders?.length > 0 ? (
                    <div className="compactList">
                      {plan.reminders.map((reminder, index) => (
                        <div className="compactCard reminderCard" key={index}>
                          <span className="reminderTime">{reminder.time}</span>
                          <h3>{cleanUiText(reminder.message, 100)}</h3>
                          <p>{cleanUiText(reminder.context, 150)}</p>
                          <div className="reminderAction">
                            <strong>Action:</strong>{" "}
                            {cleanUiText(reminder.action, 120)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="emptyText">No reminders generated.</p>
                  )}
                </section>

                <section className="railPanel weekPanel widePanel">
                  <h2>
                    <CalendarDays size={21} />
                    Weekly Plan
                  </h2>

                  {plan.weekly_plan?.length > 0 ? (
                    <div className="weekList">
                      {plan.weekly_plan.map((dayBlock, index) => (
                        <div className="weekCard" key={index}>
                          <div className="weekHeader">
                            <strong>{dayBlock.day}</strong>
                            <span>{dayBlock.date}</span>
                          </div>

                          <div className="weekItems">
                            {dayBlock.items?.map((item, itemIndex) => (
                              <div className="weekItem" key={itemIndex}>
                                <span>{item.time}</span>
                                <div>
                                  <strong title={item.title}>
                                    {cleanTitle(item.title)}
                                  </strong>
                                  <p>{cleanUiText(item.reason, 140)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="emptyText">No future tasks detected.</p>
                  )}
                </section>

                <section className="railPanel habitsPanel widePanel">
                  <h2>
                    <Repeat2 size={21} />
                    Habits & Goals
                  </h2>

                  {plan.habits?.length > 0 ? (
                    <div className="habitLandscapeList">
                      {plan.habits.map((habit, index) => (
                        <div className="compactCard habitCard" key={index}>
                          <div className="habitTop">
                            <h3>{cleanTitle(habit.name)}</h3>
                            <span>{habit.status}</span>
                          </div>

                          <div className="habitMeta">
                            <span>{habit.frequency}</span>
                            <span>{habit.streak}</span>
                          </div>

                          <p>{cleanUiText(habit.next_action, 130)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="emptyText">No recurring habits detected.</p>
                  )}
                </section>

                <section className="railPanel tipPanel">
                  <p className="cardLabel">Personalized Tip</p>
                  <h3>{cleanUiText(plan.productivity_tip, 170)}</h3>
                </section>

                <section className="railPanel motivationPanel">
                  <p className="cardLabel">Focus Fuel</p>

                  <div className="motivationList">
                    {plan.motivational_cards?.length > 0 ? (
                      plan.motivational_cards.map((card, index) => (
                        <div className="motivationCard" key={index}>
                          <h3>{cleanTitle(card.title)}</h3>
                          <p>{cleanUiText(card.quote, 140)}</p>
                          <span>{cleanUiText(card.action, 90)}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="motivationCard">
                          <h3>One block at a time</h3>
                          <p>
                            Big days become manageable when you focus on the next small
                            action.
                          </p>
                          <span>Start with the first 15 minutes.</span>
                        </div>

                        <div className="motivationCard">
                          <h3>Protect your energy</h3>
                          <p>A good plan includes breaks, not just work.</p>
                          <span>Take short pauses between deep work.</span>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;