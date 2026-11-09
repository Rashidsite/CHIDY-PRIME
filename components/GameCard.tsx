'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Star, Crown, CheckCircle2, ShieldCheck, ArrowRight, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCMSTheme } from './CMSThemeProvider';
import GameMediaThumbnail from './GameMediaThumbnail';
import { cleanRedirectUrl, parseSquadData } from '@/lib/efootball-squads';
import { isGameAccessActive } from '@/lib/access-duration';

export interface GameProduct {
  id: string;
  title: string;
  description?: string;
  cover_image: string;
  screenshots?: string[];
  video_url?: string;
  youtube_url?: string;
  thumbnail_type?: 'image' | 'slideshow' | 'video' | 'auto';
  price: number;
  rating?: number;
  category: string;
  tags?: string[];
  status?: string;
  download_url?: string;
  is_new_feed?: boolean;
  access_duration?: string;
  license_duration?: string;
  direct_payment_url?: string;
  thumbnail_fit?: 'contain' | 'cover' | 'top' | string;
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

const GameCard = React.memo(function GameCard({ game, onBuyNow, index = 0, isUnlocked = false }: GameCardProps) {
  const router = useRouter();
  const { getButtonClass, animations } = useCMSTheme();

  const catLower = (game.category || '').toLowerCase();
  const titleLower = (game.title || '').toLowerCase();

  // 1. Efootball Squads / Vikosi
  const isSquad = catLower.includes('efootball') || 
                  catLower.includes('vikosi') || 
                  catLower.includes('kikosi') || 
                  titleLower.includes('kikosi');

  // 2. Bus / Vehicle Skins (Livery)
  const isSkin = !isSquad && (
    catLower.includes('skin') || 
    catLower.includes('livery') || 
    catLower.includes('rangi') || 
    titleLower.includes('skin') ||
    titleLower.includes('livery')
  );

  // 3. Apps, Utilities & Tools (Games Tools, Software, CamScanner, Everything, Emulators)
  // Strict: Must be in a tool category OR be a specific utility app (never match normal games or mod apk games)
  const isToolCategory = catLower.includes('tool') || 
                         catLower.includes('software') || 
                         catLower.includes('program') ||
                         (catLower.includes('app') && !catLower.includes('game'));

  const isUtilityAppTitle = titleLower.includes('camscanner') || 
                            titleLower.includes('everything-') || 
                            titleLower.startsWith('everything') ||
                            titleLower.includes('zarchiver') || 
                            titleLower.includes('winrar') ||
                            titleLower.endsWith('.exe');

  const isAppOrTool = !isSquad && !isSkin && (isToolCategory || isUtilityAppTitle);

  // 4. Vehicle / Map Mods (Maleo bus mods, truck mods, map mods)
  const isModCategory = catLower.includes('maleo') || 
                        catLower.includes('bus mod') || 
                        catLower.includes('bus mode') ||
                        catLower.includes('truck mod') || 
                        catLower.includes('map mod');

  const isModTitle = (titleLower.includes('maleo') || titleLower.includes('ets') || titleLower.includes('bus mod') || titleLower.includes('truck mod') || titleLower.includes('map mod')) && !catLower.includes('game');

  const isMod = !isSquad && !isSkin && !isAppOrTool && (isModCategory || isModTitle);

  // Dynamic noun for action buttons
  let itemNoun = 'GAME';
  let specBadge = 'ANDROID / PC';

  if (isSquad) {
    itemNoun = 'KIKOSI';
    specBadge = 'EFOOTBALL';
  } else if (isSkin) {
    itemNoun = 'SKIN';
    specBadge = 'BUS SKIN';
  } else if (isAppOrTool) {
    itemNoun = 'APP';
    specBadge = 'APP / TOOL';
  } else if (isMod) {
    itemNoun = 'MOD';
    specBadge = 'OFFLINE MOD';
  }

  const viewButtonText = `TAZAMA ${itemNoun}`;

  const isFree = !isSquad && game.price === 0 && (game.category?.toLowerCase().includes('free') || game.title?.toLowerCase().includes('free'));
  const isTopRated = (game.rating || 0) >= 4.9;
  const label = itemNoun;
  const downloadButtonText = isFree ? `DOWNLOAD ${itemNoun}` : `PAKUA ${itemNoun}`;
  const rawDuration = isSquad ? '7 Days' : (game.access_duration || game.license_duration || (game as any).plan_duration || (game as any).duration_days || (game as any).duration);
  const durationLabel = isSquad ? '⚽ EFOOTBALL SQUAD' : formatPlanDuration(rawDuration, isFree);

  // Check active access from local storage caches strictly
  const checkActive = React.useCallback(() => {
    if (!game?.id) return false;
    return isGameAccessActive(game.id, rawDuration);
  }, [game?.id, rawDuration]);

  const [localActive, setLocalActive] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !game?.id) return isUnlocked;
    return checkActive();
  });

  useEffect(() => {
    setLocalActive(checkActive());
  }, [checkActive, isUnlocked]);

  // Periodic expiration watcher (checks every 15 seconds) so if duration elapses, card locks in real-time
  useEffect(() => {
    if (!localActive || isFree) return;
    const interval = setInterval(() => {
      const active = checkActive();
      if (!active) {
        setLocalActive(false);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [localActive, isFree, checkActive]);

  // Listen to unlock events, auth changes & expiry events to refresh card state instantly
  useEffect(() => {
    const handleOrderUnlocked = (e: any) => {
      const detail = e?.detail;
      const targetId = detail?.game_id || detail?.productId || detail?.product_id;
      if (targetId && String(targetId) === String(game?.id)) {
        setLocalActive(true);
      }
    };

    const handleAuthChange = () => {
      setLocalActive(checkActive());
    };

    const handleExpired = (e: any) => {
      const gId = e?.detail?.gameId;
      if (gId && String(gId) === String(game?.id)) {
        setLocalActive(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('cpcg_order_unlocked', handleOrderUnlocked);
      window.addEventListener('cpcg_auth_change', handleAuthChange);
      window.addEventListener('cpcg_access_expired', handleExpired);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cpcg_order_unlocked', handleOrderUnlocked);
        window.removeEventListener('cpcg_auth_change', handleAuthChange);
        window.removeEventListener('cpcg_access_expired', handleExpired);
      }
    };
  }, [game?.id, checkActive]);

  const showUnlocked = isFree || localActive;

  const customButtonText = (game as any).links?.[0]?.button_text;
  const buttonText = isSquad 
    ? (showUnlocked ? '⬇ PAKUA KIKOSI' : (customButtonText || '⚡ NUNUA KIKOSI'))
    : showUnlocked 
      ? (isFree ? 'DOWNLOAD GAME' : `⬇ PAKUA ${label}`) 
      : `⚡ NUNUA ${label}`;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSquad) {
      if (showUnlocked) {
        router.push(`/games/${game.id}`);
        return;
      }
      const parsedSquad = parseSquadData(game);
      if (parsedSquad.payment_mode === 'direct' && parsedSquad.redirect_url) {
        if (typeof window !== 'undefined') {
          window.open(parsedSquad.redirect_url, '_blank');
          return;
        }
      }
      // If push mode or no direct redirect, open automated checkout modal
      if (onBuyNow) {
        onBuyNow(game);
        return;
      }
    }

    // Direct Payment Link Bypass: If game is not unlocked and admin configured a direct link, open it
    if (!showUnlocked && game.direct_payment_url && game.direct_payment_url.trim()) {
      if (typeof window !== 'undefined') {
        window.open(game.direct_payment_url.trim(), '_blank');
        return;
      }
    }

    if (onBuyNow) {
      onBuyNow(game);
    }
  };

  return (
    <div
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-[#0F172A] border transform-gpu ${
        showUnlocked ? 'border-emerald-500/50 hover:border-emerald-400' : 'border-slate-800/80 hover:border-blue-600/60'
      } shadow-xl transition-all duration-200 interactive-card game-card-accelerated`}
    >
      <div 
        onClick={() => router.push(`/games/${game.id}`)}
        className="relative aspect-[16/9] aspect-card-16-9 w-full overflow-hidden bg-slate-900 shrink-0 cursor-pointer touch-manipulation"
      >
        <GameMediaThumbnail
          coverImage={game.cover_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'}
          screenshots={game.screenshots}
          videoUrl={game.video_url || game.youtube_url}
          thumbnailType={game.thumbnail_type === 'video' || game.thumbnail_type === 'slideshow' ? game.thumbnail_type : 'image'}
          thumbnailFit={game.thumbnail_fit || (game as any).thumbnailFit || 'cover'}
          title={game.title}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/10 to-transparent opacity-90 pointer-events-none" />

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

      <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between gap-2 bg-[#0F172A]">
        <div>
          <Link href={`/games/${game.id}`} className="block group/link touch-manipulation">
            <h3 className="text-xs sm:text-sm font-black text-white group-hover/link:text-blue-400 transition-colors line-clamp-1 tracking-tight leading-snug">
              {game.title}
            </h3>
          </Link>
        </div>

        {/* Footer Area: Specs Row + Action Button */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          {showUnlocked ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-black text-emerald-400 tracking-wide uppercase">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{isFree ? 'BURE KABISA' : 'TAYARI IPO WAZI'}</span>
                </span>
                <span className="text-[9px] text-slate-400 font-bold">{specBadge}</span>
              </div>

              <button
                type="button"
                onClick={handleCardClick}
                className={`w-full py-1.5 sm:py-2 min-h-[34px] rounded-xl flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${getButtonClass('download')} cursor-pointer touch-manipulation active:scale-[0.97]`}
              >
                <Download className="w-3 h-3" />
                <span className="relative z-10">{downloadButtonText}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Badges Row */}
              <div className="flex items-center justify-between gap-1">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 text-[9px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
                  <span className="truncate">{specBadge}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                  <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                  <span>TESTED</span>
                </span>
              </div>

              {/* Action Button: Sleek, compact pill with exact category noun */}
              <Link
                href={`/games/${game.id}`}
                className="w-full py-1.5 sm:py-2 min-h-[34px] rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-blue-600/20 border border-blue-400/30 transition-all active:scale-[0.97] touch-manipulation group/btn"
              >
                <span className="relative z-10">{viewButtonText}</span>
                <ArrowRight className="w-3 h-3 text-blue-200 group-hover/btn:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default GameCard;
