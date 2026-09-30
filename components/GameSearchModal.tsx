'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Flame, 
  Gamepad2, 
  Star, 
  ShoppingCart, 
  CheckCircle2, 
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { GameProduct } from './GameCard';
import { formatCurrency } from '@/lib/utils';

interface GameSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: GameProduct[];
  onBuyNow?: (game: GameProduct) => void;
  unlockedGameIds?: Set<string>;
  initialQuery?: string;
}

const QUICK_FILTERS = [
  { id: 'ALL', label: 'ZOTE (ALL)' },
  { id: 'FREE', label: '🎁 BURE (FREE)' },
  { id: 'BUS', label: '🚌 MALEO BUS MODS' },
  { id: 'ETS', label: '🚛 ETS 2' },
  { id: 'PC', label: '💻 PC GAMES' },
  { id: 'UNDER_3K', label: '💰 CHINI YA 3,000' },
];

export default function GameSearchModal({
  isOpen,
  onClose,
  games = [],
  onBuyNow,
  unlockedGameIds = new Set(),
  initialQuery = '',
}: GameSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initial query when opened
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery || '');
      setSelectedFilter('ALL');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [isOpen, initialQuery]);

  // Lock background scroll when open
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

  // Global Keyboard shortcut: Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter live / active games
  const liveGames = useMemo(() => {
    return (games || []).filter((g) => {
      if (!g) return false;
      const status = String(g.status || '').toLowerCase();
      if (status === 'draft' || status === 'archived' || status === 'hidden') return false;
      if ((g as any).is_active === false) return false;
      return true;
    });
  }, [games]);

  // Popular / Trending games for initial suggestions
  const popularGames = useMemo(() => {
    return [...liveGames]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 4);
  }, [liveGames]);

  // Filtered Results
  const searchResults = useMemo(() => {
    let list = [...liveGames];

    // Quick filter chips
    if (selectedFilter === 'FREE') {
      list = list.filter((g) => g.price === 0);
    } else if (selectedFilter === 'BUS') {
      list = list.filter((g) => 
        (g.category && g.category.toLowerCase().includes('bus')) ||
        g.title.toLowerCase().includes('bus') ||
        g.title.toLowerCase().includes('maleo')
      );
    } else if (selectedFilter === 'ETS') {
      list = list.filter((g) => 
        (g.category && g.category.toLowerCase().includes('ets')) ||
        g.title.toLowerCase().includes('ets')
      );
    } else if (selectedFilter === 'PC') {
      list = list.filter((g) => 
        (g.category && g.category.toLowerCase().includes('pc')) ||
        (Array.isArray(g.tags) && g.tags.some((t) => String(t).toLowerCase().includes('pc'))) ||
        g.title.toLowerCase().includes('pc')
      );
    } else if (selectedFilter === 'UNDER_3K') {
      list = list.filter((g) => g.price > 0 && g.price <= 3000);
    }

    // Text search query
    const q = query.trim().toLowerCase();
    if (!q) {
      return selectedFilter === 'ALL' ? [] : list;
    }

    return list.filter((g) => {
      const matchTitle = g.title?.toLowerCase().includes(q);
      const matchCat = g.category?.toLowerCase().includes(q);
      const matchDesc = g.description?.toLowerCase().includes(q);
      const matchTags = Array.isArray(g.tags) && g.tags.some((t) => String(t).toLowerCase().includes(q));
      return matchTitle || matchCat || matchDesc || matchTags;
    });
  }, [liveGames, query, selectedFilter]);

  const isUnlocked = (id: string) => {
    return unlockedGameIds && unlockedGameIds.has(id);
  };

  const handleAction = (game: GameProduct, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onClose();
    if (onBuyNow) {
      onBuyNow(game);
    } else {
      router.push(`/games/${game.id}`);
    }
  };

  const handleOpenDetails = (game: GameProduct) => {
    onClose();
    router.push(`/games/${game.id}`);
  };

  const whatsappRequestUrl = useMemo(() => {
    const cleanQ = query.trim() || 'Game';
    const msg = `Habari CHIDYPRIME, nilikuwa natafuta game la "${cleanQ}" kwenye website lakini sijaliona. Naomba msaada au mliweke tafadhali!`;
    return `https://wa.me/255655361060?text=${encodeURIComponent(msg)}`;
  }, [query]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-start justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(37,99,235,0.15)] overflow-hidden my-4 sm:my-8 flex flex-col max-h-[88vh]"
        >
          {/* Top Bar with Search Input */}
          <div className="p-4 sm:p-5 border-b border-slate-800/90 bg-gradient-to-r from-slate-900/90 via-slate-900 to-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                <Search className="w-5 h-5 animate-pulse" />
              </div>

              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tafuta Maleo Bus, ETS 2, FIFA, PC, PPSSPP..."
                  className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl pl-4 pr-10 py-3 text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                />
                {query.length > 0 && (
                  <button
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title="Funga"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar touch-pan-x">
              {QUICK_FILTERS.map((f) => {
                const active = selectedFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-150 cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400 scale-[1.02]'
                        : 'bg-slate-950/90 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Case 1: Empty Query and Default Filter => Show Trending & Helpful Suggestions */}
            {query.trim().length === 0 && selectedFilter === 'ALL' && (
              <div className="space-y-5">
                {/* Popular Keywords / Tags */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                      Maneno Yanayotafutwa Zaidi
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Maleo Bus Mod TZ',
                      'ETS 2 Mobile',
                      'Shabiby Special',
                      'Dar to Arusha Map',
                      'PC Racing',
                      'PPSSPP Games',
                      'Mods za Bure',
                    ].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          setQuery(tag);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-blue-500/50 hover:bg-slate-800 transition-all flex items-center gap-1.5 group cursor-pointer"
                      >
                        <Search className="w-3 h-3 text-slate-500 group-hover:text-blue-400 transition-colors" />
                        <span>{tag}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popular Trending Games Preview */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                        🔥 Michezo Inayopendwa Sana
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Top Rated</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {popularGames.map((game) => (
                      <div
                        key={game.id}
                        onClick={() => handleOpenDetails(game)}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900 transition-all cursor-pointer group"
                      >
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-950 border border-slate-800">
                          <Image
                            src={game.cover_image}
                            alt={game.title}
                            fill
                            sizes="60px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-white truncate uppercase group-hover:text-blue-400 transition-colors">
                            {game.title}
                          </h4>
                          <span className="text-[10px] text-blue-400 font-bold uppercase block mt-0.5">
                            {game.category}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-black text-emerald-400">
                              {game.price === 0 ? 'BURE' : formatCurrency(game.price)}
                            </span>
                            {game.rating && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {game.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Case 2: Matching Results Found */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
                    {searchResults.length} {searchResults.length === 1 ? 'Game Limepatikana' : 'Games Zimepatikana'}
                  </span>
                  {query && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      kwa &quot;{query}&quot;
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  {searchResults.map((game) => {
                    const isFree = game.price === 0;
                    const unlocked = isUnlocked(game.id);

                    return (
                      <div
                        key={game.id}
                        onClick={() => handleOpenDetails(game)}
                        className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-blue-500/60 hover:bg-slate-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer shadow-md"
                      >
                        {/* Game info */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden shrink-0 bg-slate-950 border border-slate-800 shadow-sm">
                            <Image
                              src={game.cover_image}
                              alt={game.title}
                              fill
                              sizes="80px"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {isFree && (
                              <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded-md bg-emerald-500 text-slate-950 text-[9px] font-black uppercase shadow">
                                FREE
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30">
                                {game.category || 'GAMING'}
                              </span>
                              {game.rating && (
                                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  {game.rating}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-black text-white uppercase tracking-tight truncate mt-1 group-hover:text-blue-400 transition-colors">
                              {game.title}
                            </h4>

                            {game.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                                {game.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-1 sm:hidden">
                              <span className="text-sm font-black text-blue-400">
                                {isFree ? 'BURE (FREE)' : formatCurrency(game.price)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Action Button */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                          <div className="hidden sm:block text-right">
                            <span className="text-sm font-black block leading-none text-blue-400">
                              {isFree ? 'BURE' : formatCurrency(game.price)}
                            </span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-1">
                              {isFree ? 'Direct Download' : 'Instant STK Push'}
                            </span>
                          </div>

                          {unlocked ? (
                            <button
                              onClick={(e) => handleAction(game, e)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>FUNGUA / DOWNLOAD</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleAction(game, e)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer group-hover:scale-105"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>{isFree ? 'DOWNLOAD' : 'NUNUA SASA'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Case 3: Zero Results Found => Friendly Empty State with WhatsApp Request */}
            {(query.trim().length > 0 || selectedFilter !== 'ALL') && searchResults.length === 0 && (
              <div className="text-center py-10 px-4 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center shadow-inner">
                  <Gamepad2 className="w-8 h-8 text-blue-400 animate-bounce" />
                </div>

                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Hakuna Game Lililopatikana
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Hatujapata mchezo unaolingana na <span className="text-blue-400 font-bold">&quot;{query}&quot;</span> kwenye kategoria uliyochagua.
                  </p>
                </div>

                {/* WhatsApp Request Callout */}
                <div className="max-w-md mx-auto p-4 rounded-2xl bg-gradient-to-b from-blue-950/40 to-slate-900 border border-blue-500/30 space-y-3">
                  <div className="flex items-center justify-center gap-2 text-blue-400 text-xs font-black uppercase">
                    <Sparkles className="w-4 h-4" />
                    <span>Unataka game hili liongezwe?</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Tutumie jina la game hili kupitia WhatsApp ya Chidy Prime, nasi tutaliweka hewani haraka iwezekanavyo!
                  </p>
                  <a
                    href={whatsappRequestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Omba Game Hili WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between text-[11px] text-slate-500 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Chidy Prime Realtime Storefront</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline">Bonyeza <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[10px]">ESC</kbd> kufunga</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
