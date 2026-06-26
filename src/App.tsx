import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import AddTaskBar from "./components/AddTaskBar";
import TaskList from "./components/TaskList";
import AgentActivityPanel from "./components/AgentActivityPanel";
import ArtifactViewerModal from "./components/ArtifactViewerModal";
import AuthModal from "./components/AuthModal";
import { runRescue } from "./agent/agentLoop";
import { Task, ActionLogEntry, Artifact } from "./lib/types";
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Activity, Calendar, CheckCircle2, AlertTriangle, RefreshCw, Unlink, UserCheck, CalendarOff } from "lucide-react";
import { getCalendarToken } from "./lib/google/auth";
import { rankByRisk } from "./lib/riskScore";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  auth, 
  getUserTasks, 
  getUserActionLogs, 
  saveUserTask, 
  deleteUserTask, 
  clearAllUserTasks, 
  saveUserActionLog, 
  clearAllUserActionLogs,
  logoutUser
} from "./lib/firebase";

// Google API Client ID from environment variables, fallback to a mock one for presentation
const CLIENT_ID = (import.meta as any).env?.VITE_OAUTH_CLIENT_ID || "your-google-oauth-client-id.apps.googleusercontent.com";

// Preloaded starter tasks for instant high-fidelity interaction matching the new types
const INITIAL_TASKS: Task[] = [
  {
    id: "task_starter_1",
    title: "Settle Landlord Rent & Water Utility Bill",
    deadlineISO: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Tomorrow
    importance: 5,
    percentDone: 0,
    type: "bill",
    blocks: [
      {
        id: "block_b1",
        taskId: "task_starter_1",
        startISO: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        endISO: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        title: "Verify rent ledger & water invoice share"
      }
    ],
    subSteps: [
      { id: "step_s1", title: "Calculate exact pro-rated utility share", effortMin: 15, done: false },
      { id: "step_s2", title: "Compose formal rent transfer message", effortMin: 10, done: false },
      { id: "step_s3", title: "Draft electronic funds authorization template", effortMin: 15, done: false }
    ],
    artifacts: [
      {
        id: "art_a1",
        taskId: "task_starter_1",
        kind: "draft",
        content: `# Rent & Utility Payment Protocol

Dear Landlord,

I have authorized the transfer of the rent and pro-rated water utility share for this billing period. 

## Share Summary
- **Base Rent:** $1,850.00
- **Water Bill Share:** $42.50
- **Total Authorized:** $1,892.50

The transaction is scheduled for processing. Please confirm receipt upon arrival.

*Generated automatically via Clutch Life Saver Agent.*`
      }
    ]
  },
  {
    id: "task_starter_2",
    title: "Draft Outline for PM Interview Case Study",
    deadlineISO: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 3 days
    importance: 4,
    percentDone: 0,
    type: "interview",
    blocks: [],
    subSteps: [
      { id: "step_s4", title: "Deconstruct interview case rubric & scoring", effortMin: 30, done: false },
      { id: "step_s5", title: "Formulate product metrics framework (AARRR)", effortMin: 45, done: false },
      { id: "step_s6", title: "Draft comprehensive 1-page cheatsheet outline", effortMin: 60, done: false }
    ],
    artifacts: [
      {
        id: "art_a2",
        taskId: "task_starter_2",
        kind: "outline",
        content: `# Product Manager Case Study Cheat Sheet
*Frameworks & Metrics cheat sheet for autonomous case study preparation.*

## 1. Metric Deconstruction Framework (AARRR / Pirate Metrics)
- **Acquisition:** How do users find us? (CTR, CAC, Signup Conversion)
- **Activation:** Do users have a great first experience? (Time-to-Value, Activation Rate)
- **Retention:** Do users return? (Cohort Analysis, DAU/MAU Ratio, Churn Rate)
- **Referral:** Do users tell others? (Net Promoter Score (NPS), Viral Coefficient)
- **Revenue:** How do we monetize? (LTV, ARPU, MRR)

## 2. Structural Pitch Outline
1. **The Problem:** Clearly state user pain points (backed by hypothetical behavioral telemetry).
2. **The Solution:** Outline a high-impact, low-complexity MVP.
3. **Execution & Metrics:** Identify the north-star metric and trade-offs.

*Delivered securely by Clutch Agent.*`
      }
    ]
  }
];

