'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, Crown, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCMSTheme } from './CMSThemeProvider';

export interface GameProduct {
  id: string;
  title: string;
  description?: string;
  cover_image: string;
  price: number;
  rating?: number;
  category: string;
  tags?: string[];
  status?: string;
  download_url?: string;
  is_new_feed?: boolean;
  access_duration?: string;
  license_duration?: string;
}

interface GameCardProps {
  game: GameProduct;
  onBuyNow?: (game: GameProduct) => void;
  index?: number;
  isUnlocked?: boolean;
}

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxMCI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjMGUxNzJhIi8+PC9zdmc+';

function getLabel(category: string): 'GAME' | 'MOD' | 'VIDEO' {
  const c = (category || '').toLowerCase();
  if (c.includes('mod') || c.includes('map') || c.includes('bus')) return 'MOD';
  if (c.includes('video') || c.includes('tv')) return 'VIDEO';
  return 'GAME';
}

export function formatPlanDuration(duration?: string | number, isFree?: boolean): string {
  if (isFree) return '🎁 BURE (FREE)';
  if (duration === undefined || duration === null || duration === '') return '♾️ UFIKIAJI: MAISHA YOTE';

  if (typeof duration === 'number') {
    if (duration === 2) return '⏳ UFIKIAJI: MASAA 2';
    if (duration === 1 || duration === 24) return '⏳ UFIKIAJI: MASAA 24';
    if (duration === 7) return '⏳ UFIKIAJI: SIKU 7';
    if (duration === 30) return '⏳ UFIKIAJI: SIKU 30';
    if (duration === 0 || duration >= 365) return '♾️ UFIKIAJI: MAISHA YOTE';
    return `⏳ UFIKIAJI: SIKU ${duration}`;
  }

  const clean = String(duration).trim();
  const lower = clean.toLowerCase();

  if (lower.includes('2 hour') || lower.includes('2 hrs') || lower.includes('masaa 2') || lower === '2') {
    return '⏳ UFIKIAJI: MASAA 2';
  }
  if (lower.includes('24 hour') || lower.includes('24 hrs') || lower.includes('masaa 24') || lower === '1 day' || lower === 'siku 1' || lower === '24') {
    return '⏳ UFIKIAJI: MASAA 24';
  }
  if (lower.includes('7 day') || lower.includes('siku 7') || lower.includes('1 week') || lower.includes('wiki 1') || lower === '7') {
    return '⏳ UFIKIAJI: SIKU 7';
  }
  if (lower.includes('30 day') || lower.includes('siku 30') || lower.includes('1 month') || lower.includes('mwezi 1') || lower === '30') {
    return '⏳ UFIKIAJI: SIKU 30';
  }
  if (lower.includes('free') || lower.includes('bure')) {
    return '🎁 BURE (FREE)';
  }
  if (lower.includes('lifetime') || lower.includes('maisha') || lower === 'infinity' || lower === '0') {
    return '♾️ UFIKIAJI: MAISHA YOTE';
  }

  return `⏳ UFIKIAJI: ${clean.toUpperCase()}`;
}

