'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import BackgroundOverlay from '@/components/BackgroundOverlay';
import { 
  MessageCircle, 
  Headphones, 
  ShieldCheck, 
  Zap, 
  Gamepad2, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  Video,
  AlertTriangle,
  ShoppingBag,
  Search,
  X,
  Phone,
  Lock,
  Check,
  Share2,
  ReceiptCheck,
  Tag
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { 
  DEFAULT_SUPPORT_CONFIG, 
  SupportConfig, 
  getYouTubeEmbedUrl 
} from '@/lib/supportDefaults';

// Icon Map helper for dynamic feature icons
const iconMap: Record<string, React.ComponentType<any>> = {
  Zap,
  Gamepad2,
  ShieldCheck,
  MessageCircle,
  Headphones,
  Clock,
  CheckCircle2,
  Sparkles,
};

interface PaidOrderDetails {
  id: string;
  order_number?: string;
  game_title?: string;
  amount?: number;
  phone?: string;
  customer_name?: string;
  created_at?: string;
}

export default function SupportPage() {
  const [config, setConfig] = useState<SupportConfig>(DEFAULT_SUPPORT_CONFIG);
  const [bgSettings, setBgSettings] = useState<{
    enabled: boolean;
    image_url: string;
    opacity: number;
  }>({
    enabled: true,
    image_url: '/game_controller_bg.jpg',
    opacity: 0.45,
  });

  const [hasPaidOrder, setHasPaidOrder] = useState<boolean | null>(null);
  const [checkingOrders, setCheckingOrders] = useState(true);
  const [latestOrder, setLatestOrder] = useState<PaidOrderDetails | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  
  // Phone verification state for users who paid as guest
  const [phoneSearch, setPhoneSearch] = useState('');
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneVerifiedStatus, setPhoneVerifiedStatus] = useState<'idle' | 'found' | 'not_found'>('idle');

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      // 1. Load Background Settings
      try {
        const { data: bgData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'custom_background')
          .maybeSingle();

        if (bgData?.value) {
          setBgSettings({
            enabled: bgData.value.enabled ?? true,
            image_url: bgData.value.image_url || '/game_controller_bg.jpg',
            opacity: bgData.value.opacity ?? 0.45,
          });
        }
      } catch (err) {
        console.warn('Background settings load error:', err);
      }

      // 2. Load Support Config
      try {
        const { data: supportData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'support_page_config')
          .maybeSingle();

        if (supportData?.value) {
          setConfig({
            ...DEFAULT_SUPPORT_CONFIG,
            ...supportData.value,
          });
        }
      } catch (err) {
        console.warn('Support config load error:', err);
      }

      // 3. Check User Orders Status & Load latest purchase details
      try {
        setCheckingOrders(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const userMeta = session.user.user_metadata || {};
          const detectedName = userMeta.full_name || userMeta.name || userMeta.username || session.user.email?.split('@')[0] || '';
          setUserName(detectedName);

          const { data: paidOrders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', session.user.id)
            .in('status', ['paid', 'completed', 'approved'])
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && paidOrders && paidOrders.length > 0) {
            const ord = paidOrders[0];
            setHasPaidOrder(true);
            setLatestOrder({
              id: ord.id,
              order_number: ord.order_number,
              game_title: ord.game_title || ord.post_title || ord.title || 'Game ya ChidyPrime',
              amount: ord.amount,
              phone: ord.visitor_phone || ord.phone_number,
              customer_name: ord.customer_name || detectedName,
              created_at: ord.created_at,
            });
          } else {
            setHasPaidOrder(false);
          }
        } else {
          // Check if admin is logged in locally
          const isAdmin = typeof window !== 'undefined' && 
            (localStorage.getItem('cpcg_admin_authenticated') === 'true' || !!localStorage.getItem('cpcg_admin_session'));
          
          if (isAdmin) {
            setHasPaidOrder(true);
            setUserName('Admin');
            setLatestOrder({
              id: 'ADMIN',
              game_title: 'Msaada wa Mfumo (Admin Support)',
              customer_name: 'Admin HQ',
            });
          } else {
            // Check if user has cached verified phone or order
            const cachedPhone = typeof window !== 'undefined' ? localStorage.getItem('cpcg_user_phone') : null;
            if (cachedPhone) {
              const digits = cachedPhone.replace(/\D/g, '');
              const clean = digits.startsWith('0') ? '255' + digits.slice(1) : (digits.startsWith('255') ? digits : '255' + digits);
              const local = clean.startsWith('255') ? '0' + clean.slice(3) : clean;

              const { data: cachedPaidOrders } = await supabase
                .from('orders')
                .select('*')
                .or(`visitor_phone.eq.${clean},visitor_phone.eq.${local},phone_number.eq.${clean},phone_number.eq.${local}`)
                .in('status', ['paid', 'completed', 'approved'])
                .order('created_at', { ascending: false })
                .limit(1);

              if (cachedPaidOrders && cachedPaidOrders.length > 0) {
                const ord = cachedPaidOrders[0];
                setHasPaidOrder(true);
                setLatestOrder({
                  id: ord.id,
                  order_number: ord.order_number,
                  game_title: ord.game_title || ord.post_title || ord.title || 'Game ya ChidyPrime',
                  amount: ord.amount,
                  phone: ord.visitor_phone || ord.phone_number || clean,
                  customer_name: ord.customer_name || 'Mteja Rasmi',
                  created_at: ord.created_at,
                });
              } else {
                setHasPaidOrder(false);
              }
            } else {
              setHasPaidOrder(false);
            }
          }
        }
      } catch (err) {
        console.error('Error checking paid orders:', err);
        setHasPaidOrder(false);
      } finally {
        setCheckingOrders(false);
      }
    }

    loadData();
  }, [supabase]);

  // Handle WhatsApp Click
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    // If not verified to have paid orders, prevent navigation and open warning modal
    if (!hasPaidOrder) {
      e.preventDefault();
      setShowUnpaidModal(true);
    }
  };

  // Phone lookup verification for guest users
  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneSearch.trim()) return;

    setPhoneVerifying(true);
    setPhoneVerifiedStatus('idle');

    try {
      const digits = phoneSearch.replace(/\D/g, '');
      const clean = digits.startsWith('0') ? '255' + digits.slice(1) : (digits.startsWith('255') ? digits : '255' + digits);
      const local = clean.startsWith('255') ? '0' + clean.slice(3) : clean;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`visitor_phone.eq.${clean},visitor_phone.eq.${local},phone_number.eq.${clean},phone_number.eq.${local}`)
        .in('status', ['paid', 'completed', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const ord = data[0];
        setPhoneVerifiedStatus('found');
        setHasPaidOrder(true);
        setLatestOrder({
          id: ord.id,
          order_number: ord.order_number,
          game_title: ord.game_title || ord.post_title || ord.title || 'Game ya ChidyPrime',
          amount: ord.amount,
          phone: ord.visitor_phone || ord.phone_number || clean,
          customer_name: ord.customer_name || 'Mteja Rasmi',
          created_at: ord.created_at,
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('cpcg_user_phone', clean);
        }
      } else {
        setPhoneVerifiedStatus('not_found');
      }
    } catch (err) {
      console.error('Phone verification error:', err);
      setPhoneVerifiedStatus('not_found');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const whatsappCleanNumber = config.whatsapp_number ? config.whatsapp_number.replace(/\D/g, '') : '255655361060';

  // Build the rich WhatsApp pre-filled message with all purchase & customer details
  let dynamicWhatsAppMessage = config.whatsapp_message || 'Habari Chidy, nahitaji msaada kuhusu huduma za Chidy Prime.';

  if (latestOrder) {
    const gameName = latestOrder.game_title || 'Game ya ChidyPrime';
    const orderNum = latestOrder.order_number || '';
    const phone = latestOrder.phone || '';
    const amountStr = latestOrder.amount !== undefined ? `TZS ${Number(latestOrder.amount).toLocaleString()}` : '';
    const nameStr = latestOrder.customer_name || userName || '';

    dynamicWhatsAppMessage = `Habari Chidy, nahitaji msaada kuhusu oda yangu:\n\n` +
      `🎮 Game: ${gameName}\n` +
      (amountStr ? `💰 Kiasi Kilicholipwa: ${amountStr}\n` : '') +
      (orderNum ? `🆔 Namba ya Oda: ${orderNum}\n` : '') +
      (phone ? `📱 Namba ya Mteja: ${phone}\n` : '') +
      (nameStr ? `👤 Jina la Mteja: ${nameStr}\n` : '') +
      `\nNahitaji maelekezo ya kupakua au ku-set mchezo wangu.`;
  }

  const whatsappUrl = `https://wa.me/${whatsappCleanNumber}?text=${encodeURIComponent(dynamicWhatsAppMessage)}`;

  const activeVideos = (config.videos || []).filter((v) => v.is_active);
  const activeSocials = (config.social_links || []).filter((s) => s.is_active);
  const activeFeatures = (config.features || []).filter((f) => f.is_active);

  return (
    <>
      <BackgroundOverlay
        imageUrl={bgSettings.image_url}
        opacity={bgSettings.opacity}
        enabled={bgSettings.enabled}
      />

      <Navbar />

      <main className="relative z-20 min-h-[calc(100vh-64px)] flex items-center justify-center px-3 sm:px-6 py-8 sm:py-14">
        <div className="w-full max-w-3xl mx-auto">
          {/* Main Card */}
          <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-[0_0_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden p-6 sm:p-10 text-center">
            
            {/* Top Glow Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-emerald-500/15 blur-3xl pointer-events-none rounded-full" />

            {/* Status Header Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-black uppercase tracking-wider mb-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span>HEWANI WHATSAPP 24/7</span>
            </div>

            {/* Glowing WhatsApp Icon Avatar */}
            <div className="mx-auto relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 via-green-500 to-teal-400 p-1 shadow-[0_0_35px_rgba(16,185,129,0.45)] mb-6">
              <div className="w-full h-full rounded-[22px] bg-slate-950 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight uppercase mb-2">
              {config.page_title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mb-6">
              <strong className="text-slate-200">{config.page_subtitle}</strong>
            </p>

            {/* Welcome Message Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-slate-300 text-xs sm:text-sm leading-relaxed text-center sm:text-left space-y-2 mb-8">
              <p>{config.welcome_text}</p>
              {config.welcome_highlight && (
                <p className="text-emerald-400 font-bold text-xs sm:text-sm">
                  {config.welcome_highlight}
                </p>
              )}
            </div>

            {/* 📺 VIDEO SECTION (TUTORIALS) */}
            {activeVideos.length > 0 && (
              <div className="mb-10 text-left space-y-4">
                <div className="flex items-center gap-2.5 px-1">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      📺 Video za Muongozo (Tutorials)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Tazama video hizi kabla ya kuuliza msaada ili upate ufumbuzi wa haraka
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  {activeVideos.map((video) => {
                    const embedUrl = getYouTubeEmbedUrl(video.youtube_url);
                    return (
                      <div
                        key={video.id}
                        className="rounded-2xl bg-slate-950/70 border border-slate-800/90 overflow-hidden shadow-lg group hover:border-emerald-500/40 transition-colors"
                      >
                        <div className="aspect-video w-full bg-black relative">
                          {embedUrl ? (
                            <iframe
                              src={embedUrl}
                              title={video.title}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                              Video haipatikani
                            </div>
                          )}
                        </div>
                        <div className="p-4 space-y-1">
                          <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
                            {video.title}
                          </h4>
                          {video.description && (
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {video.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* If Verified & Order Loaded, show Order Badge Preview */}
            {hasPaidOrder && latestOrder && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[11px] font-black uppercase text-emerald-300 tracking-wider">
                      Uhakiki wa Malipo Umekamilika
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{latestOrder.game_title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
                    {latestOrder.amount !== undefined && (
                      <span>Bei: <strong className="text-emerald-400 font-mono">TZS {Number(latestOrder.amount).toLocaleString()}</strong></span>
                    )}
                    {latestOrder.order_number && (
                      <span>Oda #: <strong className="text-slate-300 font-mono">{latestOrder.order_number}</strong></span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-[11px] font-semibold text-emerald-400/90 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                  ✓ Taarifa zitatumwa WhatsApp
                </div>
              </div>
            )}

            {/* SINGLE PROMINENT WHATSAPP BUTTON (NO RAW PHONE DISPLAY) */}
            <div className="mb-8">
              <a
                href={whatsappUrl}
                onClick={handleWhatsAppClick}
                target={hasPaidOrder ? '_blank' : undefined}
                rel={hasPaidOrder ? 'noopener noreferrer' : undefined}
                className="group relative inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black uppercase text-sm sm:text-base tracking-wider shadow-[0_0_35px_rgba(16,185,129,0.4)] hover:shadow-[0_0_45px_rgba(16,185,129,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-xl bg-slate-950/20 text-slate-950">
                    <MessageCircle className="w-6 h-6 fill-slate-950" />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight flex items-center gap-2">
                      <span>WASILIANA NASI WHATSAPP</span>
                      {!hasPaidOrder && !checkingOrders && (
                        <span className="p-0.5 rounded bg-slate-950/30 text-[10px]">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    {/* Security: No phone number is displayed publicly to prevent unauthorized calls */}
                    <div className="text-[11px] sm:text-xs font-bold opacity-85 tracking-normal">
                      {hasPaidOrder 
                        ? '💬 Msaada wa Moja kwa Moja • Bonyeza Kuanza Chat' 
                        : '🔒 Msaada Rasmi • Unahitaji Kuwa na Oda Iliyolipwa'}
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 ml-1 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
              </a>

              {/* Status helper under button */}
              <div className="mt-3 text-[11px] text-slate-400">
                {checkingOrders ? (
                  <span className="animate-pulse">Inakagua hali ya akaunti yako...</span>
                ) : hasPaidOrder ? (
                  <span className="text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Akaunti imethibitishwa! Taarifa za game lako zimeunganishwa moja kwa moja kwenye ujumbe wa WhatsApp.</span>
                  </span>
                ) : (
                  <span className="text-amber-400/90 font-medium flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Msaada wa WhatsApp unafunguka baada ya kulipia game lolote.</span>
                  </span>
                )}
              </div>
            </div>

            {/* SOCIAL MEDIA PILLS */}
            {activeSocials.length > 0 && (
              <div className="mb-8 pt-4 border-t border-slate-800/80">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-3">
                  Mitandao Yetu Rasmi
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {activeSocials.map((soc) => (
                    <a
                      key={soc.id}
                      href={soc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-sm"
                    >
                      <Share2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>{soc.label}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Benefits / Assurance */}
            {activeFeatures.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-left">
                {activeFeatures.map((feat) => {
                  const Icon = iconMap[feat.icon] || Zap;
                  return (
                    <div
                      key={feat.id}
                      className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5"
                    >
                      <Icon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[11px] font-bold text-white uppercase">{feat.title}</h4>
                        <p className="text-[10px] text-slate-400 leading-normal">{feat.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Back Link */}
            <div className="mt-8 pt-4">
              <Link
                href="/front"
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors py-2 px-4 rounded-xl hover:bg-slate-800/50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Rudi Kwenye Duka (Store)</span>
              </Link>
            </div>

          </div>
        </div>
      </main>

      {/* ⚠️ MODAL: UNPAID USER WARNING & PHONE VERIFICATION */}
      <AnimatePresence>
        {showUnpaidModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUnpaidModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.25)] z-10 text-center space-y-5"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowUnpaidModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Warning Icon Avatar */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <AlertTriangle className="w-8 h-8" />
              </div>

              {/* Title & Message */}
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  {config.unpaid_warning_title || '⚠️ LIPIA GAME KWANZA!'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {config.unpaid_warning_message}
                </p>
              </div>

              {/* Action: Go Buy Game */}
              <div className="space-y-2">
                <Link
                  href="/front"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Rudi Kwenye Duka Kununua Game</span>
                </Link>
              </div>

              {/* Alternative: Phone Number Verification */}
              <div className="pt-4 border-t border-slate-800 text-left space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ulipia bila kuingia kwenye akaunti?</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ingiza namba uliyolipia (e.g. 07... au 255...) ili mfumo uhakiki oda yako moja kwa moja:
                </p>

                <form onSubmit={handleVerifyPhone} className="flex gap-2">
                  <input
                    type="text"
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    placeholder="07XXXXXXXX au 255..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={phoneVerifying}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {phoneVerifying ? (
                      <span>...</span>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Hakiki</span>
                      </>
                    )}
                  </button>
                </form>

                {phoneVerifiedStatus === 'found' && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>Uhakiki Umefaulu! Oda imepatikana.</span>
                    </div>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-emerald-300 cursor-pointer"
                    >
                      Fungua WhatsApp
                    </a>
                  </div>
                )}

                {phoneVerifiedStatus === 'not_found' && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Hatukupata oda iliyolipwa kwa namba hii. Tafadhali hakikisha au nunua game kwanza.</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
