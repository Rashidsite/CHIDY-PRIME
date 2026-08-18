'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Smartphone, Sparkles, CheckCircle2, Share2, PlusSquare, X } from 'lucide-react';
import { usePWA } from './PWAProvider';

interface InstallAppButtonProps {
  variant?: 'drawer' | 'navbar' | 'floating' | 'banner';
  className?: string;
  onInstalledCallback?: () => void;
}

export default function InstallAppButton({
  variant = 'drawer',
  className = '',
  onInstalledCallback,
}: InstallAppButtonProps) {
  const {
    isInstalled,
    isInstallable,
    installApp,
    isIOS,
    showIOSModal,
    setShowIOSModal,
  } = usePWA();

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await installApp();
    if (onInstalledCallback) onInstalledCallback();
  };

  // If already installed in standalone mode, show clean installed status
  if (isInstalled && variant === 'drawer') {
    return (
      <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-tight">App Imesakinishwa</h4>
            <p className="text-[10px] text-emerald-400 font-bold">Unatumia CHIDYPRIME App 🚀</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── VARIANT: DRAWER (Inside Navigation Menu) ── */}
      {variant === 'drawer' && (
        <div className={`p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-white uppercase tracking-tight">CHIDYPRIME App</h4>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[9px] font-black text-blue-400">PWA</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Pakua kwenye Android, iOS au PC</p>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          </div>

          <button
            onClick={handleClick}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 cursor-pointer pointer-events-auto touch-manipulation active:scale-[0.98]"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>📱 SAKINISHA APP (INSTALL)</span>
          </button>
        </div>
      )}

      {/* ── VARIANT: NAVBAR (Top Header Compact Button) ── */}
      {variant === 'navbar' && (
        <button
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/40 text-blue-400 text-xs font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all cursor-pointer pointer-events-auto touch-manipulation active:scale-[0.98] ${className}`}
          title="Install CHIDYPRIME App"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span>📱 INSTALL APP</span>
        </button>
      )}

      {/* ── VARIANT: BANNER (Hero or Footer CTA) ── */}
      {variant === 'banner' && (
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Install CHIDYPRIME App</span>
        </button>
      )}

      {/* ── MODAL: NON-INTRUSIVE INSTALLATION GUIDE (For iOS & Fallback) ── */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl space-y-5 text-center"
            >
              {/* Close Icon */}
              <button
                onClick={() => setShowIOSModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                <Smartphone className="w-7 h-7 text-blue-400" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Jinsi Ya Kusakinisha App 📱
                </h3>
                <p className="text-xs text-slate-400">
                  {isIOS
                    ? 'Kwenye iPhone / iPad yako (Safari), fuata hatua hizi mbili rahisi:'
                    : 'Kusakinisha kama App kwenye kifaa chako, fuata hatua hizi:'}
                </p>
              </div>

              {/* Step by step visual instructions */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-xs shrink-0">
                    1
                  </div>
                  <p className="text-xs text-slate-300">
                    Bonyeza kitufe cha <b>Share</b> <Share2 className="w-3.5 h-3.5 inline text-blue-400 ml-1" /> chini ya kivinjari chako.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-xs shrink-0">
                    2
                  </div>
                  <p className="text-xs text-slate-300">
                    Shuka chini kisha chagua <b>&quot;Add to Home Screen&quot;</b> <PlusSquare className="w-3.5 h-3.5 inline text-blue-400 ml-1" />.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider transition-all"
              >
                NIMELEWA, SAWA 👍
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
