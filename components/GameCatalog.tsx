'use client';

import React, { useState, useMemo } from 'react';
import GameCard, { GameProduct } from './GameCard';
import { Search, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameCatalogProps {
  games: GameProduct[];
  categories?: string[];
  searchQuery?: string;
  onBuyNow?: (game: GameProduct) => void;
  onAddToCart?: (game: GameProduct) => void;
  /** If provided, catalog is locked to this category (drill-down mode) */
  fixedCategory?: string | null;
  /** Called when user wants to go back to categories */
  onBack?: () => void;
  unlockedGameIds?: Set<string>;
  unlockedProductIds?: string[];
  isUnlocked?: (productId: string) => boolean;
}

export default function GameCatalog({
  games,
  searchQuery = '',
  onBuyNow,
  fixedCategory = null,
  onBack,
  unlockedGameIds = new Set(),
  unlockedProductIds = [],
  isUnlocked,
}: GameCatalogProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'rating'>('newest');

  const filteredGames = useMemo(() => {
    let result = [...games];

    // Filter by fixed category if in drill-down mode
    if (fixedCategory && fixedCategory !== 'ALL') {
      const fc = fixedCategory.toLowerCase().replace(/s$/i, '').trim();
      result = result.filter((g) => {
        if (!g.category) return false;
        const gc = g.category.toLowerCase().replace(/s$/i, '').trim();
        return gc === fc || gc.includes(fc) || fc.includes(gc);
      });
    }

    // Global search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.category?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q) ||
          g.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return b.id.localeCompare(a.id);
    });

    return result;
  }, [games, fixedCategory, searchQuery, sortBy]);

  const checkUnlocked = (id: string) => {
    if (unlockedGameIds && unlockedGameIds.has(id)) return true;
    if (unlockedProductIds && unlockedProductIds.includes(id)) return true;
    if (isUnlocked && isUnlocked(id)) return true;
    return false;
  };

  return (
    <section id="catalog" className="w-full space-y-5">

      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-4 rounded-2xl bg-black border-2 border-emerald-500/60 backdrop-blur-2xl shadow-[0_0_20px_rgba(16,185,129,0.25)]">
        
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button — only in drill-down mode */}
          {onBack && (
            <motion.button
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.92 }}
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 transition-all shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] font-black uppercase tracking-wider hidden sm:inline">Back</span>
            </motion.button>
          )}

          {/* Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] shrink-0" />
            <h2 className="text-xs sm:text-base font-black text-white tracking-tight uppercase truncate">
              {fixedCategory ? `${fixedCategory}` : 'Digital Games & Mods'}
            </h2>
          </div>
        </div>

        {/* Right side: count + sort */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-black border border-emerald-500/40 uppercase tracking-wider whitespace-nowrap">
            {filteredGames.length} items
          </span>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400 shrink-0 hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-black border border-emerald-500/40 rounded-xl px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-white font-black focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Game Grid ── */}
      <AnimatePresence mode="wait">
        {filteredGames.length > 0 ? (
          <motion.div
            key={fixedCategory || 'all'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            {filteredGames.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                index={i}
                onBuyNow={onBuyNow}
                isUnlocked={checkUnlocked(game.id)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center p-12 bg-black/60 rounded-2xl border border-emerald-500/20 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">No products found</h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
              No games available in this category yet. Check back soon!
            </p>
            {onBack && (
              <button
                onClick={onBack}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Categories
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
