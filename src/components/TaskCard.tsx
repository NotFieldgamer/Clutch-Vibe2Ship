import React from "react";
import { motion } from "motion/react";
import { 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Play, 
  Unlock, 
  Lock, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  XCircle,
  CheckSquare,
  Square,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp
} from "lucide-react";
import { Task, SubStep, Block, Artifact } from "../lib/types";

interface TaskCardProps {
  task: Task;
  onRescueTask: (task: Task) => void;
  onToggleSubstep: (taskId: string, stepId: string) => void;
  onViewArtifact: (artifact: Artifact) => void;
  onToggleApproveArtifact: (taskId: string, artifactId: string) => void;
  isRescuing: boolean;
}

export default function TaskCard({
  task,
  onRescueTask,
  onToggleSubstep,
  onViewArtifact,
  onToggleApproveArtifact,
  isRescuing
}: TaskCardProps) {
  const [expanded, setExpanded] = React.useState(true);
  const [expandedArtifacts, setExpandedArtifacts] = React.useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const toggleArtifactExpand = (artId: string) => {
    setExpandedArtifacts((prev) => ({ ...prev, [artId]: !prev[artId] }));
  };

  const handleCopyArtifact = (artId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(artId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Parse deadline countdown
  const getDeadlineText = (isoString: string) => {
    const deadline = new Date(isoString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { text: "Due today", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    if (diffDays === 1) return { text: "Due tomorrow", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} days`, color: "text-red-400 bg-red-500/10 border-red-500/20 font-semibold" };
    return { text: `Due in ${diffDays} days`, color: "text-slate-300 bg-white/5 border-white/10" };
  };

  const deadlineInfo = getDeadlineText(task.deadlineISO);

  // Importance badge color
  const getImportanceBadge = (rating: number) => {
    if (rating >= 5) return { text: "Critical", color: "bg-red-500/10 text-red-400 border-red-500/25" };
    if (rating >= 4) return { text: "High", color: "bg-orange-500/10 text-orange-400 border-orange-500/25" };
    if (rating >= 3) return { text: "Medium", color: "bg-amber-500/10 text-amber-400 border-amber-500/25" };
    return { text: "Low", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" };
  };

  const importanceBadge = getImportanceBadge(task.importance);

  // Type label color
  const getTypeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "assignment": return "text-purple-400 border-purple-500/25 bg-purple-500/10";
      case "bill": return "text-emerald-400 border-emerald-500/25 bg-emerald-500/10";
      case "interview": return "text-indigo-400 border-indigo-500/25 bg-indigo-500/10";
      case "meeting": return "text-cyan-400 border-cyan-500/25 bg-cyan-500/10";
      case "errand": return "text-pink-400 border-pink-500/25 bg-pink-500/10";
      default: return "text-slate-400 border-white/10 bg-white/5";
    }
  };

  const hasUnscheduledBlocks = task.blocks.length === 0;
  const isComplete = task.percentDone === 100;

  return (
    <motion.div 
      layout="position"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 25,
        opacity: { duration: 0.2 }
      }}
      className={`group relative w-full border rounded-2xl p-5 bg-white/5 border-white/10 backdrop-blur-md transition-colors duration-300 ${
        isComplete 
          ? "border-emerald-500/30 shadow-emerald-950/15 shadow-lg" 
          : hasUnscheduledBlocks 
            ? "border-amber-500/20 hover:border-amber-500/30" 
            : "border-white/10 hover:border-white/20"
      }`}
    >
      {/* Background radial accent glow */}
      {isComplete && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
      )}

      {/* Card Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-mono capitalize ${getTypeBadgeColor(task.type)}`}>
              {task.type}
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-mono ${importanceBadge.color}`}>
              Priority: {importanceBadge.text}
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-mono flex items-center gap-1 ${deadlineInfo.color}`}>
              <Clock className="w-3 h-3" />
              {deadlineInfo.text}
            </span>
          </div>

          <h3 className={`text-lg font-semibold tracking-tight text-slate-100 ${isComplete ? "line-through text-slate-400" : ""}`}>
            {task.title}
          </h3>
        </div>

        {/* Rescue action button */}
        <div className="flex items-center gap-2 self-start md:self-center">
          {!isComplete ? (
            <button
              onClick={() => onRescueTask(task)}
              disabled={isRescuing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25 active:scale-95 cursor-pointer disabled:bg-white/5 disabled:text-slate-500 disabled:border-white/5 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>Rescue Now</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>Rescued</span>
            </div>
          )}

          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
          <span>Resolution Progress</span>
          <span className={task.percentDone === 100 ? "text-emerald-400" : "text-indigo-400"}>
            {task.percentDone}%
          </span>
        </div>
        <div className="w-full bg-slate-950/40 rounded-full h-2 overflow-hidden border border-white/5">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete 
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/20" 
                : "bg-gradient-to-r from-indigo-500 to-emerald-500 shadow-md shadow-indigo-500/20"
            }`}
            style={{ width: `${task.percentDone}%` }}
          ></div>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Left Column: Substeps & Calendar Blocks */}
          <div className="space-y-4">
            
            {/* Scheduled Calendar Blocks */}
            {task.blocks.length > 0 && (
              <div>
                <h4 className="text-xs font-mono font-semibold text-slate-400 tracking-wider uppercase mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Scheduled Calendar Blocks
                </h4>
                <div className="space-y-1.5">
                  {task.blocks.map((block) => (
                    <div 
                      key={block.id}
                      className="flex flex-col gap-1 p-2.5 rounded-lg text-xs border bg-white/5 border-white/5 text-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-indigo-300">{block.title}</span>
                        {block.calendarEventId && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                            ● Synced
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <span>{new Date(block.startISO).toLocaleString()}</span>
                        <span>-</span>
                        <span>{new Date(block.endISO).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-steps */}
            <div>
              <h4 className="text-xs font-mono font-semibold text-slate-400 tracking-wider uppercase mb-2 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                Execution Steps
              </h4>
              <div className="space-y-1.5">
                {task.subSteps.map((step) => (
                  <div 
                    key={step.id}
                    onClick={() => !isRescuing && onToggleSubstep(task.id, step.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs border transition-all ${
                      step.done
                        ? "bg-white/5 border-white/5 text-slate-500"
                        : "bg-white/5 border-white/5 text-slate-300 cursor-pointer hover:bg-white/10"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 border border-white/20 rounded shrink-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-transparent rounded"></div>
                      </div>
                    )}
                    <span className={step.done ? "line-through text-slate-500" : ""}>
                      {step.title} <span className="text-[10px] text-slate-400 font-mono ml-1">({step.effortMin}m)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Generated Artifacts */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-semibold text-slate-400 tracking-wider uppercase mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Generated Work Deliverables
            </h4>
            
            {task.artifacts.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-white/5 border border-white/5 rounded-xl">
                No artifacts required for this task.
              </p>
            ) : (
              <div className="space-y-3">
                {task.artifacts.map((artifact) => {
                  const unlocked = task.percentDone >= 50 || isComplete;
                  const name = `clutch_${artifact.kind}.md`;
                  const isArtExpanded = !!expandedArtifacts[artifact.id];
                  
                  // Email Draft Parser
                  let emailSubject = "";
                  let emailBody = artifact.content;
                  if (artifact.kind === "email") {
                    if (artifact.content.toLowerCase().startsWith("subject:")) {
                      const firstLineEnd = artifact.content.indexOf("\n");
                      if (firstLineEnd !== -1) {
                        emailSubject = artifact.content.substring(8, firstLineEnd).trim();
                        emailBody = artifact.content.substring(firstLineEnd + 1).trim();
                      }
                    } else {
                      const lines = artifact.content.split("\n");
                      const subjLine = lines.find(l => l.toLowerCase().startsWith("subject:"));
                      if (subjLine) {
                        emailSubject = subjLine.replace(/subject:\s*/i, "").trim();
                        emailBody = lines.filter(l => !l.toLowerCase().startsWith("subject:")).join("\n").trim();
                      }
                    }
                  }

                  return (
                    <div 
                      key={artifact.id}
                      className={`flex flex-col rounded-xl border transition-all overflow-hidden ${
                        unlocked 
                          ? artifact.approved
                            ? "bg-emerald-950/20 border-emerald-500/30 shadow-md shadow-emerald-500/5"
                            : "bg-indigo-500/5 border-indigo-500/20" 
                          : "bg-white/5 border-white/5 opacity-60"
                      }`}
                    >
                      {/* Header bar of Artifact card */}
                      <div 
                        onClick={() => unlocked && toggleArtifactExpand(artifact.id)}
                        className={`flex items-center justify-between gap-3 p-3 select-none ${
                          unlocked ? "cursor-pointer hover:bg-white/[0.02]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className={`w-4 h-4 shrink-0 ${artifact.approved ? "text-emerald-400" : "text-indigo-400"}`} />
                          <span className="text-xs font-medium text-slate-200 truncate font-mono">
                            {name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {artifact.approved && (
                            <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                              Approved
                            </span>
                          )}
                          {unlocked ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 font-mono flex items-center gap-1">
                              <Unlock className="w-2.5 h-2.5" />
                              Unlocked
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/5 bg-white/5 text-slate-500 font-mono flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              Locked
                            </span>
                          )}
                          {unlocked && (
                            <div>
                              {isArtExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Explanatory text (only when collapsed) */}
                      {!isArtExpanded && (
                        <div className="px-3 pb-3">
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {unlocked 
                              ? "Draft compiled. Click to expand and approve." 
                              : "Run Rescue protocol to compile this deliverable."}
                          </p>
                        </div>
                      )}

                      {/* Expandable detailed content section */}
                      {unlocked && isArtExpanded && (
                        <div className="px-3 pb-3 border-t border-white/5 pt-3 bg-slate-950/20 space-y-3">
                          {artifact.kind === "email" ? (
                            <div className="space-y-2 text-xs">
                              {emailSubject && (
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 block font-bold">Subject Line</span>
                                  <div className="text-slate-200 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 font-medium leading-relaxed">
                                    {emailSubject}
                                  </div>
                                </div>
                              )}
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 block font-bold">Email Body</span>
                                <div className="text-slate-300 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 whitespace-pre-wrap leading-relaxed">
                                  {emailBody}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 block font-bold">Draft Content</span>
                              <div className="p-3 bg-white/5 rounded-lg border border-white/5 font-mono text-[11px] whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed text-slate-300">
                                {artifact.content}
                              </div>
                            </div>
                          )}

                          {/* Control actions for the artifact */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/5">
                            <button
                              onClick={() => handleCopyArtifact(artifact.id, artifact.content)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-all cursor-pointer"
                            >
                              {copiedId === artifact.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Copy Draft</span>
                                </>
                              )}
                            </button>

                            <div className="flex items-center gap-2">
                              {artifact.approved ? (
                                <button
                                  onClick={() => onToggleApproveArtifact(task.id, artifact.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Undo Approval</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => onToggleApproveArtifact(task.id, artifact.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Approve Draft</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </motion.div>
  );
}