export default function GameCard({ game, onBuyNow, index = 0, isUnlocked = false }: GameCardProps) {
  const [unlockedLocally, setUnlockedLocally] = React.useState(isUnlocked);
  const { getButtonClass, animations } = useCMSTheme();

  React.useEffect(() => {
    const checkAuthAndUnlocked = () => {
      try {
        const isAuth = !!localStorage.getItem('cpcg_user_phone') || !!localStorage.getItem('cpcg_registered');
        if (!isAuth) {
          setUnlockedLocally(false);
          return;
        }
        const savedUnlocked = localStorage.getItem('cpcg_unlocked_games');
        if (savedUnlocked) {
          const parsed = JSON.parse(savedUnlocked);
          if (Array.isArray(parsed) && parsed.includes(game.id)) {
            setUnlockedLocally(true);
            return;
          }
        }
        setUnlockedLocally(isUnlocked);
      } catch {
        setUnlockedLocally(false);
      }
    };

    checkAuthAndUnlocked();

    const handleOrderUnlocked = (e: any) => {
      const detail = e?.detail;
      if (detail?.game_id === game.id || detail?.productId === game.id) {
        setUnlockedLocally(true);
      }
    };

    const handleLogoutReset = () => {
      setUnlockedLocally(false);
    };

    window.addEventListener('cpcg_auth_change', checkAuthAndUnlocked);
    window.addEventListener('cpcg_logout_reset', handleLogoutReset);
    window.addEventListener('cpcg_order_unlocked', handleOrderUnlocked);

    return () => {
      window.removeEventListener('cpcg_auth_change', checkAuthAndUnlocked);
      window.removeEventListener('cpcg_logout_reset', handleLogoutReset);
      window.removeEventListener('cpcg_order_unlocked', handleOrderUnlocked);
    };
  }, [game.id, isUnlocked]);

  const isFree = game.price === 0;
  const isTopRated = (game.rating || 0) >= 4.9;
  const label = getLabel(game.category);
  const showUnlocked = isUnlocked || unlockedLocally || isFree;
  const rawDuration = game.access_duration || game.license_duration || (game as any).plan_duration || (game as any).duration_days || (game as any).duration;
  const durationLabel = formatPlanDuration(rawDuration, isFree);

  const buttonText = showUnlocked 
    ? (isFree ? 'DOWNLOAD GAME' : `⬇ PAKUA ${label}`) 
    : `⚡ NUNUA ${label}`;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBuyNow) {
      onBuyNow(game);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3), ease: 'easeOut' }}
      whileHover={animations.card_hover_scale ? { y: -5 } : undefined}
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-[#0F172A] border ${
        showUnlocked ? 'border-emerald-500/50 hover:border-emerald-400' : 'border-slate-800/80 hover:border-blue-600/60'
      } shadow-xl transition-all duration-300 interactive-card game-card-accelerated`}
    >
      <div className="relative aspect-[16/9] aspect-card-16-9 w-full overflow-hidden bg-slate-900 shrink-0">
        <Image
          src={game.cover_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'}
          alt={game.title}
          fill
          quality={95}
          unoptimized={Boolean(game.cover_image && (game.cover_image.includes('ibb.co') || game.cover_image.includes('images.unsplash.com')))}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 ease-out select-none pointer-events-auto"
          loading="lazy"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/10 to-transparent opacity-90" />

        <div className="absolute top-3 right-3 flex items-center justify-end z-10 gap-1.5 pointer-events-none">
          {showUnlocked ? (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-[9px] font-black uppercase text-white border border-emerald-400 flex items-center gap-1 shadow-md">
              <CheckCircle2 className="w-3 h-3 text-white" />
              <span>{isFree ? 'FREE' : 'UNLOCKED'}</span>
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              {isTopRated && <Crown className="w-3.5 h-3.5 text-amber-400" />}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/90 text-[10px] font-black text-amber-400 border border-slate-800 shadow-sm leading-none backdrop-blur-md">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                <span>{game.rating || 4.9}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-2.5 bg-[#0F172A]">
        <div>
          <Link href={`/games/${game.id}`} className="block group/link">
            <h3 className="text-xs sm:text-sm font-black text-white group-hover/link:text-blue-400 transition-colors line-clamp-1 tracking-tight leading-snug">
              {game.title}
            </h3>
          </Link>
          {game.description && (
            <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed font-normal">
              {game.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 gap-2">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] uppercase font-black text-purple-400 tracking-wider block leading-none mb-1 whitespace-nowrap">
              {durationLabel}
            </span>
            {showUnlocked ? (
              <span className="text-xs font-black text-emerald-400 tracking-wide uppercase">UNLOCKED</span>
            ) : isFree ? (
              <span className="text-xs font-black text-emerald-400 tracking-wide">FREE</span>
            ) : (
              <span className="text-xs sm:text-sm font-black text-white leading-none whitespace-nowrap">
                {formatCurrency(game.price)}
              </span>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleCardClick}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-[11px] shrink-0 transition-all ${
              showUnlocked ? getButtonClass('download') : getButtonClass('buy')
            } cursor-pointer touch-manipulation whitespace-nowrap`}
          >
            {buttonText}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
