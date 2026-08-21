'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BackgroundOverlay from '@/components/BackgroundOverlay';
import { 
  Headphones, 
  MessageCircle, 
  Phone, 
  Mail, 
  AlertTriangle, 
  CreditCard, 
  Zap, 
  ShieldCheck, 
  PackageCheck, 
  Gamepad2, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SupportPage() {
  const [bgSettings, setBgSettings] = useState<{
    enabled: boolean;
    image_url: string;
    opacity: number;
  }>({
    enabled: true,
    image_url: '/game_controller_bg.jpg',
    opacity: 0.45,
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadBgSettings() {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'custom_background')
          .maybeSingle();
        if (data?.value) {
          setBgSettings({
            enabled: data.value.enabled ?? true,
            image_url: data.value.image_url || '/game_controller_bg.jpg',
            opacity: data.value.opacity ?? 0.45,
          });
        }
      } catch (err) {
        console.warn('Background settings warning:', err);
      }
    }
    loadBgSettings();
  }, [supabase]);

  return (
    <>
      <BackgroundOverlay
        imageUrl={bgSettings.image_url}
        opacity={bgSettings.opacity}
        enabled={bgSettings.enabled}
      />

      <Navbar />

      <main className="main-storefront-wrapper relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 pb-36">
        
        {/* ── HEADER SECTION ── */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(37,99,235,0.25)]">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>CHIDYPRIME x CHIDYGAMING SUPPORT HQ</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>🟢 Tuko Hewani Masaa 24/7</span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <Headphones className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 shrink-0" />
              <span>Kituo cha Msaada & Huduma kwa Wateja</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-2xl">
              Karibu kwenye dawati kuu la msaada la <strong className="text-white">Chidy Prime & Chidy Gaming TZ</strong>. Ikiwa umepata changamoto yoyote wakati wa ununuzi, malipo ya simu, au upakuaji wa files na mods, chagua kitengo unachohitaji hapa chini tukusaidie mara moja.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Majibu ya Haraka Ndani ya Dakika 1-5
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              100% Guaranteed Digital Delivery
            </span>
          </div>
        </div>

        {/* ── PRIMARY INTERACTIVE SUPPORT CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          
          {/* CARD 1: NIMELIPA SIJAPATA GAME */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-amber-500/30 hover:border-amber-500/60 p-6 sm:p-7 shadow-[0_10px_30px_rgba(245,158,11,0.1)] flex flex-col justify-between space-y-6 group transition-all duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  MSAADA WA ODA
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase group-hover:text-amber-300 transition-colors">
                  ⚠️ Nimelipa Sijapata Game
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                  Ikiwa umekamilisha muamala wa simu na link ya kupakua au kuweka haijafunguka mara moja, bonyeza hapa chini tukuhudumie papo hapo.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href="https://wa.me/255655361060?text=Habari%20CHIDYPRIME,%20nimelipia%20game%20lakini%20sijapata%20link/access.%20Namba%20yangu%20ya%20malipo%20ni..."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer touch-manipulation group/btn active:scale-98"
              >
                <MessageCircle className="w-5 h-5 text-white fill-white shrink-0 group-hover/btn:scale-110 transition-transform" />
                <span>💬 Msaada wa Oda WhatsApp</span>
                <ExternalLink className="w-4 h-4 opacity-70" />
              </a>

              <Link
                href="/orders"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <PackageCheck className="w-4 h-4 text-cyan-400" />
                <span>Au Angalia Oda Zako Kiotomatiki Hapa &rarr;</span>
              </Link>
            </div>
          </div>

          {/* CARD 2: NIMESHINDWA KULIPIA GAME */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-cyan-500/30 hover:border-cyan-500/60 p-6 sm:p-7 shadow-[0_10px_30px_rgba(6,182,212,0.1)] flex flex-col justify-between space-y-6 group transition-all duration-300">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  MSAADA WA MALIPO
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase group-hover:text-cyan-300 transition-colors">
                  💳 Nimeshindwa Kulipia Game
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                  Unapata changamoto ya kukataliwa muamala, namba ya siri (STK Push) haitokei, au unahitaji kulipa kwa njia mbadala? Wasiliana nasi haraka.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href="https://wa.me/255655361060?text=Habari%20CHIDYPRIME,%20nimeshindwa%20kukamilisha%20malipo%20ya%20game.%20Naomba%20msaada..."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer touch-manipulation group/btn active:scale-98"
              >
                <Zap className="w-5 h-5 text-white fill-white shrink-0 group-hover/btn:scale-110 transition-transform" />
                <span>⚡ Msaada wa Malipo WhatsApp</span>
                <ExternalLink className="w-4 h-4 opacity-70" />
              </a>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center text-[11px] text-slate-400 font-medium">
                Tunapokea M-Pesa, TigoPesa, Airtel Money & Halopesa
              </div>
            </div>
          </div>

        </div>

        {/* ── DIRECT CALL & SMS EMERGENCY SECTION ── */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-tight">
                🚨 Mawasiliano ya Haraka ya Dharura (SMS & Call)
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Ikiwa hauna internet au unahitaji usaidizi wa sauti wa papo hapo:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Direct SMS */}
            <a
              href="sms:+255796615257?body=Habari%20CHIDYPRIME,%20nahitaji%20msaada%20kuhusu..."
              className="py-3.5 px-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-200 hover:text-white font-extrabold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98"
            >
              <Mail className="w-4 h-4 text-cyan-400" />
              <span>✉️ Tuma SMS ya Kawaida: 0796615257</span>
            </a>

            {/* Direct Call */}
            <a
              href="tel:+255796615257"
              className="py-3.5 px-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-200 hover:text-white font-extrabold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>📞 Piga Simu Moja kwa Moja: 0796615257</span>
            </a>
          </div>
        </div>

        {/* ── QUICK SELF-SERVICE HUB ── */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 space-y-3">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Viungo vya Haraka vya Kujihudumia:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/front"
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-between transition-colors group"
            >
              <span className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-blue-400" />
                <span>Rudi Kwenye Duka</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/explore"
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-between transition-colors group"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Tazama Games Mpya</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/orders"
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-between transition-colors group"
            >
              <span className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                <span>Kagua Namba ya Oda</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>

      </main>
    </>
  );
}