'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, Star, AlertCircle, Zap, Trophy, ZoomIn, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import { GameProduct, formatPlanDuration } from './GameCard';
import { formatCurrency } from '@/lib/utils';
import GameMediaThumbnail from './GameMediaThumbnail';
import SquadImageLightbox from './SquadImageLightbox';
import { parseSquadData } from '@/lib/efootball-squads';
import { isGameAccessActive } from '@/lib/access-duration';

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
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; strength?: string } | null>(null);

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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !categoryName) return null;

  return (
    <>
      <AnimatePresence>
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
            className="fixed inset-y-0 right-0 z-[10000] w-full max-w-2xl bg-[#0F172A] border-l border-slate-800 shadow-2xl h-full flex flex-col justify-between overscroll-contain"
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
                className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-800 bg-slate-900 text-slate-200 flex items-center justify-center hover:text-white hover:bg-slate-800 transition-all cursor-pointer touch-manipulation"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Sort bar */}
            <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider">
                  Panga Kwa:
                </span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 min-h-[44px] text-xs text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer touch-manipulation"
              >
                <option value="newest">Zilizowekwa Hivi Karibuni</option>
                <option value="price-asc">Bei: Chini Kwenda Juu</option>
                <option value="price-desc">Bei: Juu Kwenda Chini</option>
                <option value="rating">Rating ya Juu</option>
              </select>
            </div>

            {/* Content list */}
            <div 
              className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950 overscroll-contain pb-40"
              style={{ overscrollBehaviorY: 'contain', paddingBottom: '160px' }}
            >
              {filteredAndSortedGames.length > 0 ? (
                <>
                  {filteredAndSortedGames.map((game, idx) => {
                    const isSquad = 
                      categoryName?.toLowerCase().includes('efootball') || 
                      categoryName?.toLowerCase().includes('vikosi') || 
                      game.category?.toLowerCase().includes('efootball') || 
                      game.category?.toLowerCase().includes('vikosi');

                    if (isSquad) {
                      const squad = parseSquadData(game);
                      return (
                        <motion.div
                          key={game.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className={`group flex flex-col gap-4 p-4 sm:p-5 rounded-3xl bg-[#0F172A] border transition-all ${
                            squad.is_sold
                              ? 'border-rose-500/30 opacity-85'
                              : 'border-blue-500/30 hover:border-blue-500/60 shadow-xl'
                          }`}
                        >
                          {/* Full Uncropped Formation Banner with Pitch Backdrop */}
                          <div 
                            className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a1c38] via-[#051124] to-[#020712] border border-blue-500/20 group/img cursor-pointer flex items-center justify-center p-2"
                            onClick={() => setLightboxImage({ url: squad.cover_image, title: squad.title, strength: squad.team_strength })}
                          >
                            <Image
                              src={squad.cover_image}
                              alt={squad.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 600px"
                              className="object-contain transition-transform duration-500 group-hover/img:scale-[1.02]"
                            />

                            {/* Badges Over Image */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2.5 py-1 rounded-xl bg-blue-600/90 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-blue-400/40 shadow-md">
                                  ⚡ STRENGTH {squad.team_strength}
                                </span>
                                <span className="px-2.5 py-1 rounded-xl bg-indigo-600/90 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-indigo-400/40 shadow-md">
                                  ⚽ EFOOTBALL SQUAD
                                </span>
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md border shadow-md ${
                                  squad.is_sold
                                    ? 'bg-rose-500/90 text-white border-rose-400/40'
                                    : 'bg-emerald-500/90 text-white border-emerald-400/40'
                                }`}
                              >
                                {squad.is_sold ? 'SOLD OUT' : 'INAPATIKANA'}
                              </span>
                            </div>

                            {/* Bottom Overlay Hint */}
                            <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md text-[9px] font-black text-blue-300 border border-blue-500/30 uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <ZoomIn className="w-3 h-3" />
                              <span>Kuza Picha (Full HD)</span>
                            </div>
                          </div>

                          {/* Detail Info */}
                          <div className="flex-1 flex flex-col justify-between space-y-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase">
                                    🛡️ {squad.booster_coaches}
                                  </span>
                                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase">
                                    🔐 {squad.login_type}
                                  </span>
                                </div>
                                {squad.rating && (
                                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                    <span>{squad.rating}</span>
                                  </div>
                                )}
                              </div>

                              <Link href={`/games/${game.id}`} onClick={onClose} className="block group/title">
                                <h3 className="text-sm sm:text-base font-black text-white group-hover/title:text-blue-400 transition-colors uppercase leading-snug tracking-tight">
                                  {squad.title}
                                </h3>
                              </Link>

                              {squad.description && (
                                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-normal">
                                  {squad.description}
                                </p>
                              )}
                            </div>

                            {/* Price & Action Buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80 pt-3 mt-1">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">
                                  BEI YA KIKOSI
                                </span>
                                <span className="text-base sm:text-lg font-black text-emerald-400">
                                  {formatCurrency(squad.price)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/games/${game.id}`}
                                  onClick={onClose}
                                  className="min-h-[42px] px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation active:scale-[0.98]"
                                >
                                  <span>Tazama Ndani</span>
                                </Link>

                                {squad.is_sold ? (
                                  <div className="min-h-[42px] px-4 py-2.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 text-[11px] font-black uppercase tracking-wider flex items-center justify-center">
                                    SOLD OUT
                                  </div>
                                ) : (
                                  <a
                                    href={squad.redirect_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-h-[42px] px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider btn-gaming-glow shadow-lg shadow-blue-600/40 border border-blue-400/70 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer touch-manipulation"
                                  >
                                    <span className="icon-spark-pulse text-amber-300 text-xs">⚡</span>
                                    <span className="relative z-10">{(squad.button_text || '⚡ NUNUA KIKOSI').replace(/^⚡\s*/, '')}</span>
                                    <ArrowUpRight className="w-4 h-4 relative z-10" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    }

                    const isFree = game.price === 0;
                    const isUnlocked =
                      unlockedGameIds.has(game.id) ||
                      (game?.id ? isGameAccessActive(game.id, game.access_duration || game.license_duration) : false) ||
                      isFree;
                    return (
                      <motion.div
                        key={game.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="group flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-[#0F172A] border border-slate-800/80 hover:border-blue-600/40 transition-all interactive-card"
                      >
                        {/* Media Thumbnail */}
                        <div className="relative w-full sm:w-36 aspect-[16/10] sm:aspect-square rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                          <GameMediaThumbnail
                            coverImage={game.cover_image}
                            screenshots={game.screenshots}
                            videoUrl={game.video_url || game.youtube_url}
                            thumbnailType={game.thumbnail_type || 'auto'}
                            thumbnailFit={game.thumbnail_fit || (game as any).thumbnailFit || 'cover'}
                            title={game.title}
                            sizes="(max-width: 640px) 100vw, 150px"
                          />
                        </div>

                        {/* Detail Info */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-400 border border-blue-600/20 text-[9px] font-black uppercase tracking-wider">
                                  {game.category}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider">
                                  {formatPlanDuration(game.access_duration || game.license_duration || (game as any).plan_duration || (game as any).duration_days, isFree)}
                                </span>
                              </div>
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
                              <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed font-normal">
                                {game.description}
                              </p>
                            )}
                          </div>

                          {/* Price and CTAs */}
                          <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-3 sm:mt-0">
                            <div>
                              <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">
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
                              {(() => {
                                const btnTxt = isUnlocked ? '⬇ PAKUA LINK' : isFree ? 'DOWNLOAD GAME' : (game.category?.toLowerCase().includes('mod') || game.category?.toLowerCase().includes('bus') || game.category?.toLowerCase().includes('map')) ? '⚡ NUNUA MOD' : '⚡ NUNUA GAME';
                                const isBuy = !isUnlocked && !isFree;
                                return (
                                  <motion.button
                                    whileTap={{ scale: 0.94 }}
                                    onClick={() => onBuyNow(game)}
                                    className={`px-5 py-2.5 min-h-[44px] flex items-center justify-center gap-1 rounded-xl text-[11px] font-black uppercase tracking-wider text-white ${
                                      isUnlocked 
                                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 border border-emerald-400' 
                                        : isBuy
                                          ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 btn-gaming-glow shadow-lg shadow-blue-600/40 border border-blue-400/80'
                                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-md border border-emerald-400'
                                    } transition-all cursor-pointer touch-manipulation whitespace-nowrap`}
                                  >
                                    {btnTxt.startsWith('⚡') ? (
                                      <>
                                        <span className="icon-spark-pulse text-amber-300 text-xs">⚡</span>
                                        <span className="relative z-10">{btnTxt.replace(/^⚡\s*/, '')}</span>
                                      </>
                                    ) : btnTxt.startsWith('⬇') ? (
                                      <>
                                        <span className="mr-0.5">⬇</span>
                                        <span className="relative z-10">{btnTxt.replace(/^⬇\s*/, '')}</span>
                                      </>
                                    ) : (
                                      <span className="relative z-10">{btnTxt}</span>
                                    )}
                                  </motion.button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {/* Spacer to guarantee the last card button is 100% visible and clickable */}
                  <div className="h-28 w-full shrink-0" aria-hidden="true" />
                </>
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
      </AnimatePresence>

      {/* Fullscreen Uncropped Lightbox Zoom */}
      {lightboxImage && (
        <SquadImageLightbox
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          imageUrl={lightboxImage.url}
          title={lightboxImage.title}
          teamStrength={lightboxImage.strength}
        />
      )}
    </>
  );
}
