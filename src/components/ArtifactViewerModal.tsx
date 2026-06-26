import React from "react";
import ReactMarkdown from "react-markdown";
import { X, Copy, Check, Download, FileText } from "lucide-react";
import { Artifact } from "../lib/types";

interface ArtifactViewerModalProps {
  artifact: Artifact | null;
  onClose: () => void;
}

export default function ArtifactViewerModal({ artifact, onClose }: ArtifactViewerModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!artifact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([artifact.content], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `clutch_${artifact.kind}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm md:text-base font-semibold text-slate-100 truncate font-mono">
                clutch_{artifact.kind}.md
              </h2>
              <p className="text-xs text-slate-400 font-mono">Type: {artifact.kind.toUpperCase()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-all flex items-center gap-1 text-xs font-mono cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-all flex items-center gap-1 text-xs font-mono cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-250 text-slate-400 border border-white/5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white/[0.02] custom-scrollbar">
          <div className="prose prose-invert prose-sm max-w-none text-slate-300">
            {/* Wrapped ReactMarkdown correctly to satisfy strict class constraints */}
            <div className="markdown-body leading-relaxed space-y-4">
              <ReactMarkdown>{artifact.content}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white/5 border-t border-white/10 text-[10px] text-slate-500 flex justify-between select-none">
          <span>Clutch Deliverable Engine v1.0</span>
          <span>Verified Secure Output</span>
        </div>

      </div>
    </div>
  );
}
