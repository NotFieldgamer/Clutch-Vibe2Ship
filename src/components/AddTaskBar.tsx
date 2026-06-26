import React, { useState } from "react";
import { Terminal, Send, AlertCircle, RefreshCw, HelpCircle } from "lucide-react";
import { parseTasksWithGeminiClient } from "../google/gemini.client";
import { Task } from "../lib/types";

interface AddTaskBarProps {
  onTasksParsed: (tasks: Task[]) => void;
}

export default function AddTaskBar({ onTasksParsed }: AddTaskBarProps) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = [
    "Assignment due Friday, electricity bill on the 27th, interview prep, buy mom a gift",
    "Prepare slides for Monday presentation, schedule dentist appointment, renew car insurance, gym plan",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const parsedTasks = await parseTasksWithGeminiClient(inputText);
      if (parsedTasks && parsedTasks.length > 0) {
        onTasksParsed(parsedTasks);
        setInputText("");
      } else {
        setError("No tasks could be identified in your input. Try describing deadlines more clearly.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while communicating with Gemini.");
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (preset: string) => {
    setInputText(preset);
  };

  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all duration-300 focus-within:border-indigo-500/30">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center gap-2 mb-4">
        <div className="bg-indigo-500/20 p-2 rounded-lg">
          <Terminal className="w-5 h-5 text-indigo-400" />
        </div>
        <h2 className="text-lg font-bold tracking-wide text-slate-100 font-display">
          Initialize Rescue Protocol
        </h2>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        Dump your weekly chores, chaotic deadlines, or vague assignments below. Clutch will extract, structure, and pre-solve them.
      </p>

      <form onSubmit={handleSubmit} className="relative flex flex-col gap-3">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            placeholder='e.g., "Assignment due Friday, electricity bill on the 27th, interview prep, buy mom a gift"...'
            rows={3}
            className="w-full bg-slate-950/40 text-slate-100 placeholder:text-slate-500 text-sm sm:text-base border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-xl px-4 py-3 resize-none outline-none transition-all pr-12 disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="absolute right-3 bottom-3 flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white disabled:bg-slate-800 disabled:text-slate-500 transition-all cursor-pointer shadow-lg shadow-indigo-500/25"
            title="Submit to Clutch AI"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Example Presets */}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            Try these:
          </span>
          {presets.map((preset, index) => (
            <button
              key={index}
              type="button"
              disabled={loading}
              onClick={() => handlePresetClick(preset)}
              className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors text-left truncate max-w-full cursor-pointer"
            >
              "{preset.substring(0, 50)}..."
            </button>
          ))}
        </div>
      </form>

      {/* Graceful Error Display */}
      {error && (
        <div className="mt-4 flex items-start gap-3 bg-red-950/40 border border-red-900/60 rounded-xl p-4 text-red-200 animate-fade-in text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Gemini Parser Exception</span>
            <span className="text-slate-300 text-xs font-mono">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
