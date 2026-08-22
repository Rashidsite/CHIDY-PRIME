'use client';

import React, { useState, useMemo, useEffect } from 'react';
import GameCard, { GameProduct } from './GameCard';
import { Search, ArrowLeft, SlidersHorizontal, Sparkles, Flame, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameCatalogProps {
  games: GameProduct[];
  categories?: any[];
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
  categories = [],
  searchQuery = '',
  onBuyNow,
  fixedCategory = null,
  onBack,
  unlockedGameIds = new Set(),
  unlockedProductIds = [],
  isUnlocked,
}: GameCatalogProps) {
  const [selectedPill, setSelectedPill] = useState<string>(fixedCategory || 'ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'rating'>('newest');

  // Sync fixedCategory if passed as prop
  useEffect(() => {
    if (fixedCategory) {
      setSelectedPill(fixedCategory);
    }
  }, [fixedCategory]);

  // Listen to external navigation events (e.g. from Mobile Bottom Nav)
  useEffect(() => {
    const handleOpenCatalog = (e: any) => {
      const cat = e?.detail?.category || 'ALL';
      setSelectedPill(cat);
      if (typeof window !== 'undefined') {
        const el = document.getElementById('catalog');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    window.addEventListener('cpcg_open_all_games', handleOpenCatalog);
    return () => {
      window.removeEventListener('cpcg_open_all_games', handleOpenCatalog);
    };
  }, []);

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

  // Build dynamic category pill list
  const categoryPills = useMemo(() => {
    const pillList: { id: string; label: string; count: number }[] = [
      { id: 'ALL', label: 'ZOTE (ALL)', count: liveGames.length },
    ];

    const safeCats = Array.isArray(categories) ? categories : [];
    
    // Extract unique category names from categories prop or existing live games
    const catMap = new Map<string, number>();
    
    safeCats.forEach((c) => {
      const name = typeof c === 'string' ? c : c?.name;
      if (name && !catMap.has(name)) {
        catMap.set(name, 0);
      }
    });

    liveGames.forEach((g) => {
      if (g?.category) {
        const gc = String(g.category).trim();
        let matched = false;
        for (const catName of Array.from(catMap.keys())) {
          const cClean = catName.toLowerCase().replace(/s$/i, '').trim();
          const gClean = gc.toLowerCase().replace(/s$/i, '').trim();
          if (cClean === gClean || cClean.includes(gClean) || gClean.includes(cClean)) {
            catMap.set(catName, (catMap.get(catName) || 0) + 1);
            matched = true;
            break;
          }
        }
        if (!matched && !catMap.has(gc)) {
          catMap.set(gc, 1);
        }
      }
    });

    catMap.forEach((count, name) => {
      pillList.push({
        id: name,
        label: name,
        count,
      });
    });

    return pillList;
  }, [categories, liveGames]);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let result = [...liveGames];

    // Filter by selected category pill
    if (selectedPill && selectedPill !== 'ALL') {
      const fc = selectedPill.toLowerCase().replace(/s$/i, '').trim();
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
  }, [liveGames, selectedPill, searchQuery, sortBy]);

  const checkUnlocked = (id: string) => {
    if (!id) return false;
    if (unlockedGameIds && unlockedGameIds.has(id)) return true;
    if (unlockedProductIds && unlockedProductIds.includes(id)) return true;
    if (isUnlocked && isUnlocked(id)) return true;
    return false;
  };

  return (
    <section id="catalog" className="w-full space-y-5 scroll-mt-24">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <motion.button
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.92 }}
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600/30 transition-all shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] font-black uppercase tracking-wider hidden sm:inline">Rudi</span>
            </motion.button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
              <Flame className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight uppercase truncate leading-tight">
                {searchQuery ? `Matokeo: "${searchQuery}"` : '🎮 All Games & Master Vault'}
              </h2>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">
                {filteredGames.length} Michezo Inayopatikana Live
              </p>
            </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="newest">Zilizowekwa Hivi Karibuni</option>
            <option value="rating">Rating ya Juu (Top Rated)</option>
            <option value="price-asc">Bei: Chini Kwenda Juu</option>
            <option value="price-desc">Bei: Juu Kwenda Chini</option>
          </select>
        </div>
      </div>

      {/* Dynamic In-View Horizontal Pill-Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto py-1.5 px-0.5 no-scrollbar touch-pan-x">
        {categoryPills.map((pill) => {
          const isSelected = selectedPill.toLowerCase() === pill.id.toLowerCase();
          return (
            <button
              key={pill.id}
              onClick={() => setSelectedPill(pill.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer touch-manipulation ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400 scale-[1.02]'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span>{pill.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-950 text-blue-400 border border-slate-800'
                }`}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of games */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/50 rounded-3xl border border-slate-800">
          <Search className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-black text-white uppercase">Hakuna Michezo Iliyopatikana</h3>
          <p className="text-xs text-slate-200 mt-1 max-w-sm mx-auto font-normal">
            Hakuna matokeo kwa kategoria au utafutaji uliochagua. Jaribu kuchagua "ZOTE" au kategoria nyingine.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {filteredGames.map((game, idx) => (
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
