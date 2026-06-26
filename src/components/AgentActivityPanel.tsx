import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal, Shield, Activity, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { ActionLogEntry } from "../lib/types";

interface AgentActivityPanelProps {
  activities: ActionLogEntry[];
  onClearActivities: () => void;
  isWorking: boolean;
}

export default function AgentActivityPanel({
  activities,
  onClearActivities,
  isWorking
}: AgentActivityPanelProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of terminal when logs grow
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activities]);

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return "";
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl font-mono">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-widest font-display">
            Agent Operations Console
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5">
            <span className={`relative flex h-2 w-2`}>
              {isWorking && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isWorking ? "bg-emerald-400" : "bg-slate-600"}`}></span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              {isWorking ? "Active" : "Standby"}
            </span>
          </div>

          {/* Clear button */}
          {activities.length > 0 && (
            <button
              onClick={onClearActivities}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/5 transition-all cursor-pointer"
              title="Clear terminal logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Log Output */}
      <div className="flex-1 p-4 overflow-y-auto text-xs space-y-2 min-h-[300px] max-h-[500px] lg:max-h-[600px] custom-scrollbar">
        {activities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
            <Activity className="w-8 h-8 text-slate-600 mb-3 animate-pulse" />
            <p className="text-slate-400 text-xs italic">
              The agent's actions will appear here.
            </p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">
              No processes are currently executing. Use the "Rescue" triggers to dispatch the Clutch autonomous solver.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {activities.map((act) => (
                <motion.div
                  key={act.id}
                  layout="position"
                  initial={{ opacity: 0, x: -10, y: 5 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="flex items-start gap-2 border-b border-white/5 pb-1.5"
                >
                  {/* Timestamp */}
                  <span className="text-slate-600 select-none text-[10px] shrink-0 mt-0.5">
                    [{fmtTime(act.at)}]
                  </span>

                  {/* Tool Badge */}
                  <span className="text-indigo-300 shrink-0 text-[10px] max-w-[120px] truncate border border-indigo-500/20 px-1.5 py-0.5 rounded bg-indigo-500/10 select-none font-semibold uppercase tracking-wider">
                    {act.tool}
                  </span>

                  {/* Log message */}
                  <span className={`leading-relaxed break-words flex-1 ${act.ok ? "text-slate-300" : "text-red-400"}`}>
                    {act.summary}
                  </span>

                  {/* Success / Error icon */}
                  <div className="shrink-0 mt-0.5">
                    {act.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={terminalEndRef} />
          </div>
        )}
      </div>

      {/* Console Status Bar */}
      <div className="px-4 py-2 bg-white/5 border-t border-white/10 text-[10px] text-slate-500 flex justify-between select-none">
        <span>Channel: CLUTCH-AGENT-SYS</span>
        <span>Logs: {activities.length} entry/ies</span>
      </div>
    </div>
  );
}
