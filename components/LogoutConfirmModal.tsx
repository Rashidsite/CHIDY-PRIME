'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X, AlertTriangle } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-sm rounded-3xl bg-[#0D131F] border-2 border-slate-800 p-6 shadow-2xl space-y-5 text-center relative overflow-hidden"
        >
          {/* Top Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Warning Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
            <LogOut className="w-7 h-7" />
          </div>

          {/* Heading & Text */}
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Unataka Kutoka Kwenye Akaunti?
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Je, una uhakika unataka ku-logout kutoka <span className="text-white font-bold">CHIDYPRIME × CHIDYGAMING</span>?
            </p>
          </div>

          {/* Action Buttons: NDIO vs HAPANA */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={onClose}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all border border-slate-700 cursor-pointer shadow-sm"
            >
              HAPANA, BAKI
            </button>

            <button
              onClick={() => {
                onClose();
                onConfirm();
              }}
              className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>NDIO, ONDOKA</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
