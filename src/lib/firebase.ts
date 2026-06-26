import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  User,
  getRedirectResult
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  deleteDoc, 
  writeBatch
} from "firebase/firestore";
import { Task, ActionLogEntry } from "./types";

// Firebase App Configuration from firebase-applet-config.json
const firebaseConfig = {
  projectId: "mystic-messenger-7wjkk",
  appId: "1:1015712405758:web:12adb57bfe615d51c16daf",
  apiKey: "AIzaSyDDCN74Jf4I_t4G29QJI_tXrmk1rBPm0p4",
  authDomain: "mystic-messenger-7wjkk.firebaseapp.com",
  storageBucket: "mystic-messenger-7wjkk.firebasestorage.app",
  messagingSenderId: "1015712405758"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with custom database ID
export const db = getFirestore(app, "ai-studio-clutchthelastmin-1b08c393-f582-42e1-ab7d-b5089e0e5aac");

// Auth providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Resilient sign-in helper that tries popup, falls back to redirect, 
 * or offers standard anonymous guest access if all else is blocked by sandboxing.
 */
export async function loginWithGoogle() {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (popupError: any) {
    console.warn("Google signInWithPopup blocked or failed, attempting redirect...", popupError);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (redirectError: any) {
      console.error("Google signInWithRedirect failed:", redirectError);
      throw redirectError;
    }
  }
}

export async function loginAnonymously() {
  return signInAnonymously(auth);
}

export async function logoutUser() {
  return signOut(auth);
}

// --- Firestore Database Helpers ---

/**
 * Fetches all tasks for the logged-in user.
 */
export async function getUserTasks(userId: string): Promise<Task[]> {
  try {
    const tasksCol = collection(db, "tasks");
    const q = query(tasksCol, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const tasks: Task[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      tasks.push({
        id: docSnap.id,
        title: data.title || "",
        deadlineISO: data.deadlineISO || "",
        importance: data.importance || 1,
        percentDone: data.percentDone || 0,
        type: data.type || "other",
        subSteps: data.subSteps || [],
        blocks: data.blocks || [],
        artifacts: data.artifacts || []
      });
    });
    return tasks;
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    throw error;
  }
}

/**
 * Saves a task to Firestore under the user's namespace.
 */
export async function saveUserTask(userId: string, task: Task): Promise<void> {
  try {
    const taskDocRef = doc(db, "tasks", task.id);
    await setDoc(taskDocRef, {
      ...task,
      userId,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error saving task ${task.id}:`, error);
    throw error;
  }
}

/**
 * Deletes a task from Firestore.
 */
export async function deleteUserTask(taskDocId: string): Promise<void> {
  try {
    const taskDocRef = doc(db, "tasks", taskDocId);
    await deleteDoc(taskDocRef);
  } catch (error) {
    console.error(`Error deleting task ${taskDocId}:`, error);
    throw error;
  }
}

/**
 * Clear all tasks for a specific user.
 */
export async function clearAllUserTasks(userId: string): Promise<void> {
  try {
    const tasksCol = collection(db, "tasks");
    const q = query(tasksCol, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error clearing user tasks:", error);
    throw error;
  }
}

/**
 * Fetches all action log entries for the logged-in user.
 */
export async function getUserActionLogs(userId: string): Promise<ActionLogEntry[]> {
  try {
    const logsCol = collection(db, "actionLogs");
    const q = query(logsCol, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const logs: ActionLogEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      logs.push({
        id: docSnap.id,
        tool: data.tool || "",
        summary: data.summary || "",
        at: data.at || new Date().toISOString(),
        ok: data.ok !== undefined ? data.ok : true
      });
    });
    // Sort chronologically
    return logs.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  } catch (error) {
    console.error("Error fetching user action logs:", error);
    throw error;
  }
}

/**
 * Saves a single action log entry.
 */
export async function saveUserActionLog(userId: string, log: ActionLogEntry): Promise<void> {
  try {
    const logDocRef = doc(db, "actionLogs", log.id);
    await setDoc(logDocRef, {
      ...log,
      userId,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error saving action log ${log.id}:`, error);
    throw error;
  }
}

/**
 * Clears all action logs for a specific user.
 */
export async function clearAllUserActionLogs(userId: string): Promise<void> {
  try {
    const logsCol = collection(db, "actionLogs");
    const q = query(logsCol, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error clearing user action logs:", error);
    throw error;
  }
}
