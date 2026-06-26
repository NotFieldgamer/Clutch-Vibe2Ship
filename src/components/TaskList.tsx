import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, BarChart2, ShieldCheck, ShieldAlert, Package, Trash2 } from "lucide-react";
import TaskCard from "./TaskCard";
import { Task, Artifact } from "../lib/types";

interface TaskListProps {
  tasks: Task[];
  onRescueTask: (task: Task) => void;
  onRescueAll: () => void;
  onToggleSubstep: (taskId: string, stepId: string) => void;
  onViewArtifact: (artifact: Artifact) => void;
  onToggleApproveArtifact: (taskId: string, artifactId: string) => void;
  onClearTasks: () => void;
  isRescuing: boolean;
}

export default function TaskList({
  tasks,
  onRescueTask,
  onRescueAll,
  onToggleSubstep,
  onViewArtifact,
  onToggleApproveArtifact,
  onClearTasks,
  isRescuing
}: TaskListProps) {
  // Sort tasks by deadline
  const sortedTasks = [...tasks].sort((a, b) => {
    return new Date(a.deadlineISO).getTime() - new Date(b.deadlineISO).getTime();
  });

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.percentDone === 100).length;
  const unscheduledTasks = tasks.filter((t) => t.blocks.length === 0).length;
  const totalArtifacts = tasks.reduce((acc, t) => acc + (t.percentDone >= 50 ? t.artifacts.length : 0), 0);

  if (totalTasks === 0) {
    return (
      <div className="w-full bg-slate-900/30 border border-white/5 rounded-3xl p-10 text-center backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-indigo-400 shadow-lg shadow-indigo-500/10">
          <Package className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100 font-display tracking-wide">No active rescue protocols</h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-2.5 max-w-md mx-auto leading-relaxed">
          Type your weekly chores and deadlines into the Command Center above, or trigger the <span className="text-indigo-300 font-medium font-mono">"Load Demo Week"</span> controller to seed a realistic high-risk schedule instantly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Statistics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-3.5 backdrop-blur-xl">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Total Workload</span>
            <span className="text-xl font-bold text-slate-100 font-mono">{totalTasks} tasks</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-3.5 backdrop-blur-xl">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Fully Rescued</span>
            <span className="text-xl font-bold text-slate-100 font-mono">{completedTasks} / {totalTasks}</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-3.5 backdrop-blur-xl">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Unscheduled Tasks</span>
            <span className="text-xl font-bold text-slate-100 font-mono">{unscheduledTasks} task(s)</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-3.5 backdrop-blur-xl">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Unlocked Deliverables</span>
            <span className="text-xl font-bold text-slate-100 font-mono">{totalArtifacts} generated</span>
          </div>
        </div>
      </div>

      {/* Task List Header */}
      <div className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold tracking-wide text-slate-200 font-display">Rescue Schedule</h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
            Sorted by urgency
          </span>
        </div>

        <div className="flex items-center gap-2">
          {completedTasks < totalTasks && (
            <button
              onClick={onRescueAll}
              disabled={isRescuing || completedTasks === totalTasks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 hover:bg-indigo-400 text-white disabled:bg-slate-800 disabled:text-slate-500 transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rescue My Week</span>
            </button>
          )}

          <button
            onClick={onClearTasks}
            disabled={isRescuing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
            title="Clear all tasks"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Cards container */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onRescueTask={onRescueTask}
              onToggleSubstep={onToggleSubstep}
              onViewArtifact={onViewArtifact}
              onToggleApproveArtifact={onToggleApproveArtifact}
              isRescuing={isRescuing}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
