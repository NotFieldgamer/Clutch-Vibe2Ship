import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { parseTasksWithGemini } from "./src/google/gemini.server";

// Load environment variables for local development
import dotenv from "dotenv";
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup standard JSON parser middleware
  app.use(express.json());

  // API Route: Parse tasks from plain language input via secure Gemini API
  app.post("/api/parse-tasks", async (req, res) => {
    try {
      const { inputText } = req.body;
      if (!inputText || typeof inputText !== "string" || !inputText.trim()) {
        return res.status(400).json({ error: "Input text is required" });
      }

      // Capture and pass the current local date (relative to local container execution time)
      // so Gemini can accurately map weekdays and dates (e.g. "due Friday", "on the 27th")
      const currentDateString = new Date().toISOString().split("T")[0];
      const parsedTasks = await parseTasksWithGemini(inputText, currentDateString);

      return res.json({ tasks: parsedTasks });
    } catch (error: any) {
      console.error("API Error in /api/parse-tasks:", error);
      return res.status(500).json({ error: error.message || "Failed to process tasks via Gemini" });
    }
  });

  // Integrate Vite Dev Middleware in development, serve static bundle in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Always bind exclusively to Port 3000 and 0.0.0.0 for Cloud Run container routing
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CLUTCH READY] Server executing on port ${PORT}`);
  });
}

startServer();
