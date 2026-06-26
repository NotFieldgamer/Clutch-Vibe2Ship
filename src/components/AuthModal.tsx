import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Shield, 
  Sparkles, 
  Mail, 
  Lock, 
  ArrowRight, 
  Chrome, 
  UserPlus, 
  LogIn,
  AlertCircle
} from "lucide-react";
import { 
  auth, 
  loginWithGoogle, 
  loginAnonymously 
} from "../lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill out all fields.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error("Email authentication failed:", err);
      // Friendly messages for common Firebase error codes
      if (err.code === "auth/email-already-in-use") {
        setError("This email address is already in use.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password combination.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email format.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      setError("Google Sign-In was blocked or cancelled. Try Guest Sync or Email.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginAnonymously();
      onClose();
    } catch (err: any) {
      console.error("Guest sign in failed:", err);
      setError("Failed to initialize Guest Account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />

      {/* Dialog container */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl"
      >
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mt-4 mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3.5 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-display text-slate-100 tracking-wide">
            Link Your Clutch Workspace
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
            Sync dynamic rescue actions, generated deliverables, and scheduling logs across devices.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl text-sm font-semibold bg-white text-slate-900 hover:bg-slate-50 transition-all font-mono uppercase tracking-wider cursor-pointer disabled:opacity-50 shadow-lg shadow-white/5"
          >
            <Chrome className="w-4 h-4 text-rose-600" />
            <span>Continue with Google</span>
          </button>

          {/* Guest Sign In */}
          <button
            onClick={handleGuestSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all font-mono uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Instant Guest Sync</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className="relative bg-slate-900 px-3 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Or Use Account
          </span>
        </div>

        {/* Email Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 text-sm focus:border-indigo-500/50 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 text-sm focus:border-indigo-500/50 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 text-white transition-all font-mono uppercase tracking-wider cursor-pointer disabled:opacity-50 mt-2 shadow-lg shadow-indigo-500/20"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Sync Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Authenticate Account</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="text-center mt-5">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
          >
            {isSignUp ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
