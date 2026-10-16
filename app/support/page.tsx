'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  ExternalLink
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
  const whatsappNumber = '255655361060';
  const whatsappDisplay = '+255 655 361 060';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    'Habari Chidy, nahitaji msaada kuhusu huduma za ChidyPrime x ChidyGaming.'
  )}`;

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
        console.warn('Background settings load error:', err);
      }
    }
    loadBgSettings();
  }, []);

  return (
    <>
      <BackgroundOverlay
        imageUrl={bgSettings.image_url}
        opacity={bgSettings.opacity}
        enabled={bgSettings.enabled}
      />

      <Navbar />

      <main className="relative z-20 min-h-[calc(100vh-64px)] flex items-center justify-center px-3 sm:px-6 py-6 sm:py-12">
        <div className="w-full max-w-2xl mx-auto">
          {/* Main Card */}
          <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden p-6 sm:p-10 text-center">
            
            {/* Top Glow Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-emerald-500/15 blur-3xl pointer-events-none rounded-full" />

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
              DAWATI LA MSAADA <span className="text-emerald-400">WHATSAPP</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mb-6">
              <strong className="text-slate-200">ChidyPrime × ChidyGaming</strong> • Official Help Desk
            </p>

            {/* Maelezo Machache (Concise friendly explanation) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-slate-300 text-xs sm:text-sm leading-relaxed text-center sm:text-left space-y-2 mb-8">
              <p>
                Karibu sana gamer! Naitwa <strong className="text-white">Chidy</strong>. Kama umekwama kupakua au ku-set mchezo wako, unahitaji msaada kuhusu malipo, au unataka kuulizia game lolote, wasiliana nami moja kwa moja kupitia WhatsApp.
              </p>
              <p className="text-emerald-400 font-semibold text-xs sm:text-sm">
                💬 Nitazungumza nawe moja kwa moja WhatsApp kukusaidia papo hapo bila chenga!
              </p>
            </div>

            {/* SINGLE PROMINENT WHATSAPP BUTTON */}
            <div className="mb-8">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black uppercase text-sm sm:text-base tracking-wider shadow-[0_0_35px_rgba(16,185,129,0.4)] hover:shadow-[0_0_45px_rgba(16,185,129,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-xl bg-slate-950/20 text-slate-950">
                    <MessageCircle className="w-6 h-6 fill-slate-950" />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">WASILIANA NASI WHATSAPP</div>
                    <div className="text-[11px] sm:text-xs font-bold opacity-80 font-mono tracking-normal lowercase">
                      {whatsappDisplay} • Bonyeza kuanza chat
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 ml-1 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
              </a>
            </div>

            {/* Quick Benefits / Assurance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-left">
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-bold text-white uppercase">Majibu ya Haraka</h4>
                  <p className="text-[10px] text-slate-400">Tunajibu meseji yako moja kwa moja bila foleni.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5">
                <Gamepad2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-bold text-white uppercase">Msaada wa Kuset</h4>
                  <p className="text-[10px] text-slate-400">Maelekezo rahisi ya kuweka game kwenye simu au PC.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-bold text-white uppercase">Uhakiki wa Malipo</h4>
                  <p className="text-[10px] text-slate-400">Tuma screenshot ya malipo utatuliwe mara moja.</p>
                </div>
              </div>
            </div>

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
    </>
  );
}