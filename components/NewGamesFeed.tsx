'use client';

import React, { useState, useMemo } from 'react';
import GameCard, { GameProduct } from './GameCard';
import { Flame, SlidersHorizontal, Search, Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface NewGamesFeedProps {
  games: GameProduct[];
  onBuyNow?: (game: GameProduct) => void;
  unlockedGameIds?: Set<string>;
  onBack?: () => void;
}

export default function NewGamesFeed({
  games = [],
  onBuyNow,
  unlockedGameIds = new Set(),
  onBack,
}: NewGamesFeedProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'price-asc' | 'price-desc'>('newest');
  const [search, setSearch] = useState('');

  // Filter ONLY live/active products (Admin Control Enforcement)
  const liveGames = useMemo(() => {
    const safeList = Array.isArray(games) ? games : [];
    return safeList.filter((g) => {
      if (!g) return false;
      const status = String(g.status || '').toLowerCase();
      if (status === 'draft' || status === 'archived' || status === 'hidden') return false;
      if ((g as any).is_active === false) return false;
      return true;
    });
  }, [games]);

  const filteredAndSortedGames = useMemo(() => {
    let list = [...liveGames];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          String(g?.title || '').toLowerCase().includes(q) ||
          String(g?.category || '').toLowerCase().includes(q) ||
          String(g?.description || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'price-asc') return (a?.price || 0) - (b?.price || 0);
      if (sortBy === 'price-desc') return (b?.price || 0) - (a?.price || 0);
      if (sortBy === 'rating') return (Number(b?.rating) || 0) - (Number(a?.rating) || 0);
      return String(b?.id || '').localeCompare(String(a?.id || ''));
    });

    return list;
  }, [liveGames, search, sortBy]);

  return (
    <div className="w-full space-y-6 pb-36">
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-black uppercase">Home</span>
            </button>
          )}

          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <Flame className="w-6 h-6 text-white fill-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight uppercase leading-none">
                🔥 Games Mpya (New Games Feed)
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-[9px] font-black text-blue-400 uppercase">
                Live Feed
              </span>
            </div>
            <p className="text-xs text-blue-400 font-bold mt-1">
              {filteredAndSortedGames.length} Michezo na Mods maalum zilizochaguliwa
            </p>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-48">
            <input
              type="text"
              placeholder="Tafuta game..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-bold"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400 hidden sm:inline" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="newest">Zilizowekwa Hivi Karibuni</option>
              <option value="rating">Rating ya Juu</option>
              <option value="price-asc">Bei: Chini Kwenda Juu</option>
              <option value="price-desc">Bei: Juu Kwenda Chini</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Uninterrupted Vertical Stream of Game Cards ── */}
      {filteredAndSortedGames.length === 0 ? (
        <div className="text-center py-20 px-4 bg-slate-900/40 rounded-3xl border border-slate-800">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-black text-white uppercase">Hakuna Michezo Iliyopatikana</h3>
          <p className="text-xs text-slate-400 mt-1">Jaribu kubadilisha neno la utafutaji.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {filteredAndSortedGames.map((game, idx) => (
            <div key={game.id || idx} className="relative group">
              <GameCard
                game={game}
                index={idx}
                onBuyNow={onBuyNow}
                isUnlocked={game.id ? unlockedGameIds.has(game.id) : false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
