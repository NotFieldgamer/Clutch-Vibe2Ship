import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../lib/types";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please check your secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export async function parseTasksWithGemini(inputText: string, currentDate: string): Promise<Task[]> {
  const ai = getAiClient();
  
  const systemInstruction = `You are Clutch, the autonomous deadline-rescue assistant. 
Analyze the user's natural language input describing tasks, assignments, bills, preparations, shopping lists, or events.
Convert them into a structured JSON array of tasks.

The current date is ${currentDate}. 

For each task in the user's input, parse and generate:
1. Title: A clean, concise, actionable title (e.g. "Prepare for Javascript Interview" instead of just "interview prep").
2. DeadlineISO: Estimate a realistic deadline date in ISO format YYYY-MM-DD. 
   - If the user says "Friday", determine the date of the coming Friday relative to ${currentDate}.
   - If the user specifies "the 27th", determine the date corresponding to the 27th of the current or next month.
   - If no deadline is specified, estimate a logical one based on the nature of the task.
3. Importance: An integer score from 1 to 5 (5 is critical, 1 is low).
4. Type: Categorize the task. Use one of these categories: 'assignment', 'bill', 'interview', 'meeting', 'errand', 'other'.
5. Substeps: An array of 3 to 5 clear, logical, sequential actions needed to completely do the work. Each should have a unique 'id' (e.g., 'step_1', 'step_2'), 'title' (a short title string), 'effortMin' (estimated minutes as an integer, e.g. 30, 45, 60), and 'done: false'.
6. Blocks: Always return an empty array for blocks initially.
7. Artifacts: An array of 1 to 2 digital assets or work documents that the rescue agent will generate. Provide a 'kind' (one of: 'outline', 'draft', 'email', 'prep', 'note') and a 'content' field containing a high-quality initial draft or outline for that artifact (written in markdown/text) that Clutch will "generate" to assist the user.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `User task description to parse:\n"${inputText}"`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            deadlineISO: { type: Type.STRING, description: "YYYY-MM-DD" },
            importance: { type: Type.INTEGER, description: "1 to 5" },
            percentDone: { type: Type.INTEGER, description: "Always start at 0" },
            type: { type: Type.STRING },
            subSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  effortMin: { type: Type.INTEGER },
                  done: { type: Type.BOOLEAN }
                },
                required: ["id", "title", "effortMin", "done"]
              }
            },
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  taskId: { type: Type.STRING },
                  startISO: { type: Type.STRING },
                  endISO: { type: Type.STRING },
                  title: { type: Type.STRING }
                },
                required: ["id", "taskId", "startISO", "endISO", "title"]
              }
            },
            artifacts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  taskId: { type: Type.STRING },
                  kind: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["id", "taskId", "kind", "content"]
              }
            }
          },
          required: ["title", "deadlineISO", "importance", "percentDone", "type", "subSteps", "blocks", "artifacts"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response content from Gemini API");
  }

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("Gemini response is not a JSON array");
    }
    // Inject a unique ID for each task and initialize progress
    return parsed.map((task: any, idx: number) => {
      const taskId = `task_${Date.now()}_${idx}`;
      return {
        ...task,
        id: taskId,
        percentDone: 0,
        subSteps: (task.subSteps || []).map((s: any) => ({ ...s, done: false })),
        blocks: (task.blocks || []).map((b: any) => ({ ...b, taskId })),
        artifacts: (task.artifacts || []).map((a: any) => ({ ...a, taskId }))
      };
    }) as Task[];
  } catch (err: any) {
    console.error("Failed to parse Gemini output as JSON tasks. Raw content was:", text);
    throw new Error(`Failed to parse structured tasks: ${err.message}`);
  }
}
