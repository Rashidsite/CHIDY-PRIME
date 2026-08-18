'use client';

import React, { useState, useMemo } from 'react';
import GameCard, { GameProduct } from './GameCard';
import { Filter, SlidersHorizontal, Search, Sparkles, Layers } from 'lucide-react';

interface GameCatalogProps {
  games: GameProduct[];
  categories?: string[];
  searchQuery?: string;
  onAddToCart?: (game: GameProduct) => void;
  onBuyNow?: (game: GameProduct) => void;
  unlockedProductIds?: string[];
  isUnlocked?: (productId: string) => boolean;
}

export default function GameCatalog({
  games,
  categories = ['ALL', 'MALEO BUS MODE TZ', 'MALEO MAP MODE TZ', 'PC Games', 'Mods', 'Action', 'Racing'],
  searchQuery = '',
  onAddToCart,
  onBuyNow,
  unlockedProductIds = [],
  isUnlocked,
}: GameCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'rating'>('newest');

  // Filter & Sort Logic
  const filteredGames = useMemo(() => {
    let result = [...games];

    // Category filter
    if (selectedCategory !== 'ALL') {
      result = result.filter(
        (g) => g.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Search query filter
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

    // Tag filter
    if (selectedTag) {
      result = result.filter((g) => g.tags?.includes(selectedTag));
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return b.id.localeCompare(a.id); // newest default
    });

    return result;
  }, [games, selectedCategory, searchQuery, selectedTag, sortBy]);

  return (
    <section id="catalog" className="w-full space-y-6">
      
      {/* Category Pills & Sorting Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-glass-border backdrop-blur-md">
        
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          <Layers className="w-4 h-4 text-brand-glow shrink-0 ml-1 hidden sm:block" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-glow'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-800 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="price-asc">Sort: Price Low to High</option>
            <option value="price-desc">Sort: Price High to Low</option>
            <option value="rating">Sort: Top Rated</option>
          </select>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>Digital Products & Games</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-glow border border-brand-500/30">
            {filteredGames.length} available
          </span>
        </h2>
      </div>

      {/* Games Grid */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGames.map((game, idx) => (
            <GameCard
              key={game.id}
              game={game}
              index={idx}
              isUnlocked={isUnlocked ? isUnlocked(game.id) : unlockedProductIds.includes(game.id)}
              onBuyNow={onBuyNow}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-3xl border border-glass-border text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No games found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">
            Try adjusting your search query or switching category filters.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setSelectedTag('');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}
    </section>
  );
}
