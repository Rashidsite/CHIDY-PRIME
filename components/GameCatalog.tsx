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
  fixedCategory?: string | null;
  onBack?: () => void;
  unlockedGameIds?: Set<string>;
  unlockedProductIds?: string[];
  isUnlocked?: (productId: string) => boolean;
}

export default function GameCatalog({
  games = [],
  searchQuery = '',
  onBuyNow,
  fixedCategory = null,
  onBack,
  unlockedGameIds = new Set(),
  unlockedProductIds = [],
  isUnlocked,
}: GameCatalogProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'rating'>('newest');

  const safeGames = Array.isArray(games) ? games : [];

  const filteredGames = useMemo(() => {
    let result = [...safeGames];

    // Filter by fixed category if in drill-down mode
    if (fixedCategory && fixedCategory !== 'ALL') {
      const fc = fixedCategory.toLowerCase().replace(/s$/i, '').trim();
      result = result.filter((g) => {
        if (!g?.category) return false;
        const gc = String(g.category).toLowerCase().replace(/s$/i, '').trim();
        return gc === fc || gc.includes(fc) || fc.includes(gc);
      });
    }

    // Global search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          String(g?.title || '').toLowerCase().includes(q) ||
          String(g?.category || '').toLowerCase().includes(q) ||
          String(g?.description || '').toLowerCase().includes(q) ||
          (Array.isArray(g?.tags) && g.tags.some((t) => String(t || '').toLowerCase().includes(q)))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'price-asc') return (a?.price || 0) - (b?.price || 0);
      if (sortBy === 'price-desc') return (b?.price || 0) - (a?.price || 0);
      if (sortBy === 'rating') return (Number(b?.rating) || 0) - (Number(a?.rating) || 0);
      return String(b?.id || '').localeCompare(String(a?.id || ''));
    });

    return result;
  }, [safeGames, fixedCategory, searchQuery, sortBy]);

  const checkUnlocked = (id: string) => {
    if (!id) return false;
    if (unlockedGameIds && unlockedGameIds.has(id)) return true;
    if (unlockedProductIds && unlockedProductIds.includes(id)) return true;
    if (isUnlocked && isUnlocked(id)) return true;
    return false;
  };

  return (
    <section id="catalog" className="w-full space-y-5">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-4 rounded-2xl bg-black border-2 border-emerald-500/60 backdrop-blur-2xl shadow-[0_0_20px_rgba(16,185,129,0.25)]">
        <div className="flex items-center gap-3 min-w-0">
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

          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] shrink-0" />
            <h2 className="text-xs sm:text-base font-black text-white tracking-tight uppercase truncate">
              {searchQuery ? `Search: "${searchQuery}"` : fixedCategory ? fixedCategory : 'Games Catalog'}
            </h2>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-900/90 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 focus:outline-none focus:border-emerald-400 transition-colors"
          >
            <option value="newest">Newest</option>
            <option value="rating">Top Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Grid of games */}
      {(filteredGames ?? []).length === 0 ? (
        <div className="text-center py-16 px-4 bg-zinc-950/60 rounded-3xl border border-zinc-800">
          <Search className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-black text-white uppercase">Hakuna Michezo Iliyopatikana</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Hakuna matokeo kwa vigezo ulivyochagua. Jaribu kubadilisha jina au kategoria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {(filteredGames ?? []).map((game, idx) => (
            <GameCard
              key={game?.id || idx}
              game={game}
              index={idx}
              onBuyNow={onBuyNow}
              isUnlocked={game?.id ? checkUnlocked(game.id) : false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
