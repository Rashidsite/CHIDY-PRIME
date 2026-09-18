'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { X, ZoomIn, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SquadImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  teamStrength?: string;
}

export default function SquadImageLightbox({
  isOpen,
  onClose,
  imageUrl,
  title,
  teamStrength,
}: SquadImageLightboxProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-5xl max-h-[95vh] flex flex-col rounded-3xl bg-[#071326] border border-blue-500/30 shadow-[0_0_50px_rgba(37,99,235,0.3)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate max-w-xs sm:max-w-md">
                  {title}
                </h3>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                  <span>Picha Kamili Isiyokatwa (Full Formation HD)</span>
                  {teamStrength && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      ⚡ Strength: {teamStrength}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Funga picha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Full uncropped image viewport */}
          <div className="relative flex-1 min-h-[50vh] sm:min-h-[70vh] bg-gradient-to-b from-[#040e1d] via-[#020712] to-[#01040a] p-2 sm:p-4 flex items-center justify-center overflow-auto touch-pinch-zoom">
            <div className="relative w-full h-full min-h-[50vh] sm:min-h-[70vh] flex items-center justify-center">
              <Image
                src={imageUrl}
                alt={title}
                fill
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                priority
              />
            </div>
          </div>

          {/* Footer note */}
          <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800 text-center shrink-0">
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
              💡 Unaweza kuikuza picha (zoom) kwenye simu yako ili kusoma takwimu, majina ya wachezaji na makocha kwa uwazi zaidi.
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
