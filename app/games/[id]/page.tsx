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
import { parseSquadData, EFootballSquad } from '@/lib/efootball-squads';
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
        // Query posts table directly (Single source of truth)
        const { data: postData, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', gameId)
          .maybeSingle();

        if (error) {
          console.warn('Game fetch warning:', error.message);
        }

        if (postData) {
          const isSquadItem = 
            (postData.category || '').toLowerCase().includes('efootball') ||
            (postData.category || '').toLowerCase().includes('vikosi') ||
            (postData.title || '').toLowerCase().includes('kikosi');

          if (isSquadItem) {
            const parsedSquad = parseSquadData(postData);
            setSquad(parsedSquad);
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
          if (Array.isArray(postData.links)) {
            postData.links.forEach((l: any) => {
              if (l && (l.name === 'DIRECT_PAYMENT_URL' || l.name === 'PAYMENT_REDIRECT')) {
                if (!directPaymentUrl && l.url) directPaymentUrl = l.url;
              }
            });
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

  if (!game) {
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

                {/* Primary Buy Button with Direct Redirect */}
                {squad.is_sold ? (
                  <div className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-rose-600/20 border border-rose-500/40 text-rose-400 text-xs font-black uppercase tracking-wider text-center flex items-center justify-center">
                    KIKOSI HIKI KIMEKWISHA NUNULIWA (SOLD OUT)
                  </div>
                ) : (
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
                )}

                {/* Secondary Direct WhatsApp Contact */}
                {!squad.is_sold && (
                  <a
                    href={squad.redirect_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98] text-center"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Wasiliana na Admin WhatsApp Moja kwa Moja</span>
                  </a>
                )}
              </div>

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
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── STANDARD GAME DETAIL VIEW (PC/BUS MODS) ──
  // ═══════════════════════════════════════════════════════════════════════════
  const isFree = game.price === 0;

  return (
    <>
      <Navbar />

      <main className="main-storefront-wrapper relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-36">
        
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </Link>

        {/* Hero Product Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Cover Image */}
          <div className="lg:col-span-7 relative aspect-[16/10] w-full rounded-3xl overflow-hidden border border-glass-border shadow-glass bg-slate-900">
            <Image
              src={game.cover_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'}
              alt={game.title}
              fill
              priority
              className="object-cover object-center"
            />
          </div>

          {/* Product Details & Purchase Card */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-glass-card border border-glass-border backdrop-blur-glass space-y-6">
            
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-glow border border-brand-500/30 text-xs font-semibold">
                {game.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                {game.title}
              </h1>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{game.rating || 4.8} / 5.0 Rating</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-purple-400 block mb-0.5">
                  {formatPlanDuration(game.access_duration || game.license_duration, isFree)}
                </span>
                <span className="text-2xl font-black text-white">
                  {isUnlocked(gameId) ? (
                    <span className="text-emerald-400">UNLOCKED</span>
                  ) : isFree ? (
                    <span className="text-emerald-400">FREE DOWNLOAD</span>
                  ) : (
                    formatCurrency(game.price)
                  )}
                </span>
              </div>
              <button
                onClick={() => {
                  if (!isUnlocked(gameId) && !isFree && game?.direct_payment_url && game.direct_payment_url.trim()) {
                    window.open(game.direct_payment_url.trim(), '_blank');
                    return;
                  }
                  setCheckoutOpen(true);
                }}
                className={`px-6 py-3 text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  isUnlocked(gameId) || isFree ? getButtonClass('download') : getButtonClass('buy')
                }`}
              >
                {isUnlocked(gameId) || isFree ? (
                  <Download className="w-4 h-4 shrink-0" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-300 icon-spark-pulse shrink-0" />
                )}
                <span className="relative z-10">{isUnlocked(gameId) ? 'Pakua Sasa (Download)' : isFree ? 'Get Access' : 'Buy Now'}</span>
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% Virus-Free & Safe Download Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent-cyan" />
                <span>Automated M-Pesa & PressoPay Webhook Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* Screenshots Lightbox Section */}
        {game.screenshots && game.screenshots.length > 0 && (
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-glass-border">
            <ScreenshotGallery screenshots={game.screenshots} />
          </div>
        )}

        {/* Description & System Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Description */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-glass-border space-y-3">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Product Overview & Details
            </h3>
            <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {game.description || 'Full high-performance digital product ready for immediate download after automated mobile checkout verification.'}
            </p>
          </div>

          {/* System Requirements */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-glass-border space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-5 h-5 text-accent-cyan" />
              <span>System Requirements (PC)</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">OS:</span>
                <span className="font-semibold">{game.system_req_minimum?.os || 'Windows 10 / 11 64-Bit'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Processor:</span>
                <span className="font-semibold">{game.system_req_minimum?.cpu || 'Intel Core i5-4460'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Memory:</span>
                <span className="font-semibold">{game.system_req_minimum?.ram || '8 GB RAM'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Graphics:</span>
                <span className="font-semibold">{game.system_req_minimum?.gpu || 'NVIDIA GTX 960'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Storage:</span>
                <span className="font-semibold">{game.system_req_minimum?.storage || '10 GB available space'}</span>
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
