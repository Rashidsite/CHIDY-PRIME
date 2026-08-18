'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, Star, AlertCircle, Zap } from 'lucide-react';
import { GameProduct } from './GameCard';
import { formatCurrency } from '@/lib/utils';

interface CategoryGamesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string | null;
  games: GameProduct[];
  onBuyNow: (game: GameProduct) => void;
  unlockedGameIds?: Set<string>;
}

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxMCI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjMGUxNzJhIi8+PC9zdmc+';

export default function CategoryGamesDrawer({
  isOpen,
  onClose,
  categoryName,
  games,
  onBuyNow,
  unlockedGameIds = new Set(),
}: CategoryGamesDrawerProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'rating'>('newest');

  const filteredAndSortedGames = useMemo(() => {
    if (!categoryName) return [];

    const fc = categoryName.toLowerCase().replace(/s$/i, '').trim();
    let result = games.filter((g) => {
      if (!g.category) return false;
      const gc = g.category.toLowerCase().replace(/s$/i, '').trim();
      return gc === fc || gc.includes(fc) || fc.includes(gc);
    });

    result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return b.id.localeCompare(a.id);
    });

    return result;
  }, [categoryName, games, sortBy]);

  return (
    <AnimatePresence>
      {isOpen && categoryName && (
        <div className="fixed inset-0 z-[9999]">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer touch-manipulation"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-[10000] w-full max-w-2xl bg-[#0F172A] border-l border-slate-800 shadow-2xl h-full flex flex-col justify-between"
          >
            {/* Header section */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0F172A]">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-6 rounded-full bg-blue-600" />
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                    {categoryName}
                  </h2>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">
                    {filteredAndSortedGames.length} Available Games
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 flex items-center justify-center hover:text-white hover:bg-slate-800 transition-all cursor-pointer touch-manipulation"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Sort bar */}
            <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span className="text-[11px] font-black uppercase text-slate-300 tracking-wider">
                  Panga Kwa:
                </span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer touch-manipulation"
              >
                <option value="newest">Zilizowekwa Hivi Karibuni</option>
                <option value="price-asc">Bei: Chini Kwenda Juu</option>
                <option value="price-desc">Bei: Juu Kwenda Chini</option>
                <option value="rating">Rating ya Juu</option>
              </select>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950">
              {filteredAndSortedGames.length > 0 ? (
                filteredAndSortedGames.map((game, idx) => {
                  const isFree = game.price === 0;
                  const isUnlocked = unlockedGameIds.has(game.id) || isFree;
                  return (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="group flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-[#0F172A] border border-slate-800/80 hover:border-blue-600/40 transition-all interactive-card"
                    >
                      {/* Image Thumbnail */}
                      <div className="relative w-full sm:w-36 aspect-[16/10] sm:aspect-square rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                        <Image
                          src={game.cover_image}
                          alt={game.title}
                          fill
                          quality={95}
                          unoptimized={Boolean(game.cover_image && (game.cover_image.includes('ibb.co') || game.cover_image.includes('images.unsplash.com')))}
                          placeholder="blur"
                          blurDataURL={BLUR_DATA_URL}
                          sizes="(max-width: 640px) 100vw, 150px"
                          className="object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                          loading="lazy"
                        />
                      </div>

                      {/* Detail Info */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-400 border border-blue-600/20 text-[9px] font-black uppercase tracking-wider">
                              {game.category}
                            </span>
                            {game.rating && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                <span>{game.rating}</span>
                              </div>
                            )}
                          </div>
                          <h3 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors uppercase leading-snug tracking-tight truncate">
                            {game.title}
                          </h3>
                          {game.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                              {game.description}
                            </p>
                          )}
                        </div>

                        {/* Price and CTAs */}
                        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-3 sm:mt-0">
                          <div>
                            <span className="text-[8px] font-bold text-slate-500 uppercase block tracking-wider">
                              BEI YA GAME
                            </span>
                            <span className="text-sm font-extrabold text-white">
                              {isFree ? (
                                <span className="text-emerald-400 font-black">BURE / FREE</span>
                              ) : (
                                formatCurrency(game.price)
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <motion.button
                              whileTap={{ scale: 0.94 }}
                              onClick={() => onBuyNow(game)}
                              className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider text-white ${
                                isUnlocked ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
                              } transition-all cursor-pointer shadow-md touch-manipulation`}
                            >
                              {isUnlocked ? '⬇ PAKUA LINK' : isFree ? 'DOWNLOAD GAME' : (game.category?.toLowerCase().includes('mod') || game.category?.toLowerCase().includes('bus') || game.category?.toLowerCase().includes('map')) ? '⚡ NUNUA MOD' : '⚡ NUNUA GAME'}
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      Hakuna Game Bado
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Kundi hili halina games kwa sasa. Tafadhali angalia tena baadae!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
