'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ScreenshotGallery from '@/components/ScreenshotGallery';
import CheckoutModal, { playCelebrationSound } from '@/components/CheckoutModal';
import SquadImageLightbox from '@/components/SquadImageLightbox';
import { 
  Star, 
  ShieldCheck, 
  Zap, 
  Download, 
  ArrowLeft, 
  Cpu, 
  Trophy, 
  ZoomIn, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  MessageSquare,
  Smartphone,
  Check,
  Shield,
  Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { GameProduct, formatPlanDuration } from '@/components/GameCard';
import { useProductAccess } from '@/hooks/useProductAccess';
import { parseSquadData, EFootballSquad, generateWhatsAppLink } from '@/lib/efootball-squads';
import { useCMSTheme } from '@/components/CMSThemeProvider';

function getYouTubeEmbedId(url?: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = (url || '').match(regExp);
  return match && match[1] ? match[1] : null;
}

export default function GameDetailPage() {
  const params = useParams();
  const { getButtonClass } = useCMSTheme();
  const gameId = params.id as string;

  const [game, setGame] = useState<any>(null);
  const [squad, setSquad] = useState<EFootballSquad | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeGalleryImg, setActiveGalleryImg] = useState<string | null>(null);
  const [coverAspect, setCoverAspect] = useState<number | null>(null);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [squadCoverAspect, setSquadCoverAspect] = useState<number | null>(null);
  const [isPortraitSquad, setIsPortraitSquad] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const handleUnlocked = (e: any) => {
      const targetId = e?.detail?.game_id || e?.detail?.productId || e?.detail?.product_id;
      if (!targetId || String(targetId) === String(gameId)) {
        setShowCelebration(true);
        playCelebrationSound();
        setTimeout(() => setShowCelebration(false), 6000);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('cpcg_order_unlocked', handleUnlocked);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cpcg_order_unlocked', handleUnlocked);
      }
    };
  }, [gameId]);

  const supabase = useMemo(() => createClient(), []);
  const { isUnlocked, refresh: refreshAccess } = useProductAccess();

  useEffect(() => {
    async function loadGameDetails() {
      if (!gameId) return;
      setLoading(true);
      try {
        let postData: any = null;

        // 1. Primary: Direct Supabase client query
        try {
          const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', gameId)
            .maybeSingle();

          if (!error && data) {
            postData = data;
          }
        } catch (sbErr) {
          console.warn('Direct supabase fetch failed, trying API fallback:', sbErr);
        }

        // 2. Fallback: Server API /api/admin/vikosi if not found yet
        if (!postData) {
          try {
            const vRes = await fetch('/api/admin/vikosi');
            const vJson = await vRes.json();
            if (vJson.success && Array.isArray(vJson.squads)) {
              const matchedSquad = vJson.squads.find((s: any) => s.id === gameId);
              if (matchedSquad) {
                setSquad(matchedSquad);
                setGame({
                  id: matchedSquad.id,
                  title: matchedSquad.title,
                  description: matchedSquad.description,
                  cover_image: matchedSquad.cover_image,
                  price: matchedSquad.price,
                  rating: matchedSquad.rating,
                  category: matchedSquad.category,
                  screenshots: matchedSquad.screenshots?.length ? matchedSquad.screenshots : [matchedSquad.cover_image],
                  download_url: matchedSquad.download_url,
                  access_duration: 'Lifetime',
                  direct_payment_url: matchedSquad.redirect_url,
                  system_req_minimum: {
                    os: 'Android / iOS',
                    cpu: 'Octa-Core',
                    ram: '4 GB RAM',
                    gpu: 'Adreno / Mali',
                    storage: '4 GB free space',
                  },
                });
                return;
              }
            }
          } catch {}
        }

        // 3. Fallback: /api/games endpoint
        if (!postData) {
          try {
            const gRes = await fetch('/api/games');
            const gJson = await gRes.json();
            if (gJson.success && Array.isArray(gJson.games)) {
              const matchedGame = gJson.games.find((g: any) => g.id === gameId);
              if (matchedGame) {
                postData = matchedGame;
              }
            }
          } catch {}
        }

        if (postData) {
          const isSquadItem = 
            (postData.category || '').toLowerCase().includes('efootball') ||
            (postData.category || '').toLowerCase().includes('vikosi') ||
            (postData.title || '').toLowerCase().includes('kikosi');

          if (isSquadItem) {
            try {
              const parsedSquad = parseSquadData(postData);
              setSquad(parsedSquad);
            } catch (err) {
              console.error('Error parsing squad data:', err);
            }
          }

          let dur = postData.plan_duration || postData.access_duration || postData.license_duration;
          if (!dur && postData.duration_days) {
            dur = `${postData.duration_days} Days`;
          }

          let rawCover = postData.image_url || postData.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg';
          let rawScreenshots: string[] = [];
          if (Array.isArray(postData.screenshots) && postData.screenshots.length > 0) {
            rawScreenshots = postData.screenshots;
          } else if (postData.links?.[0]?.screenshots) {
            rawScreenshots = postData.links[0].screenshots;
          }

          let directPaymentUrl = postData.direct_payment_url || '';
          let cleanDownloads: { name: string; url: string }[] = [];
          if (Array.isArray(postData.links)) {
            postData.links.forEach((l: any) => {
              if (!l) return;
              const nameUpper = String(l.name || l.label || '').toUpperCase();
              if (
                nameUpper === 'PAYMENT_REDIRECT' ||
                nameUpper === 'DIRECT_PAYMENT_URL' ||
                l.type === 'direct_payment'
              ) {
                if (!directPaymentUrl && (l.url || l.link)) {
                  directPaymentUrl = (l.url || l.link).trim();
                }
              } else if (
                nameUpper !== 'THUMBNAIL_FIT' &&
                nameUpper !== 'SQUAD_METADATA'
              ) {
                const url = typeof l === 'string' ? l : (l.url || l.link);
                if (url && typeof url === 'string' && url.trim().startsWith('http')) {
                  cleanDownloads.push({
                    name: (typeof l === 'object' && (l.name || l.label || l.title)) || 'Download File',
                    url: url.trim(),
                  });
                }
              }
            });
          }

          if (cleanDownloads.length === 0 && postData.download_url && typeof postData.download_url === 'string' && postData.download_url.trim().startsWith('http')) {
            cleanDownloads.push({
              name: 'Main Game Download (APK / OBB / Mod)',
              url: postData.download_url.trim(),
            });
          }

          if (cleanDownloads.length === 0) {
            cleanDownloads.push(
              { name: 'Game APK / Setup File', url: postData.download_url || '#' },
              { name: 'OBB & Save Data Pack', url: postData.download_url || '#' }
            );
          }

          let gameVideoUrl = (postData.youtube_url || postData.video_url || '').trim();
          if (!gameVideoUrl && Array.isArray(postData.links)) {
            const vLink = postData.links.find((l: any) => {
              if (!l) return false;
              const u = typeof l === 'string' ? l : (l.url || l.link || '');
              return u.includes('youtube.com') || u.includes('youtu.be') || u.endsWith('.mp4') || l.type === 'video' || String(l.name || '').toUpperCase() === 'VIDEO_TRAILER';
            });
            if (vLink) gameVideoUrl = (typeof vLink === 'string' ? vLink : (vLink.url || vLink.link || '')).trim();
          }

          setGame({
            id: postData.id,
            title: postData.title || 'Untitled Game',
            description: postData.description || '',
            cover_image: rawCover,
            price: Number(postData.price) || 0,
            rating: Number(postData.rating) || 4.8,
            category: postData.category || 'MALEO BUS MODE TZ',
            screenshots: rawScreenshots.length > 0 ? rawScreenshots : [rawCover],
            video_url: gameVideoUrl,
            youtube_url: gameVideoUrl,
            download_url: postData.links?.[0]?.url || postData.download_url || '',
            download_links: cleanDownloads,
            access_duration: dur || 'Lifetime',
            direct_payment_url: directPaymentUrl,
            system_req_minimum: {
              os: 'Android / Windows 10 64-Bit',
              cpu: 'Octa-Core / Intel Core i5',
              ram: '4 GB / 8 GB RAM',
              gpu: 'Adreno / Mali / NVIDIA GTX',
              storage: '5 GB free space',
            },
          });
        }
      } catch (err) {
        console.error('Error fetching game detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGameDetails();
  }, [gameId, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-blue-400 animate-bounce" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">Inapakia taarifa...</span>
        </div>
      </div>
    );
  }

  if (!game && !squad) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4 space-y-4">
        <h2 className="text-2xl font-bold">Kikosi au Game Halijapatikana</h2>
        <Link href="/" className="px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold uppercase tracking-wider">
          Rudi Storefront
        </Link>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── DEDICATED EFOOTBALL SQUAD SHOWCASE VIEW ──
  // ═══════════════════════════════════════════════════════════════════════════
  if (squad) {
    const allScreenshots = [squad.cover_image, ...(squad.screenshots || [])].filter(Boolean);

    return (
      <>
        <Navbar />

        <main className="main-storefront-wrapper relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-36">
          
          {/* Top Breadcrumb Nav */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Rudi Nyuma Storefront</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>eFootball Squads Hub</span>
              </span>
            </div>
          </div>

          {/* Hero Squad Section: Full Uncropped Formation + Live Purchasing */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            
            {/* Left Col: Full Uncropped Squad Formation Display with Stadium Backdrop */}
            <div className="lg:col-span-7 space-y-4">
              <div 
                className={`relative rounded-3xl overflow-hidden border border-blue-500/30 shadow-[0_0_40px_rgba(37,99,235,0.2)] bg-gradient-to-b from-[#0a1c38] via-[#051124] to-[#020712] p-2 flex items-center justify-center group cursor-pointer transition-all duration-300 ${
                  isPortraitSquad
                    ? 'w-full max-w-sm sm:max-w-md mx-auto aspect-[3/4] sm:aspect-[4/5] max-h-[75vh]'
                    : 'w-full aspect-[16/10] sm:aspect-[16/9]'
                }`}
                style={squadCoverAspect ? { aspectRatio: `${squadCoverAspect}` } : undefined}
                onClick={() => setLightboxOpen(true)}
              >
                <Image
                  src={squad.cover_image}
                  alt={squad.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 700px"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      const ratio = img.naturalWidth / img.naturalHeight;
                      setSquadCoverAspect(ratio);
                      setIsPortraitSquad(ratio < 0.95);
                    }
                  }}
                  className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>

              {/* Extra Screenshots Thumbnail Row */}
              {allScreenshots.length > 1 && (
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Picha za Ziada (Benchi, Akiba na Makocha):
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {allScreenshots.map((shot, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveGalleryImg(shot);
                          setLightboxOpen(true);
                        }}
                        className="relative w-24 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0 cursor-pointer hover:border-blue-400 transition-colors"
                      >
                        <Image src={shot} alt={`Picha ${idx + 1}`} fill className="object-contain" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Squad Specs & Direct Purchase Action Card */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/90 border border-blue-500/20 backdrop-blur-xl shadow-2xl space-y-6">
              
              {/* Header Titles */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider">
                    {squad.platform}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{squad.rating} / 5.0 (Iliyothibitishwa)</span>
                  </div>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase leading-snug">
                  {squad.title}
                </h1>
              </div>

              {/* Squad Specifications Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Team Strength:</span>
                  <p className="font-black text-blue-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{squad.team_strength}</span>
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Makocha:</span>
                  <p className="font-black text-emerald-400 truncate" title={squad.booster_coaches}>
                    🛡️ {squad.booster_coaches}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Wachezaji Maalum:</span>
                  <p className="font-black text-purple-400 truncate" title={squad.epics_count}>
                    🌟 {squad.epics_count}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Aina ya Login:</span>
                  <p className="font-black text-amber-400 truncate" title={squad.login_type}>
                    🔐 {squad.login_type}
                  </p>
                </div>
              </div>

              {/* Price & Primary Action Button */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-blue-300 block mb-0.5 tracking-wider">
                      BEI YA KIKOSI
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {formatCurrency(squad.price)}
                    </span>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-700 text-[10px] font-bold uppercase">
                    Makabidhiano Papo Hapo
                  </span>
                </div>

                {/* Primary Buy Button or Unlocked / Download Action */}
                {squad.is_sold ? (
                  <div className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-rose-600/20 border border-rose-500/40 text-rose-400 text-xs font-black uppercase tracking-wider text-center flex items-center justify-center">
                    KIKOSI HIKI KIMEKWISHA NUNULIWA (SOLD OUT)
                  </div>
                ) : isUnlocked(gameId) ? (
                  <div className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>KIKOSI KIMEFUNGULIWA (UNLOCKED)</span>
                  </div>
                ) : squad.payment_mode === 'direct' && squad.redirect_url ? (
                  <a
                    href={squad.redirect_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full min-h-[48px] py-3.5 px-4 text-xs sm:text-sm font-black uppercase tracking-wider ${getButtonClass('buy')} hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation text-center`}
                  >
                    <span className="icon-spark-pulse text-amber-300 text-xs">⚡</span>
                    <span className="relative z-10">{(squad.button_text || '⚡ NUNUA KIKOSI SASA').replace(/^⚡\s*/, '')}</span>
                    <ArrowUpRight className="w-4 h-4 relative z-10" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCheckoutOpen(true)}
                    className={`w-full min-h-[48px] py-3.5 px-4 text-xs sm:text-sm font-black uppercase tracking-wider ${getButtonClass('buy')} hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation text-center`}
                  >
                    <span className="icon-spark-pulse text-amber-300 text-xs">⚡</span>
                    <span className="relative z-10">{(squad.button_text || '⚡ NUNUA KIKOSI SASA').replace(/^⚡\s*/, '')}</span>
                    <Zap className="w-4 h-4 relative z-10" />
                  </button>
                )}

                {/* Secondary Direct WhatsApp Contact */}
                {!squad.is_sold && (
                  <a
                    href={squad.redirect_url || generateWhatsAppLink('255655361060', squad.title, squad.price)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98] text-center"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Wasiliana na Admin WhatsApp Moja kwa Moja</span>
                  </a>
                )}
              </div>

              {/* Download Links Section for Squad (if unlocked or provided) */}
              {squad.download_links && squad.download_links.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <Download className="w-4 h-4" />
                      <span>{isUnlocked(gameId) ? 'Faili za Kupakua (Download Links)' : 'Faili Zilizomo Kwenye Kikosi Hiki'}</span>
                    </span>
                    {isUnlocked(gameId) && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase border border-emerald-500/30">
                        Tayari Ziko Wazi
                      </span>
                    )}
                  </div>

                  {isUnlocked(gameId) ? (
                    <div className="space-y-3">
                      {squad.download_links.map((dl, idx) => (
                        <a
                          key={idx}
                          href={dl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="animated-border-yellow-red group"
                        >
                          <div className="animated-border-yellow-red-inner flex items-center justify-between p-3 gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                                <Download className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold block truncate text-white">{dl.name || `Download File #${idx + 1}`}</span>
                                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>Tayari Kupakuliwa</span>
                                </span>
                              </div>
                            </div>
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-md shadow-emerald-600/25 shrink-0 transition-colors">
                              <span>PAKUA</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="animated-border-yellow-red">
                      <div className="animated-border-yellow-red-inner p-3.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
                              <span className="text-sm">📁</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white truncate">{squad.title} - Complete Package</p>
                              <p className="text-[10px] text-slate-400">Inajumuisha faili na maelekezo yote ({squad.download_links.length} files)</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                            🔒 Limefungwa
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Guarantees & Safe Transfer */}
              <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dhamana ya Chidy Prime: Akaunti inakaguliwa na kuthibitishwa 100%.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Unasaidiwa kubadilisha Email & Password ya Konami ID kwa jina lako.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Makabidhiano ya haraka ndani ya dakika 5 hadi 15 baada ya malipo.</span>
                </div>
              </div>
            </div>
          </div>

        </main>

        {/* Fullscreen Uncropped Lightbox Zoom */}
        {lightboxOpen && (
          <SquadImageLightbox
            isOpen={lightboxOpen}
            onClose={() => {
              setLightboxOpen(false);
              setActiveGalleryImg(null);
            }}
            imageUrl={activeGalleryImg || squad.cover_image}
            title={squad.title}
            teamStrength={squad.team_strength}
          />
        )}

        {/* Checkout Modal for Automated Push */}
        {squad && (
          <CheckoutModal
            isOpen={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            game={{
              id: squad.id,
              title: squad.title,
              price: squad.price,
              cover_image: squad.cover_image,
              category: squad.category,
              access_duration: '7 Days',
            }}
            isUnlocked={isUnlocked(gameId)}
            onSuccess={() => {
              refreshAccess();
            }}
          />
        )}
        {/* Floating Celebration Bubbles & Sparkles (Viputo vya Shangwe) */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {Array.from({ length: 32 }).map((_, i) => (
            <span
              key={i}
              className="absolute celebration-bubble"
              style={{
                left: `${(i * 11) % 95}%`,
                animationDelay: `${(i * 0.1)}s`,
                animationDuration: `${2.5 + (i % 5) * 0.35}s`,
                fontSize: `${20 + (i % 4) * 8}px`,
              }}
            >
              {['🎈', '✨', '🎉', '🎊', '⭐', '💎', '🟢', '🟡', '🔥', '🥳'][i % 10]}
            </span>
          ))}
        </div>
      )}
    </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── STANDARD GAME DETAIL VIEW (PC/BUS MODS) ──
  // ═══════════════════════════════════════════════════════════════════════════
  const isFree = game.price === 0;
  const allScreenshots = [game.cover_image, ...(game.screenshots || [])].filter(Boolean);

  return (
    <>
      <Navbar />

      <main className="main-storefront-wrapper relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-36">
        
        {/* Top Breadcrumb Nav */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Rudi Nyuma Storefront</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Chidy Gaming Store</span>
            </span>
          </div>
        </div>

        {/* Hero Game Section: Full Uncropped Cover + Live Purchasing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Left Col: Full Uncropped Cover Display with Stadium/Gaming Backdrop */}
          <div className="lg:col-span-7 space-y-4">
            <div 
              className={`relative rounded-3xl overflow-hidden border border-blue-500/30 shadow-[0_0_40px_rgba(37,99,235,0.2)] bg-gradient-to-b from-[#0a1c38] via-[#051124] to-[#020712] p-2 flex items-center justify-center group cursor-pointer transition-all duration-300 ${
                isPortrait
                  ? 'w-full max-w-sm sm:max-w-md mx-auto aspect-[3/4] sm:aspect-[4/5] max-h-[75vh]'
                  : 'w-full aspect-[16/10] sm:aspect-[16/9]'
              }`}
              style={coverAspect ? { aspectRatio: `${coverAspect}` } : undefined}
              onClick={() => {
                setActiveGalleryImg(game.cover_image);
                setLightboxOpen(true);
              }}
            >
              {/* Ambient blurred backdrop so portrait/square images fill frame beautifully */}
              <div className="absolute inset-0 overflow-hidden opacity-35 pointer-events-none">
                <Image
                  src={game.cover_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'}
                  alt=""
                  fill
                  className="object-cover filter blur-2xl scale-125"
                  aria-hidden="true"
                />
              </div>

              {/* Foreground Full Uncropped Image */}
              <Image
                src={game.cover_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'}
                alt={game.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 750px"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    const ratio = img.naturalWidth / img.naturalHeight;
                    setCoverAspect(ratio);
                    setIsPortrait(ratio < 0.95);
                  }
                }}
                className="object-contain relative z-10 transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          </div>

          {/* Right Col: Game Specs & Direct Purchase Action Card */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/90 border border-blue-500/20 backdrop-blur-xl shadow-2xl space-y-6">
            
            {/* Header Titles */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider">
                  {game.category?.toLowerCase().includes('pc') ? 'PC / WINDOWS' : 'MOBILE (ANDROID & iOS)'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>TESTED 100%</span>
                </span>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-400 ml-auto">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{game.rating || 4.8} / 5.0 (Iliyothibitishwa)</span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase leading-snug">
                {game.title}
              </h1>
            </div>

            {/* Price & Primary Action Button - Appears immediately after Game Title */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 space-y-4 shadow-lg shadow-blue-900/10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-300 block mb-0.5 tracking-wider">
                    BEI YA GAME
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {isUnlocked(gameId) ? 'TAYARI IPO WAZI' : isFree ? 'BURE / FREE' : formatCurrency(game.price)}
                  </span>
                </div>

                <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Upatikanaji Papo Hapo</span>
                </span>
              </div>

              {/* Primary Buy Button or Unlocked / Download Action */}
              {isUnlocked(gameId) ? (
                <div className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>GAME LIMEFUNGULIWA (UNLOCKED)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (game?.direct_payment_url && game.direct_payment_url.trim()) {
                      window.open(game.direct_payment_url.trim(), '_blank');
                      return;
                    }
                    setCheckoutOpen(true);
                  }}
                  className={`w-full min-h-[50px] py-3.5 px-6 text-sm sm:text-base font-black uppercase tracking-wider ${getButtonClass('buy')} hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation text-center rounded-2xl shadow-xl`}
                >
                  <Zap className="w-5 h-5 text-amber-300 icon-spark-pulse shrink-0" />
                  <span className="relative z-10 font-black">{isFree ? 'PAKUA BURE' : 'BONYEZA HAPA KUNUNUA GAME'}</span>
                </button>
              )}
            </div>

            {/* Faili Zilizomo Kwenye Game Hili (Locked Single Package vs Unlocked Sequence) */}
            {game.download_links && game.download_links.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-blue-400" />
                    <span>{isUnlocked(gameId) ? 'Faili za Kupakua (Download Links)' : 'Faili Zilizomo Kwenye Game Hili'}</span>
                  </span>
                  {isUnlocked(gameId) ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase border border-emerald-500/30">
                      Tayari Ziko Wazi
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-black uppercase border border-amber-500/30 flex items-center gap-1">
                      <span>🔒 Limefungwa</span>
                    </span>
                  )}
                </div>

                {isUnlocked(gameId) ? (
                  /* UNLOCKED: Shows individual download links in their ordered sequence with rotating yellow-red neon border */
                  <div className="space-y-3">
                    {game.download_links.map((dl: any, idx: number) => (
                      <a
                        key={idx}
                        href={dl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="animated-border-yellow-red group"
                      >
                        <div className="animated-border-yellow-red-inner flex items-center justify-between p-3 gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                              <Download className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold block truncate text-white">{dl.name || `Pakua Faili #${idx + 1}`}</span>
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Tayari Kupakuliwa</span>
                              </span>
                            </div>
                          </div>
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-md shadow-emerald-600/25 shrink-0 transition-colors">
                            <span>PAKUA</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  /* LOCKED: Shows as ONE single locked package / file with rotating yellow-red neon border */
                  <div 
                    onClick={() => {
                      if (game?.direct_payment_url && game.direct_payment_url.trim()) {
                        window.open(game.direct_payment_url.trim(), '_blank');
                        return;
                      }
                      setCheckoutOpen(true);
                    }}
                    className="animated-border-yellow-red cursor-pointer group"
                  >
                    <div className="animated-border-yellow-red-inner p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
                            <span className="text-sm">📁</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white group-hover:text-yellow-300 transition-colors truncate">
                              {game.title} - Complete Game Package
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Inajumuisha faili zote ({game.download_links.length} files: APK, OBB, Mods & Data)
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                          <span>🔒 Limefungwa</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>Lipia Tsh {isFree ? '0' : Number(game.price || 0).toLocaleString()} kufungua faili zote mara moja</span>
                        </span>
                        <span className="text-amber-400 font-bold group-hover:underline">
                          Lipia Sasa ➔
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 🎬 Gameplay Trailer & Demo Video Box (Trela ya Game) */}
            {game.video_url ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>🎬 Trela & Video ya Game (Gameplay Preview)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[9px] font-black uppercase border border-rose-500/30 flex items-center gap-1">
                    <span>HD Video</span>
                  </span>
                </div>

                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner">
                  {getYouTubeEmbedId(game.video_url) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeEmbedId(game.video_url)}?rel=0&modestbranding=1&playsinline=1`}
                      title={`${game.title} Trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <video
                      src={game.video_url}
                      controls
                      playsInline
                      preload="metadata"
                      poster={game.cover_image}
                      className="w-full h-full object-cover"
                    >
                      Kifaa chako hakiauni video hii moja kwa moja.
                    </video>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 text-center font-medium">
                  Tazama video fupi ya mchezo huu uone uhalisia na muundo wake kabla ya kupakua.
                </p>
              </div>
            ) : null}

            {/* Guarantees & Safe Download */}
            <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dhamana ya Chidy Prime: Game hili limekaguliwa na kuthibitishwa 100%.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Malipo ya simu (M-Pesa, Tigo, Airtel, HaloPesa) yanathibitishwa mara moja kiotomatiki.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Ufikiaji wa faili na link za kudownload unafunguka mara moja baada ya malipo.</span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Checkout Modal */}
      {game && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          game={{
            id: game.id,
            title: game.title,
            price: game.price,
            cover_image: game.cover_image,
            category: game.category,
            access_duration: game.access_duration || game.license_duration,
          }}
          isUnlocked={isUnlocked(gameId)}
          onSuccess={() => {
            refreshAccess();
          }}
        />
      )}
      {/* Floating Celebration Bubbles & Sparkles (Viputo vya Shangwe) */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {Array.from({ length: 32 }).map((_, i) => (
            <span
              key={i}
              className="absolute celebration-bubble"
              style={{
                left: `${(i * 11) % 95}%`,
                animationDelay: `${(i * 0.1)}s`,
                animationDuration: `${2.5 + (i % 5) * 0.35}s`,
                fontSize: `${20 + (i % 4) * 8}px`,
              }}
            >
              {['🎈', '✨', '🎉', '🎊', '⭐', '💎', '🟢', '🟡', '🔥', '🥳'][i % 10]}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
