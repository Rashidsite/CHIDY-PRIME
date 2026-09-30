'use client';

import React from 'react';
import { Search, Flame, Sparkles, Gamepad2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface StorefrontSearchBarProps {
  onOpenSearch: (query?: string) => void;
  gameCount?: number;
}

const TRENDING_TAGS = [
  { label: '🔥 Hot Games', query: '' },
  { label: '🚌 Maleo Bus Mods', query: 'Maleo' },
  { label: '🚛 ETS 2 Mobile', query: 'ETS' },
  { label: '🏎️ Racing', query: 'Racing' },
  { label: '🎮 PPSSPP & PS2', query: 'PPSSPP' },
  { label: '💻 PC Games', query: 'PC' },
  { label: '🎁 Mods za Bure', query: 'Bure' },
];

export default function StorefrontSearchBar({
  onOpenSearch,
  gameCount = 0,
}: StorefrontSearchBarProps) {
  return (
    <section className="w-full">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 hover:border-blue-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(37,99,235,0.1)] transition-all p-4 sm:p-6 space-y-4">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header / Counter Bar */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>STORE YA GAMES & MODS</span>
              <span className="text-blue-400">TANZANIA</span>
            </span>
          </div>

          {gameCount > 0 && (
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
              {gameCount} Michezo Live
            </span>
          )}
        </div>

        {/* Interactive Search Bar Trigger */}
        <div
          onClick={() => onOpenSearch('')}
          className="relative z-10 flex items-center justify-between gap-3 p-2 sm:p-2.5 bg-slate-950/90 border border-slate-800 rounded-2xl hover:border-blue-500/70 hover:shadow-[0_0_25px_rgba(37,99,235,0.25)] transition-all cursor-pointer group touch-manipulation active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 pl-2 sm:pl-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Search className="w-4 h-4 group-hover:text-cyan-300 transition-colors" />
            </div>
            <span className="text-xs sm:text-sm text-slate-400 group-hover:text-slate-200 transition-colors truncate font-medium">
              Tafuta game lolote... <span className="hidden md:inline text-slate-500 font-normal">(mfano: Maleo Bus, ETS 2, FIFA, PC)</span>
            </span>
          </div>

          <button
            type="button"
            className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-600/30 shrink-0 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer touch-manipulation active:scale-[0.96]"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tafuta</span>
          </button>
        </div>

        {/* Trending Tags Chips */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto pt-1 pb-1 no-scrollbar touch-pan-x">
          <span className="text-[10px] font-black uppercase text-slate-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Haraka:</span>
          </span>

          {TRENDING_TAGS.map((t, idx) => (
            <button
              key={idx}
              onClick={() => onOpenSearch(t.query)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-blue-500/50 hover:bg-slate-800/90 transition-all whitespace-nowrap cursor-pointer shrink-0 touch-manipulation active:scale-[0.96]"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
