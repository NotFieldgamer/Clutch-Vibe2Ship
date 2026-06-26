import React from "react";
import { Shield, Sparkles, LogIn, LogOut } from "lucide-react";
import { User } from "firebase/auth";

interface HeaderProps {
  user: User | null;
  authLoading: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

export default function Header({ user, authLoading, onLoginClick, onLogoutClick }: HeaderProps) {
  return (
    <header className="relative z-10 w-full border-b border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/20">
            <Shield className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-white font-display flex items-center gap-2">
              CLUTCH
              <span className="text-[10px] tracking-normal font-mono px-2 py-0.5 rounded-full bg-white/10 text-indigo-300 border border-white/10">
                v1.2.0
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">The Last-Minute Life Saver</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="flex flex-col items-center md:items-end text-center md:text-right gap-1.5">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium text-sm sm:text-base">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>It doesn't remind you — <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 font-semibold">it does the work.</span></span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3.5 mt-1">
            <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              Autonomous rescue protocol active
            </p>

            {/* Authentication Status widget */}
            <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>

            {authLoading ? (
              <div className="w-20 h-6 bg-white/5 rounded-lg animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full pl-2 pr-3 py-1 transition-all">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] text-indigo-300 font-bold font-mono">
                    {user.isAnonymous ? "G" : (user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-mono font-medium text-slate-200 max-w-[100px] truncate">
                  {user.isAnonymous ? "Guest Sync" : (user.displayName || user.email?.split("@")[0] || "Synced")}
                </span>
                <button
                  onClick={onLogoutClick}
                  title="Sign out"
                  className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all active:scale-95 cursor-pointer font-mono uppercase tracking-wider"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Link Sync</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
