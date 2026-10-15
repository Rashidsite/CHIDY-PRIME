'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Gamepad2, ChevronRight, ChevronLeft, Trophy, ArrowRight, Sparkles } from 'lucide-react';
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

// ── Single Category Slider Row ──
function CategoryRow({
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

  const updateScrollBoundaries = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const clientWidth = carouselRef.current.clientWidth || 300;
    const delta = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
    carouselRef.current.scrollBy({
      left: delta,
      behavior: 'smooth',
    });
    setTimeout(updateScrollBoundaries, 350);
  };

  // Kikomo cha michezo 8 kwa kila slide kama alivyoomba mteja
  const displayGames = games.slice(0, 8);
  const totalCount = games.length;
  const catName = category.name || 'Category';

  const isSquad =
    catName.toLowerCase().includes('efootball') ||
    catName.toLowerCase().includes('vikosi') ||
    catName.toLowerCase().includes('football');

  return (
    <div className="w-full space-y-4">
      {/* Category Header Bar */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
        {/* Left: Icon + Title + Count */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              isSquad ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' : 'bg-blue-600'
            }`}
          >
            {isSquad ? <Trophy className="w-5 h-5 text-white" /> : <Gamepad2 className="w-5 h-5 text-white" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-black text-white tracking-tight uppercase leading-tight truncate">
              {catName}
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-400 font-bold mt-0.5 truncate">
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
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-500 transition-all duration-200 flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer touch-manipulation"
            title={`Angalia michezo yote ya ${catName}`}
          >
            <span>Angalia Zote</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-[10px] font-bold">
              {totalCount}
            </span>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Navigation Arrows for desktop */}
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`w-9 h-9 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center transition-all shadow-sm ${
                canScrollLeft
                  ? 'text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer active:scale-90'
                  : 'text-slate-600 opacity-30 pointer-events-none cursor-not-allowed'
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`w-9 h-9 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center transition-all shadow-sm ${
                canScrollRight
                  ? 'text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer active:scale-90'
                  : 'text-slate-600 opacity-30 pointer-events-none cursor-not-allowed'
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Slider Track (Touch-swipe & Smooth-scroll) */}
      <div
        ref={carouselRef}
        onScroll={updateScrollBoundaries}
        className="category-slider-track flex gap-4 sm:gap-5 overflow-x-auto py-2 px-1 snap-x snap-mandatory touch-pan-x no-scrollbar"
        style={{ overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {displayGames.map((game, idx) => (
          <div key={game?.id || idx} className="game-card-item w-[260px] sm:w-[280px] shrink-0 snap-start">
            <GameCard
              game={game}
              onBuyNow={onBuyNow}
              index={idx}
              isUnlocked={game?.id && unlockedGameIds ? unlockedGameIds.has(game.id) : false}
            />
          </div>
        ))}

        {/* Call to action "Angalia Zote" Card at the end of the 8 games */}
        <div
          onClick={() => onSelectCategory?.(catName)}
          className="w-[180px] sm:w-[220px] shrink-0 snap-start flex flex-col justify-center items-center p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-blue-950/40 border border-slate-800 hover:border-blue-500/60 shadow-lg text-center cursor-pointer group transition-all duration-300 active:scale-98 select-none"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-600 transition-all shadow-md">
            <ArrowRight className="w-6 h-6 text-blue-400 group-hover:text-white transition-colors" />
          </div>
          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
            Angalia Zote
          </span>
          <span className="text-[11px] text-blue-400 font-bold mt-1">
            {totalCount} {isSquad ? 'Vikosi' : 'Michezo'}
          </span>
          <span className="mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm group-hover:bg-blue-500 transition-colors">
            Fungua Orodha ➔
          </span>
        </div>

        {/* Spacer at the end */}
        <div className="w-4 sm:w-6 shrink-0" />
      </div>
    </div>
  );
}

// ── Main CategoryGrid Section ──
export default function CategoryGrid({
  categories = [],
  games = [],
  onSelectCategory,
  onBuyNow,
  unlockedGameIds,
}: CategoryGridProps) {
  // Panga michezo kulingana na Category zao
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
    (games || []).forEach((game) => {
      if (!game || !game.category) return;
      const gameCat = String(game.category).trim();
      const gameCatNorm = gameCat.toLowerCase().replace(/s$/i, '').trim();

      let matched = false;
      const keys = Object.keys(catMap);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key === gameCatNorm || key.includes(gameCatNorm) || gameCatNorm.includes(key)) {
          catMap[key].games.push(game);
          matched = true;
          break;
        }
      }

      // Kama game ina category mpya ambayo haipo kwenye catMap, itengenezee category yake papo hapo
      if (!matched && gameCatNorm) {
        catMap[gameCatNorm] = {
          category: {
            id: `cat-${gameCatNorm}`,
            name: gameCat,
            image_url: game.cover_image || '',
            game_count: 0,
            description: `Michezo ya ${gameCat}`,
          },
          games: [game],
        };
      }
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
    <section id="category-vault-section" className="w-full space-y-10 relative z-10 scroll-mt-24">
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
