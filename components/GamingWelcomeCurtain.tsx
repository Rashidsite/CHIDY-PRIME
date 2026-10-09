'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Sparkles, Flame, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

interface GamingWelcomeCurtainProps {
  isLoading?: boolean;
  minDisplayTimeMs?: number;
  onFinish?: () => void;
}

const GAMING_STATUS_STEPS = [
  { text: 'Inaandaa uwanja wako wa michezo...', icon: Gamepad2 },
  { text: 'Inapakia mods kali za Maleo na games zote...', icon: Flame },
  { text: 'Inakagua faili salama na viungo vya kupakua...', icon: ShieldCheck },
  { text: 'Kila kitu kiko tayari! Karibu uwanjani...', icon: Zap },
];

export default function GamingWelcomeCurtain({
  isLoading = false,
  minDisplayTimeMs = 1800,
  onFinish,
}: GamingWelcomeCurtainProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(15);
  const [statusStep, setStatusStep] = useState(0);

  const hasExitedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  const isLoadingRef = useRef(isLoading);
  const mountTimeRef = useRef(Date.now());

  // Keep refs up-to-date without triggering re-runs of the timer effect
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Guaranteed dismiss function - can never be cancelled by re-renders
  const triggerDismiss = useRef(() => {
    if (hasExitedRef.current) return;
    hasExitedRef.current = true;

    setProgress(100);
    setStatusStep(GAMING_STATUS_STEPS.length - 1);

    // Short pause so user sees 100% done, then animate curtain slide up
    setTimeout(() => {
      setVisible(false);
      // Wait for framer-motion exit animation (800ms) to complete before unmounting from parent
      setTimeout(() => {
        if (onFinishRef.current) {
          onFinishRef.current();
        }
      }, 850);
    }, 280);
  });

  // Dedicated self-contained timer that NEVER gets cancelled on refresh or re-render
  useEffect(() => {
    // 1. Progress smooth increment
    const progressTimer = setInterval(() => {
      if (hasExitedRef.current) {
        clearInterval(progressTimer);
        return;
      }
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const add = Math.floor(Math.random() * 8) + 4;
        return Math.min(prev + add, 95);
      });
    }, 90);

    // 2. Status message cycling
    const messageTimer = setInterval(() => {
      if (hasExitedRef.current) {
        clearInterval(messageTimer);
        return;
      }
      setStatusStep((prev) => (prev + 1) % (GAMING_STATUS_STEPS.length - 1));
    }, 450);

    // 3. Periodic check for completion:
    // Dismisses when minDisplayTimeMs has elapsed AND loading is done,
    // OR at absolute max limit (2400ms) to GUARANTEE it NEVER freezes on refresh!
    const checkCompletionTimer = setInterval(() => {
      const elapsed = Date.now() - mountTimeRef.current;
      const isPastMinTime = elapsed >= minDisplayTimeMs;
      const isPastHardLimit = elapsed >= 2400; // Hard fallback guarantee: never freeze!

      if (!hasExitedRef.current) {
        if ((isPastMinTime && !isLoadingRef.current) || isPastHardLimit) {
          clearInterval(checkCompletionTimer);
          clearInterval(progressTimer);
          clearInterval(messageTimer);
          triggerDismiss.current();
        }
      }
    }, 100);

    return () => {
      clearInterval(progressTimer);
      clearInterval(messageTimer);
      clearInterval(checkCompletionTimer);
    };
  }, [minDisplayTimeMs]);

  const handleSkipNow = () => {
    triggerDismiss.current();
  };

  const ActiveIcon = GAMING_STATUS_STEPS[statusStep]?.icon || Gamepad2;

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key="gaming-welcome-curtain"
          initial={{ opacity: 1, y: 0 }}
          exit={{
            opacity: 0,
            y: '-100%',
            transition: {
              duration: 0.75,
              ease: [0.77, 0, 0.175, 1], // Cinematic smooth curtain slide up
            },
          }}
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070b14] overflow-hidden select-none px-4 ${
            !visible ? 'pointer-events-none' : ''
          }`}
        >
          {/* Cyber Ambient Glowing Lights */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/30 via-slate-950/80 to-[#070b14] pointer-events-none" />

          {/* Futuristic Background Grid */}
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)`,
              backgroundSize: '36px 36px',
            }}
          />

          {/* Center Curtain Content */}
          <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center">
            {/* Top Brand Tag */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 backdrop-blur-md mb-6 shadow-lg shadow-cyan-500/10"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[11px] font-black tracking-widest text-cyan-300 uppercase">
                CHIDY GAMING • CHIDY PRIME
              </span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </motion.div>

            {/* Glowing Gaming Controller Emblem */}
            <motion.div
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: [0.95, 1.05, 0.95], rotate: [0, 2, -2, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="relative mb-6"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-600 p-[2px] shadow-2xl shadow-cyan-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-[#0a101f] rounded-[22px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10" />
                  <Gamepad2 className="w-12 h-12 sm:w-14 sm:h-14 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]" />
                </div>
              </div>

              {/* Pulsing Outer Rings */}
              <div className="absolute -inset-2 rounded-3xl border border-cyan-400/20 animate-ping pointer-events-none" />
            </motion.div>

            {/* Welcome Heading */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase mb-2"
            >
              KARIBU{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
                CHIDY GAMING
              </span>
            </motion.h1>

            {/* Subtitle / Intro Message */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-xs sm:text-sm text-slate-300 font-medium max-w-md mb-7 leading-relaxed"
            >
              Uwanja wako mkuu wa <span className="text-cyan-400 font-bold">Mods kali za Maleo</span>, Michezo ya PS, PC na Simu yenye ubora wa juu Tanzania.
            </motion.p>

            {/* Cyber Loading Progress Bar */}
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl shadow-black/50 mb-6">
              <div className="flex items-center justify-between text-xs font-semibold mb-2.5">
                <div className="flex items-center gap-2 text-cyan-300 min-h-[20px]">
                  <ActiveIcon className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span className="truncate max-w-[220px] sm:max-w-xs text-left">
                    {GAMING_STATUS_STEPS[statusStep]?.text}
                  </span>
                </div>
                <span className="font-mono text-cyan-400 font-bold text-xs">
                  {progress}%
                </span>
              </div>

              {/* Progress Track */}
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800/80">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 rounded-full relative overflow-hidden shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.15 }}
                >
                  {/* High speed shimmer highlight */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite]" />
                </motion.div>
              </div>
            </div>

            {/* Gaming Highlights Pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 font-medium mb-6"
            >
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
                🚌 Maleo Bus Mods
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
                🎮 PPSSPP & PC
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
                ⚡ Kasi ya Juu
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
                🛡️ 100% Salama
              </span>
            </motion.div>

            {/* Quick Skip Button */}
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              onClick={handleSkipNow}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900/60 cursor-pointer active:scale-95"
            >
              <span>Ingia Uwanjani Moja kwa Moja</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
