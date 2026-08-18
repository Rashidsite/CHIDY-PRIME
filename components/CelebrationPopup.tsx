'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CelebrationPopupProps {
  isVisible: boolean;
  userName: string;
}

const EMOJIS = ['🎉', '🎊', '🥳', '🎮', '⭐', '🔥', '💫', '🎯', '🏆', '✨'];

export default function CelebrationPopup({ isVisible, userName }: CelebrationPopupProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          {/* Floating emoji particles */}
          {EMOJIS.map((emoji, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60, x: (Math.random() - 0.5) * 300, scale: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [60, -80 - Math.random() * 120],
                x: [(Math.random() - 0.5) * 300, (Math.random() - 0.5) * 400],
                scale: [0, 1.4, 1, 0.5],
                rotate: [0, Math.random() * 360],
              }}
              transition={{
                duration: 2.5,
                delay: i * 0.12,
                ease: 'easeOut',
              }}
              className="absolute text-4xl select-none"
              style={{ left: `${20 + (i * 7)}%`, bottom: '30%' }}
            >
              {emoji}
            </motion.div>
          ))}

          {/* Main popup card */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
            className="relative mx-4 max-w-xs w-full rounded-3xl text-center overflow-hidden pointer-events-auto"
            style={{
              background: 'linear-gradient(135deg, #000 0%, #0a1a12 100%)',
              border: '2px solid #10b981',
              boxShadow: '0 0 60px rgba(16,185,129,0.6), 0 0 120px rgba(16,185,129,0.2)',
            }}
          >
            {/* Glowing top strip */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #10b981, #34d399, #10b981)' }} />

            <div className="px-6 py-8">
              {/* Big emoji */}
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-6xl mb-4 block"
              >
                🎉
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-black text-white uppercase tracking-tight leading-tight"
              >
                Hongera, {userName}! 🏆
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="text-sm text-emerald-400 font-semibold mt-3 leading-relaxed"
              >
                Umefanikiwa kujisajili! 🎮<br />
                Sasa una ufikiaji kamili wa games zote! ✨
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-2 mt-5 px-4 py-2 rounded-full mx-auto w-fit"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)' }}
              >
                <span className="text-lg">🚀</span>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Welcome to Chidy Prime!</span>
                <span className="text-lg">🇹🇿</span>
              </motion.div>
            </div>

            {/* Glowing bottom strip */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #10b981, #34d399, #10b981)' }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
