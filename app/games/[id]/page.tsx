'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ScreenshotGallery from '@/components/ScreenshotGallery';
import CheckoutModal from '@/components/CheckoutModal';
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

          setGame({
            id: postData.id,
            title: postData.title || 'Untitled Game',
            description: postData.description || '',
            cover_image: rawCover,
            price: Number(postData.price) || 0,
            rating: Number(postData.rating) || 4.8,
            category: postData.category || 'MALEO BUS MODE TZ',
            screenshots: rawScreenshots.length > 0 ? rawScreenshots : [rawCover],
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
                className="relative aspect-[4/3] sm:aspect-[16/10] w-full rounded-3xl overflow-hidden border border-blue-500/30 shadow-[0_0_40px_rgba(37,99,235,0.2)] bg-gradient-to-b from-[#0a1c38] via-[#051124] to-[#020712] p-2 flex items-center justify-center group cursor-pointer"
                onClick={() => setLightboxOpen(true)}
              >
                <Image
                  src={squad.cover_image}
                  alt={squad.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 700px"
                  className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                />

                {/* Overlaid Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1.5 rounded-xl bg-blue-600/90 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider border border-blue-400/40 shadow-lg flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>STRENGTH {squad.team_strength}</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-indigo-400/40 shadow-md">
                      ⚽ EFOOTBALL SQUAD
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider backdrop-blur-md border shadow-lg ${
                      squad.is_sold
                        ? 'bg-rose-500/90 text-white border-rose-400/40'
                        : 'bg-emerald-500/90 text-white border-emerald-400/40'
                    }`}
                  >
                    {squad.is_sold ? 'SOLD OUT' : 'INAPATIKANA SASA'}
                  </span>
                </div>

                {/* Bottom Zoom Prompt */}
                <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md text-[10px] font-black text-blue-300 border border-blue-500/40 uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Bofya Kukuza Picha (Full HD Zoom)</span>
                </div>
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

                  <div className="space-y-2">
                    {squad.download_links.map((dl, idx) => (
                      isUnlocked(gameId) ? (
                        <a
                          key={idx}
                          href={dl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-400 text-white transition-all group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                              <Download className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold">{dl.name || `Download File #${idx + 1}`}</span>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                        </a>
                      ) : (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-300 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">📁</span>
                            <span className="font-semibold">{dl.name || `Kikosi Data #${idx + 1}`}</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            🔒 Baada ya Kulipia
                          </span>
                        </div>
                      )
                    ))}
                  </div>
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

          {/* Description & Handover Instructions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            
            {/* Squad Description */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-blue-400" />
                <span>Maelezo ya Kikosi & Wachezaji</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                {squad.description || 'Kikosi hiki kiko tayari. Wachezaji wote wamepandishwa viwango (Max Trained) na mfumo wa uchezaji umewekwa kikamilifu kwa ajili ya mechi za mtandaoni na division.'}
              </p>
            </div>

            {/* Handover Steps */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Hatua za Kupokea Kikosi Baada ya Kulipia</span>
              </h3>
              
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <span>Bofya kitufe cha <strong>&quot;Nunua Kikosi&quot;</strong> hapo juu ili kuwasiliana au kulipia.</span>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <span>Tuma uthibitisho wa malipo kwa Admin kupitia WhatsApp.</span>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <span>Admin atakupatia taarifa za kuingia (Konami ID) na kukuongoza kubadili email na password yako mara moja.</span>
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
              className="relative aspect-[4/3] sm:aspect-[16/10] w-full rounded-3xl overflow-hidden border border-blue-500/30 shadow-[0_0_40px_rgba(37,99,235,0.2)] bg-gradient-to-b from-[#0a1c38] via-[#051124] to-[#020712] p-2 flex items-center justify-center group cursor-pointer"
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
                className="object-contain relative z-10 transition-transform duration-500 group-hover:scale-[1.02]"
              />

              {/* Overlaid Badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none z-20">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1.5 rounded-xl bg-blue-600/90 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider border border-blue-400/40 shadow-lg flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    <span>{game.category}</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-indigo-400/40 shadow-md">
                    🎮 FULL VERSION
                  </span>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider backdrop-blur-md border shadow-lg ${
                    isUnlocked(gameId)
                      ? 'bg-emerald-500/90 text-white border-emerald-400/40'
                      : 'bg-blue-600/90 text-white border-blue-400/40'
                  }`}
                >
                  {isUnlocked(gameId) ? 'IMEFUNGULIWA' : 'INAPATIKANA SASA'}
                </span>
              </div>

              {/* Tap to Zoom indicator */}
              <div className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/60 text-slate-300 text-xs font-bold flex items-center gap-1.5 opacity-85 group-hover:opacity-100 transition-opacity backdrop-blur-md">
                <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                <span>BOFYA KUKUZA PICHA (FULL HD ZOOM)</span>
              </div>
            </div>

            {/* In-Game Screenshots Strip with Horizontal Scroll */}
            {allScreenshots.length > 1 && (
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>PICHA ZA NDANI YA MCHEZO (SCREENSHOTS):</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Bofya kukuza</span>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
                  {allScreenshots.map((shot: string, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setActiveGalleryImg(shot);
                        setLightboxOpen(true);
                      }}
                      className="relative w-24 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0 cursor-pointer hover:border-blue-400 transition-colors p-0.5"
                    >
                      <Image src={shot} alt={`Picha ${idx + 1}`} fill className="object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            )}
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

            {/* Game Specifications Grid */}
            <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Jukwaa (Platform):</span>
                <p className="font-black text-blue-400 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-blue-400" />
                  <span>{game.category?.toLowerCase().includes('pc') ? 'PC / Windows' : 'Android / iOS'}</span>
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Hali ya Mchezo:</span>
                <p className="font-black text-emerald-400 flex items-center gap-1">
                  <span>📶 Offline (Bila Data)</span>
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Usalama wa Faili:</span>
                <p className="font-black text-purple-400 flex items-center gap-1">
                  <span>🛡️ 100% Virus-Free</span>
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Upakuaji:</span>
                <p className="font-black text-amber-400 flex items-center gap-1">
                  <span>⚡ Papo Hapo (Direct)</span>
                </p>
              </div>
            </div>

            {/* Price & Primary Action Button */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 space-y-4">
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
                  <span className="relative z-10 font-black">{isFree ? 'PAKUA BURE' : 'NUNUA GAME'}</span>
                </button>
              )}

              {/* Secondary Direct WhatsApp Contact */}
              {!isUnlocked(gameId) && !isFree && (
                <a
                  href={`https://wa.me/255655361060?text=${encodeURIComponent(`Habari Chidy Prime, nahitaji msaada wa kununua game ya: ${game.title} (TSh ${game.price.toLocaleString()})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98] text-center"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Wasiliana na Admin WhatsApp Moja kwa Moja</span>
                </a>
              )}
            </div>

            {/* THE KEY ATTRACTION: Faili Zilizomo Kwenye Game Hili (Locked vs Unlocked Downloads) */}
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
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-black uppercase border border-amber-500/30 flex items-center gap-1">
                      <span>🔒 Zimefungwa</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {game.download_links.map((dl: any, idx: number) => (
                    isUnlocked(gameId) ? (
                      <a
                        key={idx}
                        href={dl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-400 text-white transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold">{dl.name || `Pakua Faili #${idx + 1}`}</span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                      </a>
                    ) : (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-300 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">📁</span>
                          <span className="font-semibold">{dl.name || `Game Data #${idx + 1}`}</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          🔒 Baada ya Kulipia
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

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

        {/* Description & Installation Instructions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
          {/* Game Description */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-blue-400" />
              <span>Maelezo ya Game & Vipengele</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {game.description || 'Game hili limetengenezwa kwa umakini mkubwa likiwa na mods za Tanzania, graphics za hali ya juu na limeboreshwa kucheza bila kukwama.'}
            </p>
          </div>

          {/* Installation Steps */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Hatua Rahisi za Kupakua na Ku-Install</span>
            </h3>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-black flex items-center justify-center shrink-0">1</span>
                <div>
                  <strong className="text-white block font-bold">Lipa kwa Simu:</strong>
                  <span>Bonyeza kitufe cha <strong>"NUNUA GAME"</strong> hapo juu na weka namba yako ya simu kulipia kwa M-Pesa, Tigo, Airtel au Halopesa.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center justify-center shrink-0">2</span>
                <div>
                  <strong className="text-white block font-bold">Fungua Faili Zilizofungwa:</strong>
                  <span>Malipo yakikamilika, orodha ya faili hapo juu itafunguka mara moja na unaweza kubonyeza <strong>"Pakua Faili"</strong>.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/30 text-xs font-black flex items-center justify-center shrink-0">3</span>
                <div>
                  <strong className="text-white block font-bold">Anza Kucheza:</strong>
                  <span>Extract au install mafaili uliyopakua kwenye simu au PC yako kulingana na maelekezo, kisha furahia game!</span>
                </div>
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
    </>
  );
}
