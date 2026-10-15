'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Gamepad2, ChevronRight, ChevronLeft, Trophy, ArrowRight } from 'lucide-react';
import GameCard, { GameProduct } from '@/components/GameCard';

export interface CategoryItem {
  id: string;
  name: string;
  image_url?: string;
  game_count?: number;
  description?: string;
  badge_text?: string;
}

interface CategoryGridProps {
  categories?: CategoryItem[];
  games?: GameProduct[];
  selectedCategory?: string;
  onSelectCategory?: (categoryName: string) => void;
  onRegisterClick?: () => void;
  isRegistered?: boolean;
  onBuyNow?: (game: GameProduct) => void;
  unlockedGameIds?: Set<string>;
}

// ── Single Category Slider Row (Memoized & Hardware-Accelerated) ──
const CategoryRow = React.memo(function CategoryRow({
  category,
  games,
  onBuyNow,
  unlockedGameIds,
  onSelectCategory,
}: {
  category: CategoryItem;
  games: GameProduct[];
  onBuyNow?: (game: GameProduct) => void;
  unlockedGameIds?: Set<string>;
  onSelectCategory?: (categoryName: string) => void;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced boundary check to NEVER block touch or scroll gestures
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) return;
    scrollTimeoutRef.current = setTimeout(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        setCanScrollLeft(scrollLeft > 15);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 15);
      }
      scrollTimeoutRef.current = null;
    }, 120);
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const clientWidth = carouselRef.current.clientWidth || 300;
    const delta = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
    carouselRef.current.scrollBy({
      left: delta,
      behavior: 'smooth',
    });
    setTimeout(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        setCanScrollLeft(scrollLeft > 15);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 15);
      }
    }, 350);
  }, []);

  // Kikomo cha michezo 8 kwa kila slide
  const displayGames = useMemo(() => games.slice(0, 8), [games]);
  const totalCount = games.length;
  const catName = category.name || 'Category';

  const isSquad = useMemo(() => {
    const lower = catName.toLowerCase();
    return lower.includes('efootball') || lower.includes('vikosi') || lower.includes('football');
  }, [catName]);

  return (
    <div 
      className="w-full space-y-3.5 transform-gpu"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 340px' }}
    >
      {/* Category Header Bar */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-md">
        {/* Left: Icon + Title + Count */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isSquad ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' : 'bg-blue-600'
            }`}
          >
            {isSquad ? <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-black text-white tracking-tight uppercase leading-tight truncate">
              {catName}
            </h2>
            <p className="text-[10px] sm:text-xs text-blue-400 font-bold mt-0.5 truncate">
              {category.description ||
                `${totalCount} ${
                  isSquad
                    ? totalCount === 1
                      ? 'Kikosi Kinapatikana'
                      : 'Vikosi Vinapatikana'
                    : totalCount === 1
                    ? 'Mchezo Unapatikana'
                    : 'Michezo Inapatikana'
                }`}
            </p>
          </div>
        </div>

        {/* Right: "Angalia Zote" button + Arrows */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onSelectCategory?.(catName)}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-500 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer touch-manipulation"
            title={`Angalia michezo yote ya ${catName}`}
          >
            <span>Angalia Zote</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-[9px] sm:text-[10px] font-bold">
              {totalCount}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Navigation Arrows for desktop */}
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`w-8 h-8 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center transition-opacity shadow-sm ${
                canScrollLeft
                  ? 'text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer active:scale-90'
                  : 'text-slate-600 opacity-20 pointer-events-none cursor-not-allowed'
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`w-8 h-8 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center transition-opacity shadow-sm ${
                canScrollRight
                  ? 'text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer active:scale-90'
                  : 'text-slate-600 opacity-20 pointer-events-none cursor-not-allowed'
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Slider Track: High Performance, Zero Sticky Drag */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="category-slider-track flex gap-3.5 sm:gap-4 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          contain: 'layout style',
        }}
      >
        {displayGames.map((game, idx) => (
          <div 
            key={game?.id || idx} 
            className="game-card-item w-[250px] sm:w-[275px] shrink-0"
            style={{ contain: 'layout style paint' }}
          >
            <GameCard
              game={game}
              onBuyNow={onBuyNow}
              index={idx}
              isUnlocked={game?.id && unlockedGameIds ? unlockedGameIds.has(game.id) : false}
            />
          </div>
        ))}

        {/* Call to action "Angalia Zote" Card at the end */}
        <div
          onClick={() => onSelectCategory?.(catName)}
          className="w-[170px] sm:w-[210px] shrink-0 flex flex-col justify-center items-center p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-blue-950/40 border border-slate-800 hover:border-blue-500/60 shadow-md text-center cursor-pointer group transition-colors duration-200 select-none active:scale-95 touch-manipulation"
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-blue-600 transition-all shadow-sm">
            <ArrowRight className="w-5 h-5 text-blue-400 group-hover:text-white transition-colors" />
          </div>
          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
            Angalia Zote
          </span>
          <span className="text-[11px] text-blue-400 font-bold mt-1">
            {totalCount} {isSquad ? 'Vikosi' : 'Michezo'}
          </span>
          <span className="mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm group-hover:bg-blue-500 transition-colors">
            Fungua List ➔
          </span>
        </div>

        {/* Spacer */}
        <div className="w-3 shrink-0" />
      </div>
    </div>
  );
});

// ── Main CategoryGrid Section ──
export default function CategoryGrid({
  categories = [],
  games = [],
  onSelectCategory,
  onBuyNow,
  unlockedGameIds,
}: CategoryGridProps) {
  // Panga michezo kulingana na Category zao (Memoized)
  const categoryGroups = useMemo(() => {
    const activeCats = Array.isArray(categories) && categories.length > 0 ? categories : [];
    const catMap: Record<string, { category: CategoryItem; games: GameProduct[] }> = {};

    // 1. Sajili kwanza categories zilizopo kwenye database/CMS
    activeCats.forEach((cat) => {
      const norm = (cat.name || '').toLowerCase().replace(/s$/i, '').trim();
      if (norm) {
        catMap[norm] = { category: cat, games: [] };
      }
    });

    // 2. Weka kila game kwenye category yake
    // 2. Weka kila game kwenye category yake inayolingana
    (games || []).forEach((game) => {
      if (!game || !game.category) return;
      const gameCat = String(game.category).trim();
      const gameCatNorm = gameCat.toLowerCase().replace(/s$/i, '').trim();

      const keys = Object.keys(catMap);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const isLiveTvMatch =
          (gameCatNorm.replace(/_/g, ' ') === key.replace(/_/g, ' ')) ||
          (gameCatNorm.includes('live') && key.includes('live'));
        const isVideoMatch =
          (gameCatNorm === 'video' && key.includes('video')) ||
          (key === 'video' && gameCatNorm.includes('video'));

        if (
          key === gameCatNorm ||
          key.includes(gameCatNorm) ||
          gameCatNorm.includes(key) ||
          isLiveTvMatch ||
          isVideoMatch
        ) {
          catMap[key].games.push(game);
          break;
        }
      }

      // STRICT CMS VISIBILITY ENFORCEMENT:
      // If a category is marked IMEJIFICHA in Admin CMS or not approved,
      // it will NOT be in catMap, and will NOT spawn a rogue slider on storefront!
    });

    // 3. Onyesha zile tu zenye angalau mchezo 1
    const allGroups = Object.keys(catMap).map((k) => catMap[k]);
    return allGroups
      .filter((group) => group.games.length > 0)
      .map((group) => ({
        category: {
          ...group.category,
          game_count: group.games.length,
        },
        games: group.games,
      }));
  }, [categories, games]);

  if (categoryGroups.length === 0) {
    return null;
  }

  return (
    <section id="category-vault-section" className="w-full space-y-8 sm:space-y-10 relative z-10 scroll-mt-24">
      {categoryGroups.map(({ category, games: catGames }) => (
        <CategoryRow
          key={category.id || category.name}
          category={category}
          games={catGames}
          onBuyNow={onBuyNow}
          unlockedGameIds={unlockedGameIds}
          onSelectCategory={onSelectCategory}
        />
      ))}
    </section>
  );
}
