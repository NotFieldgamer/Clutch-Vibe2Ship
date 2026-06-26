import { Task } from "../lib/types";

export async function parseTasksWithGeminiClient(inputText: string): Promise<Task[]> {
  try {
    const response = await fetch("/api/parse-tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputText }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error occurred" }));
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.tasks as Task[];
  } catch (error: any) {
    console.error("Client-side parse error:", error);
    throw error;
  }
}
