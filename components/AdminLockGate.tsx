'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Lock, Eye, EyeOff, KeyRound, Zap, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface AdminLockGateProps {
  onUnlock: () => void;
}

export default function AdminLockGate({ onUnlock }: AdminLockGateProps) {
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        setSuccess(true);
        localStorage.setItem('cpcg_admin_session', data.token);
        localStorage.setItem('cpcg_admin_authenticated', 'true');
        
        // Short delay for high-tech success animation
        setTimeout(() => {
          onUnlock();
        }, 500);
      } else {
        setError(data.error || '❌ Nenosiri Sio Sahihi! Ufikiaji Umekataliwa.');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
      }
    } catch {
      // Offline / fallback verification for master PIN
      if (pin.trim() === '2025' || pin.trim() === '2005') {
        setSuccess(true);
        localStorage.setItem('cpcg_admin_session', 'local_authorized_' + Date.now());
        localStorage.setItem('cpcg_admin_authenticated', 'true');
        setTimeout(() => {
          onUnlock();
        }, 500);
      } else {
        setError('❌ Nenosiri Sio Sahihi! Ufikiaji Umekataliwa.');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050811] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* ── Background Cyber Glow Effects ── */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={
          isShaking
            ? {
                x: [-12, 12, -10, 10, -6, 6, -2, 2, 0],
                opacity: 1,
                scale: 1,
                y: 0,
              }
            : { opacity: 1, scale: 1, y: 0 }
        }
        transition={isShaking ? { duration: 0.5, ease: 'easeInOut' } : { type: 'spring', stiffness: 350, damping: 25 }}
        className="bg-[#0A0F1D]/90 border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(37,99,235,0.2)] backdrop-blur-xl max-w-md w-full relative z-10 space-y-6"
      >
        {/* ── Brand Cyber Badge ── */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>🔒 CHIDYPRIME HQ ADMIN VAULT</span>
          </div>

          <div className="relative w-16 h-16 mx-auto flex items-center justify-center mt-2">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 opacity-20 blur-md animate-pulse" />
            <div className="w-14 h-14 rounded-2xl bg-[#0F172A] border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-xl">
              {success ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400 animate-bounce" />
              ) : (
                <KeyRound className="w-7 h-7 text-blue-400" />
              )}
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              Ulinzi wa Mfumo wa Admin
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
              Weka Master PIN/Password ili kufungua Dashibodi ya Kudhibiti Duka.
            </p>
          </div>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-300 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
              <span>Master Admin PIN / Password</span>
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                required
                placeholder="****"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full bg-[#111827]/90 border border-slate-700/90 focus:border-cyan-400 rounded-2xl px-4 py-3.5 text-base text-center font-mono font-black text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all tracking-[0.3em]"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ── Error Shake Feedback ── */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
            >
              <span>{error}</span>
            </motion.div>
          )}

          {/* ── Action Button ── */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 hover:scale-[1.02] active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Inathibitisha Ufikiaji...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Imefunguliwa! Kuingia HQ...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white text-white" />
                <span>FUNGUA ADMIN HQ</span>
              </>
            )}
          </button>
        </form>

        {/* ── Back to Storefront Link ── */}
        <div className="pt-2 border-t border-slate-800/80 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors py-2 px-3 rounded-xl hover:bg-slate-800/40 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Rudi Kwenye Duka (Storefront)</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