// Lazy client-side initialization of GoogleGenAI SDK to avoid module-load crashes
let aiInstance: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = (typeof process !== "undefined" ? process.env?.API_KEY : null) || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined in user secrets or environment.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-clutch-client"
        }
      }
    });
  }
  return aiInstance;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activities, setActivities] = useState<ActionLogEntry[]>([]);
  const [isRescuing, setIsRescuing] = useState(false);

  // Auth & Sync States
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Load user data upon authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        setIsFirebaseLoading(true);
        try {
          const dbTasks = await getUserTasks(currentUser.uid);
          const dbLogs = await getUserActionLogs(currentUser.uid);
          
          if (dbTasks.length > 0) {
            setTasks(dbTasks);
          } else {
            // New user or empty DB, seed from INITIAL_TASKS
            for (const t of INITIAL_TASKS) {
              await saveUserTask(currentUser.uid, t);
            }
            setTasks(INITIAL_TASKS);
          }
          
          if (dbLogs.length > 0) {
            setActivities(dbLogs);
          } else {
            setActivities([]);
          }
        } catch (error) {
          console.error("Error reading from Firestore:", error);
        } finally {
          setIsFirebaseLoading(false);
        }
      } else {
        // Logged out
        setTasks(INITIAL_TASKS);
        setActivities([]);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Debounced Sync Tasks to Firestore
  useEffect(() => {
    if (authLoading || isFirebaseLoading || !user) return;
    
    const handler = setTimeout(async () => {
      try {
        // Save current local tasks
        for (const t of tasks) {
          await saveUserTask(user.uid, t);
        }
        // Delete tasks in DB that are not in the current list
        const dbTasks = await getUserTasks(user.uid);
        const localIds = new Set(tasks.map(t => t.id));
        for (const dbt of dbTasks) {
          if (!localIds.has(dbt.id)) {
            await deleteUserTask(dbt.id);
          }
        }
      } catch (err) {
        console.error("Error syncing tasks to Firestore:", err);
      }
    }, 1000);
    
    return () => clearTimeout(handler);
  }, [tasks, user, authLoading, isFirebaseLoading]);

  // Debounced Sync Activities to Firestore
  useEffect(() => {
    if (authLoading || isFirebaseLoading || !user) return;
    
    const handler = setTimeout(async () => {
      try {
        const dbLogs = await getUserActionLogs(user.uid);
        const dbLogIds = new Set(dbLogs.map(l => l.id));
        for (const act of activities) {
          if (!dbLogIds.has(act.id)) {
            await saveUserActionLog(user.uid, act);
          }
        }
      } catch (err) {
        console.error("Error syncing activities to Firestore:", err);
      }
    }, 1500);
    
    return () => clearTimeout(handler);
  }, [activities, user, authLoading, isFirebaseLoading]);
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [summary, setSummary] = useState<string>("");

  // Proactive Risk Scan States
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    atRiskCount: number;
    proposals: { taskId: string; taskTitle: string; proposedAction: string }[];
  } | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  // Google Calendar Connection States
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [rescueErrorAlert, setRescueErrorAlert] = useState<{
    type: "no_slots" | "permission_denied" | "not_connected" | "other";
    message: string;
  } | null>(null);

  const handleConnectCalendar = async () => {
    setConnectionStatus("connecting");
    setCalendarError(null);
    try {
      const token = await getCalendarToken(CLIENT_ID);
      setCalendarToken(token);
      setConnectionStatus("connected");
      
      const entry: ActionLogEntry = {
        id: `calendar_connect_${Date.now()}`,
        tool: "calendar",
        summary: "Successfully authenticated with Google Calendar API. Real-time scheduling active.",
        at: new Date().toISOString(),
        ok: true
      };
      setActivities((prev) => [...prev, entry]);
    } catch (err: any) {
      console.error("Calendar connection failed:", err);
      setConnectionStatus("error");
      const friendlyError = err?.message === "no token" || err?.message?.includes("popup")
        ? "Authentication canceled or blocked. Please try again."
        : err?.message || "Permission denied or failed to authenticate with Google Identity Services.";
      setCalendarError(friendlyError);

      const entry: ActionLogEntry = {
        id: `calendar_err_${Date.now()}`,
        tool: "calendar",
        summary: `Google Calendar Connection Failed: ${friendlyError}`,
        at: new Date().toISOString(),
        ok: false
      };
      setActivities((prev) => [...prev, entry]);
    }
  };

  const handleDisconnectCalendar = () => {
    setCalendarToken(null);
    setConnectionStatus("disconnected");
    setCalendarError(null);
    
    const entry: ActionLogEntry = {
      id: `calendar_disconnect_${Date.now()}`,
      tool: "calendar",
      summary: "Disconnected from Google Calendar.",
      at: new Date().toISOString(),
      ok: true
    };
    setActivities((prev) => [...prev, entry]);
  };

  // Appends parsed tasks from Gemini to state
  const handleTasksParsed = (newTasks: Task[]) => {
    // Make sure we conform exactly to Task types on parsing
    const mapped: Task[] = newTasks.map(t => ({
      ...t,
      subSteps: (t.subSteps || []).map((s: any) => ({
        id: s.id || Math.random().toString(36).slice(2, 9),
        title: s.title || s.text || "Substep",
        effortMin: s.effortMin || 30,
        done: !!s.done
      })),
      blocks: (t.blocks || []).map((b: any) => ({
        id: b.id || Math.random().toString(36).slice(2, 9),
        taskId: t.id,
        startISO: b.startISO || new Date().toISOString(),
        endISO: b.endISO || new Date(Date.now() + 3600 * 1000).toISOString(),
        title: b.title || b.text || "Scheduled Work-Block",
        calendarEventId: b.calendarEventId
      })),
      artifacts: (t.artifacts || []).map((art: any) => ({
        id: art.id || Math.random().toString(36).slice(2, 9),
        taskId: t.id,
        kind: art.kind || "note",
        content: art.content || ""
      }))
    }));

    setTasks((prev) => [...prev, ...mapped]);
    
    // Log success activity using ActionLogEntry structure
    const entry: ActionLogEntry = {
      id: `act_parse_${Date.now()}`,
      tool: "parser",
      summary: `Successfully parsed and initialized ${newTasks.length} dynamic structured task cards.`,
      at: new Date().toISOString(),
      ok: true
    };
    setActivities((prev) => [...prev, entry]);
  };

  // Triggers rescue protocol for a single task using the autonomous agentLoop
  const handleRescueTask = async (task: Task) => {
    if (isRescuing) return;
    setIsRescuing(true);
    setSummary("");
    setRescueErrorAlert(null);

    // Prompt user early if they attempt a task rescue requiring schedule without calendar connection
    if (!calendarToken) {
      const warningEntry: ActionLogEntry = {
        id: `cal_warning_${Date.now()}`,
        tool: "clutch-sys",
        summary: "Advisory: Calendar scheduling skipped because Google Calendar is not linked.",
        at: new Date().toISOString(),
        ok: true
      };
      setActivities((prev) => [...prev, warningEntry]);
    }

    try {
      const client = getAiClient();
      const goal = `Decompose, find calendar slots, schedule workblocks, and generate deliverables for "${task.title}".`;
      
      const { finalText, tasks: updated, actionLog } = await runRescue({
        ai: client,
        tasks,
        goal,
        getAccessToken: () => calendarToken,
        onLog: (entry) => {
          setActivities((prev) => [...prev, entry]);
        }
      });

      setTasks([...updated]);
      setSummary(finalText);

      // Check for specific warnings or failures in action log
      const failedEntry = actionLog.find(entry => !entry.ok);
      if (failedEntry) {
        const sum = failedEntry.summary.toLowerCase();
        if (sum.includes("calendar not connected") || sum.includes("no token")) {
          setRescueErrorAlert({
            type: "not_connected",
            message: "Clutch tried to schedule work blocks on your calendar, but Google Calendar is not connected. Connect your calendar to allow automatic slot allocation."
          });
        } else if (sum.includes("401") || sum.includes("403") || sum.includes("unauthorized") || sum.includes("permission")) {
          setRescueErrorAlert({
            type: "permission_denied",
            message: "Google Calendar authorization has expired or was denied. Please disconnect and reconnect your Google Calendar to refresh access."
          });
        }
      } else {
        const findSlotsLog = actionLog.find(entry => entry.tool === "find_free_slots" && entry.ok);
        if (findSlotsLog && findSlotsLog.summary.includes("Found 0 free")) {
          setRescueErrorAlert({
            type: "no_slots",
            message: `No free calendar blocks of the requested duration were found prior to the deadline. Please extend the deadline for "${task.title}" or free up slots on your calendar.`
          });
        }
      }
    } catch (err: any) {
      console.error("Rescue failed:", err);
      const errMsg = err.message || String(err);
      const errMsgLower = errMsg.toLowerCase();

      if (errMsgLower.includes("calendar not connected") || errMsgLower.includes("no token")) {
        setRescueErrorAlert({
          type: "not_connected",
          message: "Clutch tried to schedule work blocks on your calendar, but Google Calendar is not connected. Connect your calendar to allow automatic slot allocation."
        });
      } else if (errMsgLower.includes("401") || errMsgLower.includes("403") || errMsgLower.includes("unauthorized") || errMsgLower.includes("permission")) {
        setRescueErrorAlert({
          type: "permission_denied",
          message: "Google Calendar authorization has expired or was denied. Please disconnect and reconnect your Google Calendar to refresh access."
        });
      } else {
        setRescueErrorAlert({
          type: "other",
          message: `The rescue pipeline encountered an error: ${errMsg}`
        });
      }

      const errLog: ActionLogEntry = {
        id: `err_${Date.now()}`,
        tool: "clutch-sys",
        summary: `Rescue failed: ${err.message || err}`,
        at: new Date().toISOString(),
        ok: false
      };
      setActivities((prev) => [...prev, errLog]);
    } finally {
      setIsRescuing(false);
    }
  };

  // Triggers sequential rescue of all eligible tasks using autonomous agentLoop
  const handleRescueAll = async () => {
    if (isRescuing) return;
    setIsRescuing(true);
    setSummary("");
    setRescueErrorAlert(null);

    const eligibleTasks = tasks.filter((t) => t.percentDone < 100);

    if (eligibleTasks.length === 0) {
      const errLog: ActionLogEntry = {
        id: `err_${Date.now()}`,
        tool: "clutch-sys",
        summary: "Rescue abort: All tasks are already 100% complete.",
        at: new Date().toISOString(),
        ok: false
      };
      setActivities((prev) => [...prev, errLog]);
      setIsRescuing(false);
      return;
    }

    if (!calendarToken) {
      const warningEntry: ActionLogEntry = {
        id: `cal_warning_${Date.now()}`,
        tool: "clutch-sys",
        summary: "Advisory: Calendar scheduling will be skipped because Google Calendar is not linked.",
        at: new Date().toISOString(),
        ok: true
      };
      setActivities((prev) => [...prev, warningEntry]);
    }

    try {
      const client = getAiClient();
      const goal = "Rescue my week: handle everything at risk of slipping.";
      
      const { finalText, tasks: updated, actionLog } = await runRescue({
        ai: client,
        tasks,
        goal,
        getAccessToken: () => calendarToken,
        onLog: (entry) => {
          setActivities((prev) => [...prev, entry]);
        }
      });

      setTasks([...updated]);
      setSummary(finalText);

      const failedEntry = actionLog.find(entry => !entry.ok);
      if (failedEntry) {
        const sum = failedEntry.summary.toLowerCase();
        if (sum.includes("calendar not connected") || sum.includes("no token")) {
          setRescueErrorAlert({
            type: "not_connected",
            message: "Clutch tried to schedule work blocks on your calendar, but Google Calendar is not connected. Connect your calendar to allow automatic slot allocation."
          });
        } else if (sum.includes("401") || sum.includes("403") || sum.includes("unauthorized") || sum.includes("permission")) {
          setRescueErrorAlert({
            type: "permission_denied",
            message: "Google Calendar authorization has expired or was denied. Please disconnect and reconnect your Google Calendar to refresh access."
          });
        }
      } else {
        const findSlotsLog = actionLog.find(entry => entry.tool === "find_free_slots" && entry.ok);
        if (findSlotsLog && findSlotsLog.summary.includes("Found 0 free")) {
          setRescueErrorAlert({
            type: "no_slots",
            message: "No free calendar blocks of the requested duration were found prior to the deadline for some tasks. Extend their deadlines or clear some events in Google Calendar."
          });
        }
      }
    } catch (err: any) {
      console.error("Rescue All failed:", err);
      const errMsg = err.message || String(err);
      const errMsgLower = errMsg.toLowerCase();

      if (errMsgLower.includes("calendar not connected") || errMsgLower.includes("no token")) {
        setRescueErrorAlert({
          type: "not_connected",
          message: "Clutch tried to schedule work blocks on your calendar, but Google Calendar is not connected. Connect your calendar to allow automatic slot allocation."
        });
      } else if (errMsgLower.includes("401") || errMsgLower.includes("403") || errMsgLower.includes("unauthorized") || errMsgLower.includes("permission")) {
        setRescueErrorAlert({
          type: "permission_denied",
          message: "Google Calendar authorization has expired or was denied. Please disconnect and reconnect your Google Calendar to refresh access."
        });
      } else {
        setRescueErrorAlert({
          type: "other",
          message: `The rescue pipeline encountered an error: ${errMsg}`
        });
      }

      const errLog: ActionLogEntry = {
        id: `err_${Date.now()}`,
        tool: "clutch-sys",
        summary: `Rescue All failed: ${err.message || err}`,
        at: new Date().toISOString(),
        ok: false
      };
      setActivities((prev) => [...prev, errLog]);
    } finally {
      setIsRescuing(false);
    }
  };

  // Manually toggle sub-step status
  const handleToggleSubstep = (taskId: string, stepId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newSteps = t.subSteps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
        const doneCount = newSteps.filter((s) => s.done).length;
        const percentDone = Math.round((doneCount / newSteps.length) * 100);
        return { ...t, subSteps: newSteps, percentDone };
      })
    );
  };

  // Clears all tasks and resets state
  const handleClearTasks = () => {
    setTasks([]);
    setActivities([]);
    setSummary("");
    if (user) {
      clearAllUserTasks(user.uid).catch((err) => console.error("Error clearing user tasks:", err));
      clearAllUserActionLogs(user.uid).catch((err) => console.error("Error clearing user logs:", err));
    }
  };

  // Clears activity logs
  const handleClearActivities = () => {
    setActivities([]);
    if (user) {
      clearAllUserActionLogs(user.uid).catch((err) => console.error("Error clearing user logs:", err));
    }
  };

  // Toggle approval state of a specific generated artifact
  const handleToggleApproveArtifact = (taskId: string, artifactId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updatedArtifacts = t.artifacts.map((art) => {
          if (art.id !== artifactId) return art;
          return { ...art, approved: !art.approved };
        });
        return { ...t, artifacts: updatedArtifacts };
      })
    );

    // Also add an entry in activities panel
    const entry: ActionLogEntry = {
      id: `approve_toggle_${Date.now()}`,
      tool: "clutch-sys",
      summary: `Toggled draft approval status.`,
      at: new Date().toISOString(),
      ok: true
    };
    setActivities((prev) => [entry, ...prev]);
  };

  // Seed a realistic, dynamic at-risk week scenario for immediate exploration
  const handleLoadDemoWeek = () => {
    const now = new Date();
    
    // Tomorrow
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(17, 0, 0, 0); // 5 PM
    
    // In 2 days
    const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    inTwoDays.setHours(23, 59, 0, 0); // End of day
    
    // In 3 days
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    inThreeDays.setHours(14, 0, 0, 0); // 2 PM
    
    // Errand due in 4 days
    const inFourDays = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    inFourDays.setHours(18, 0, 0, 0);

    const demoTasks: Task[] = [
      {
        id: "demo_assignment",
        title: "CS50 Web Programming Final Project Submission",
        deadlineISO: inTwoDays.toISOString(),
        importance: 5,
        percentDone: 30,
        type: "assignment",
        subSteps: [
          { id: "demo_s1", title: "Implement SQL database schema", effortMin: 45, done: true },
          { id: "demo_s2", title: "Complete API routes & auth logic", effortMin: 90, done: false },
          { id: "demo_s3", title: "Design responsive front-end components", effortMin: 120, done: false },
          { id: "demo_s4", title: "Draft documentation and project overview", effortMin: 45, done: false }
        ],
        blocks: [],
        artifacts: [
          {
            id: "demo_art_1",
            taskId: "demo_assignment",
            kind: "outline",
            content: "# CS50 Final Project Architecture\n\n1. Database Schema Design (Completed)\n2. Backend Endpoint Validation\n3. Front-End Interface Implementation\n4. Performance Benchmarks"
          }
        ]
      },
      {
        id: "demo_bill",
        title: "Overdue Electricity & Gas Utility Bill",
        deadlineISO: tomorrow.toISOString(),
        importance: 4,
        percentDone: 0,
        type: "bill",
        subSteps: [
          { id: "demo_s5", title: "Locate digital invoice PDF", effortMin: 10, done: false },
          { id: "demo_s6", title: "Process wire transfer or bank deposit", effortMin: 15, done: false }
        ],
        blocks: [],
        artifacts: [
          {
            id: "demo_art_2",
            taskId: "demo_bill",
            kind: "email",
            content: "Subject: Request for Extension - Utility Bill #49281\n\nDear Billing Department,\n\nI am writing to request a brief 3-day grace period extension on my current electricity invoice due to a bank processing transfer delay. I have authorized the payment pipeline and expect settlement in full within 72 hours.\n\nThank you,\nResident"
          }
        ]
      },
      {
        id: "demo_interview",
        title: "Senior Product Engineer Interview prep - Stripe",
        deadlineISO: inThreeDays.toISOString(),
        importance: 5,
        percentDone: 10,
        type: "interview",
        subSteps: [
          { id: "demo_s7", title: "Review Stripe's system architecture principles", effortMin: 60, done: false },
          { id: "demo_s8", title: "Practice 3 core systems design questions", effortMin: 90, done: false },
          { id: "demo_s9", title: "Draft follow-up thank you template", effortMin: 20, done: false }
        ],
        blocks: [],
        artifacts: [
          {
            id: "demo_art_3",
            taskId: "demo_interview",
            kind: "prep",
            content: "# Stripe Interview Core Prep Guide\n\n- Scale & High Availability (Double-write state patterns)\n- Idempotency keys in high-volume banking systems\n- RESTful design standards & API breaking-change policies"
          }
        ]
      },
      {
        id: "demo_errand",
        title: "Pick up anniversary gift from boutique florist",
        deadlineISO: inFourDays.toISOString(),
        importance: 3,
        percentDone: 0,
        type: "errand",
        subSteps: [
          { id: "demo_s10", title: "Confirm store operating hours", effortMin: 10, done: false },
          { id: "demo_s11", title: "Drive to boutique florist in downtown", effortMin: 40, done: false }
        ],
        blocks: [],
        artifacts: []
      }
    ];

    setTasks(demoTasks);
    setScanResult(null);
    setHasScanned(false); // Reset scan so that the proactive scan will automatically trigger for these tasks!
    
    const entry: ActionLogEntry = {
      id: `demo_seed_${Date.now()}`,
      tool: "clutch-sys",
      summary: "Successfully loaded dynamic demo week scenario. 4 high-risk items seeded.",
      at: new Date().toISOString(),
      ok: true
    };
    setActivities((prev) => [entry, ...prev]);
  };

  // Trigger proactive scan on load or when tasks change from empty to populated
  const runProactiveScan = async (overrideTasks?: Task[]) => {
    const tasksToScan = overrideTasks || tasks;
    if (tasksToScan.length === 0 || isScanning) return;
    setIsScanning(true);
    setHasScanned(true);

    try {
      const client = getAiClient();
      
      const uncompleted = tasksToScan.filter(t => t.percentDone < 100);
      const ranked = rankByRisk(uncompleted);
      const topAtRisk = ranked.slice(0, 3);

      if (topAtRisk.length === 0) {
        setIsScanning(false);
        return;
      }

      const taskBriefs = topAtRisk.map(t => 
        `- ID: ${t.id}, Title: "${t.title}", Type: ${t.type}, Due: ${t.deadlineISO}, Done: ${t.percentDone}%`
      ).join("\n");

      const prompt = `Analyze the following high-risk tasks and suggest exactly ONE short proposed action (max 8 words) for each task to get it back on track (e.g., "Draft electricity bill extension email" or "Schedule 90m CS50 coding block").
Return ONLY a valid JSON array matching this schema:
[
  { "taskId": "string", "proposedAction": "string" }
]

Tasks:
${taskBriefs}`;

      const res = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      let parsed: { taskId: string; proposedAction: string }[] = [];
      const text = res.text || "";
      try {
        const cleaned = text.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.error("Failed to parse proactive scan JSON response", e);
        parsed = topAtRisk.map(t => ({
          taskId: t.id,
          proposedAction: t.type === "bill" 
            ? "Draft bill extension draft" 
            : t.type === "interview"
              ? "Draft Stripe interview prep notes"
              : "Decompose remaining milestones"
        }));
      }

      const proposals = topAtRisk.map(t => {
        const match = parsed.find(p => p.taskId === t.id);
        return {
          taskId: t.id,
          taskTitle: t.title,
          proposedAction: match?.proposedAction || "Decompose and schedule work blocks"
        };
      });

      setScanResult({
        atRiskCount: topAtRisk.length,
        proposals
      });

      const entry: ActionLogEntry = {
        id: `scan_${Date.now()}`,
        tool: "clutch-sys",
        summary: `Proactive Risk Scan complete: Identified ${topAtRisk.length} tasks at risk of slipping. Proposals compiled.`,
        at: new Date().toISOString(),
        ok: true
      };
      setActivities(prev => [entry, ...prev]);

    } catch (err: any) {
      console.error("Proactive risk scan failed:", err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (tasks.length > 0 && !hasScanned && !isScanning && !scanResult) {
      runProactiveScan();
    }
  }, [tasks, hasScanned, isScanning, scanResult]);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
      
      {/* Mesh Gradient Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10"></div>

      {/* App Header */}
      <Header 
        user={user} 
        authLoading={authLoading} 
        onLoginClick={() => setIsAuthModalOpen(true)} 
        onLogoutClick={logoutUser} 
      />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8 relative z-10">
        
        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Command Center + Task Board */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            
            {/* Google Calendar Connection Status Bar */}
            <div className={`p-5 rounded-3xl border backdrop-blur-xl transition-all duration-300 ${
              connectionStatus === "connected"
                ? "bg-emerald-950/10 border-emerald-500/25 shadow-lg shadow-emerald-500/5"
                : connectionStatus === "connecting"
                  ? "bg-indigo-950/10 border-indigo-500/25 animate-pulse"
                  : connectionStatus === "error"
                    ? "bg-rose-950/15 border-rose-500/35"
                    : "bg-white/[0.02] border-white/10"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-2xl shrink-0 ${
                    connectionStatus === "connected"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : connectionStatus === "connecting"
                        ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                        : connectionStatus === "error"
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                          : "bg-white/5 text-slate-400 border border-white/5"
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-100 font-mono">Google Calendar Link</h4>
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        connectionStatus === "connected"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : connectionStatus === "connecting"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : connectionStatus === "error"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-white/5 text-slate-400"
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${
                          connectionStatus === "connected"
                            ? "bg-emerald-400 animate-pulse"
                            : connectionStatus === "connecting"
                              ? "bg-indigo-400 animate-bounce"
                              : connectionStatus === "error"
                                ? "bg-rose-400"
                                : "bg-slate-500"
                        }`}></span>
                        {connectionStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {connectionStatus === "connected"
                        ? "Connected securely. Autonomous schedule optimization & conflict resolution are active."
                        : connectionStatus === "connecting"
                          ? "Establishing secure connection handshake via Google Identity Services..."
                          : connectionStatus === "error"
                            ? "Authentication failed. See the error briefing below."
                            : "Real-time calendar checking is offline. Connect your Google Calendar to allow Clutch to find free slots & schedule work-blocks."}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <button
                    onClick={handleLoadDemoWeek}
                    disabled={isRescuing}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-mono uppercase tracking-wider transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Load Demo Week</span>
                  </button>
                  {connectionStatus !== "connected" ? (
                    <button
                      onClick={handleConnectCalendar}
                      disabled={connectionStatus === "connecting"}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-400 text-white font-mono uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      {connectionStatus === "connecting" ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Connect Calendar</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleDisconnectCalendar}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-white/5 hover:border-rose-500/20 font-mono uppercase tracking-wider transition-all active:scale-98 cursor-pointer"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Display specific error details if present */}
              {calendarError && (
                <div className="mt-4 p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold block font-mono uppercase text-[10px] tracking-wider text-rose-400">Connection Error Briefing</span>
                    <p className="leading-relaxed font-sans">{calendarError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 1. Add Task Bar */}
            <AddTaskBar onTasksParsed={handleTasksParsed} />

            {/* Proactive Risk Scan Alert Banner */}
            {isScanning && (
              <div className="bg-slate-900/40 border border-indigo-500/10 p-5 rounded-3xl backdrop-blur-md flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span className="text-xs font-mono font-medium text-slate-300">
                    Clutch Autonomic Risk Engine is scanning scheduled deliverables & milestones...
                  </span>
                </div>
              </div>
            )}

            {scanResult && scanResult.atRiskCount > 0 && (
              <div className="bg-indigo-950/25 border border-indigo-500/30 p-5 rounded-3xl relative overflow-hidden animate-fade-in shadow-xl space-y-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 rounded-xl shrink-0">
                      <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100 font-mono flex items-center gap-2">
                        <span>Risk Assessment Alert</span>
                        <span className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded font-mono">
                          {scanResult.atRiskCount} Items At Risk
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {scanResult.atRiskCount} things may slip — want me to handle them?
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setScanResult(null)}
                      className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => {
                        handleRescueAll();
                        setScanResult(null);
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-400 text-white font-mono uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 active:scale-98 cursor-pointer"
                    >
                      Handle them
                    </button>
                  </div>
                </div>

                {/* Scanned Items & proposed action checklist */}
                <div className="border-t border-white/5 pt-3.5 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                    Proposed Autonomic Remediation Steps:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {scanResult.proposals.map((prop, idx) => (
                      <div key={prop.taskId || idx} className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 flex flex-col justify-between gap-1.5 hover:border-indigo-500/10 transition-colors">
                        <div>
                          <span className="text-[9px] font-mono text-indigo-400 font-bold block truncate max-w-full">
                            {prop.taskTitle}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 leading-relaxed font-sans font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
                          {prop.proposedAction}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {rescueErrorAlert && (
              <div className={`p-5 rounded-3xl border animate-fade-in relative overflow-hidden ${
                rescueErrorAlert.type === "no_slots"
                  ? "bg-amber-950/20 border-amber-500/20 text-amber-200"
                  : rescueErrorAlert.type === "permission_denied"
                    ? "bg-rose-950/20 border-rose-500/20 text-rose-200"
                    : "bg-indigo-950/20 border-indigo-500/20 text-indigo-200"
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${
                    rescueErrorAlert.type === "no_slots"
                      ? "bg-amber-500/10 text-amber-400"
                      : rescueErrorAlert.type === "permission_denied"
                        ? "bg-rose-500/10 text-rose-400"
                        : "bg-indigo-500/10 text-indigo-400"
                  }`}>
                    {rescueErrorAlert.type === "no_slots" ? (
                      <CalendarOff className="w-4 h-4" />
                    ) : rescueErrorAlert.type === "permission_denied" ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-semibold font-mono uppercase tracking-wider">
                      {rescueErrorAlert.type === "no_slots"
                        ? "Schedule Constraint Advisory"
                        : rescueErrorAlert.type === "permission_denied"
                          ? "Calendar Access Blocked"
                          : "Autonomous Agent Advisory"}
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {rescueErrorAlert.message}
                    </p>
                  </div>
                  <button
                    onClick={() => setRescueErrorAlert(null)}
                    className="text-slate-400 hover:text-slate-200 text-xs font-mono font-bold cursor-pointer hover:bg-white/5 px-2 py-1 rounded transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Agent Summary Briefing Section */}
            {summary && (
              <div className="bg-indigo-950/20 border border-indigo-500/20 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden animate-fade-in space-y-3 shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-500/20 p-1.5 rounded-lg text-indigo-400">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-indigo-300">Agent Rescue Briefing</h3>
                </div>
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {summary}
                </div>
              </div>
            )}

            {/* 2. Tasks Rescue List */}
            <TaskList
              tasks={tasks}
              onRescueTask={handleRescueTask}
              onRescueAll={handleRescueAll}
              onToggleSubstep={handleToggleSubstep}
              onViewArtifact={setCurrentArtifact}
              onToggleApproveArtifact={handleToggleApproveArtifact}
              onClearTasks={handleClearTasks}
              isRescuing={isRescuing}
            />
          </div>

          {/* Right Column: Live Agent Log Terminal */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-8">
            <AgentActivityPanel
              activities={activities}
              onClearActivities={handleClearActivities}
              isWorking={isRescuing}
            />
          </div>

        </div>
      </main>

      {/* Artifact Viewer Modal */}
      {currentArtifact && (
        <ArtifactViewerModal
          artifact={currentArtifact}
          onClose={() => setCurrentArtifact(null)}
        />
      )}

      {/* Footer Decorations */}
      <footer className="mt-auto py-8 border-t border-white/5 bg-slate-950/40 backdrop-blur-md px-8 flex flex-col sm:flex-row justify-between items-center text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 gap-4">
        <div>Clutch v1.2.0</div>
        <div className="flex gap-6 font-mono">
          <a href="#" className="hover:text-indigo-400 transition-colors">Security Protocol</a>
          <a href="#" className="hover:text-indigo-400 transition-colors">Agent Config</a>
          <a href="#" className="hover:text-indigo-400 transition-colors">Documentation</a>
        </div>
      </footer>
    </div>
  );
}
