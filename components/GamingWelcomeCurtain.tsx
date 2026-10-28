'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, ArrowRight } from 'lucide-react';

interface GamingWelcomeCurtainProps {
  isLoading?: boolean;
  minDisplayTimeMs?: number;
  onFinish?: () => void;
}

const GAMING_STATUS_STEPS = [
  'Inaandaa uwanja wako wa michezo...',
  'Inapakia games na mods kali...',
  'Kila kitu kiko tayari...',
];

export default function GamingWelcomeCurtain({
  isLoading = false,
  minDisplayTimeMs = 1300,
  onFinish,
}: GamingWelcomeCurtainProps) {
  const [visible, setVisible] = useState(true);
  const [statusStep, setStatusStep] = useState(0);

  const hasExitedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  const isLoadingRef = useRef(isLoading);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const triggerDismiss = useRef(() => {
    if (hasExitedRef.current) return;
    hasExitedRef.current = true;

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('chidy_curtain_shown', 'true');
      }
    } catch {}

    setStatusStep(GAMING_STATUS_STEPS.length - 1);

    setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        if (onFinishRef.current) {
          onFinishRef.current();
        }
      }, 700);
    }, 200);
  });

  useEffect(() => {
    // 1. Status message cycling
    const messageTimer = setInterval(() => {
      if (hasExitedRef.current) {
        clearInterval(messageTimer);
        return;
      }
      setStatusStep((prev) => (prev + 1) % GAMING_STATUS_STEPS.length);
    }, 450);

    // 2. Completion check
    const checkCompletionTimer = setInterval(() => {
      const elapsed = Date.now() - mountTimeRef.current;
      const isPastMinTime = elapsed >= minDisplayTimeMs;
      const isPastHardLimit = elapsed >= 1800;

      if (!hasExitedRef.current) {
        if ((isPastMinTime && !isLoadingRef.current) || isPastHardLimit) {
          clearInterval(checkCompletionTimer);
          clearInterval(messageTimer);
          triggerDismiss.current();
        }
      }
    }, 80);

    return () => {
      clearInterval(messageTimer);
      clearInterval(checkCompletionTimer);
    };
  }, [minDisplayTimeMs]);

  const handleSkipNow = () => {
    triggerDismiss.current();
  };

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
              duration: 0.65,
              ease: [0.77, 0, 0.175, 1],
            },
          }}
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#060913] overflow-hidden select-none px-4 ${
            !visible ? 'pointer-events-none' : ''
          }`}
        >
          {/* Subtle Ambient Glows (Electric Blue & Emerald) */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/20 via-[#060913]/90 to-[#060913] pointer-events-none" />

          {/* Center Minimal Content */}
          <div className="relative z-10 max-w-sm w-full flex flex-col items-center text-center">
            {/* Glowing Gaming Controller Emblem */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: [1, 1.04, 1], opacity: 1 }}
              transition={{
                opacity: { duration: 0.4 },
                scale: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' },
              }}
              className="relative mb-6"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-400 to-emerald-400 p-[2px] shadow-2xl shadow-cyan-500/25 flex items-center justify-center">
                <div className="w-full h-full bg-[#0a101f] rounded-[22px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10" />
                  <Gamepad2 className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.7)]" />
                </div>
              </div>
            </motion.div>

            {/* Brand Title */}
            <motion.h1
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase mb-1.5"
            >
              CHIDY{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400">
                GAMING
              </span>
            </motion.h1>

            {/* Clean Subtitle */}
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide mb-2"
            >
              Uwanja Mkuu wa Michezo & Mods Tanzania
            </motion.p>

            {/* Option 3: Modern Pulse Dots & Equalizer */}
            <div className="flex items-center justify-center gap-2.5 my-6">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(34,211,238,0.85)]"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>

            {/* Dynamic Status Text */}
            <motion.p
              key={statusStep}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs font-semibold text-cyan-300/80 tracking-wide min-h-[18px]"
            >
              {GAMING_STATUS_STEPS[statusStep]}
            </motion.p>

            {/* Fast Skip Option */}
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={handleSkipNow}
              className="mt-6 inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-cyan-400 transition-colors py-1 px-3 rounded-full hover:bg-slate-900/60 cursor-pointer"
            >
              <span>Ingia Uwanjani</span>
              <ArrowRight className="w-3 h-3" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
