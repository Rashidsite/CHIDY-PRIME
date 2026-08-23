'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Gamepad2, 
  ShieldCheck, 
  MessageCircle, 
  Youtube, 
  Instagram, 
  Facebook, 
  Sparkles, 
  Heart 
} from 'lucide-react';

export default function StorefrontFooter() {
  const pathname = usePathname();

  // Hide footer completely inside Admin Portal
  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="relative z-30 border-t border-slate-800 bg-[#060911] text-white mt-4 sm:mt-6 pt-10 pb-28 md:pb-12 shadow-[0_-10px_30px_rgba(0,0,0,0.9)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        
        {/* ── COL 1: LOGO & BRAND ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.6)]">
              <Gamepad2 className="w-6 h-6 fill-black" />
            </div>
            <div>
              <span className="text-lg font-black text-white uppercase tracking-tight block">
                chidy<span className="text-emerald-400">prime</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                × chidygaming
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            Mtandao mkuu wa digital games, simulator bus mods Tanzania, na PC games zenye huduma ya STK Push papo hapo.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Verified Digital Delivery</span>
          </div>
        </div>

        {/* ── COL 2: QUICK LINKS ── */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-emerald-500/30 pb-2">
            Vipengele Vya Haraka
          </h4>
          <ul className="space-y-2 text-xs font-bold text-slate-200">
            <li><Link href="/front" className="hover:text-emerald-400 transition-colors">🎮 Duka la Games &amp; Mods</Link></li>
            <li><Link href="/orders" className="hover:text-emerald-400 transition-colors">📦 My Orders &amp; Digital Keys</Link></li>
            <li><Link href="/profile" className="hover:text-emerald-400 transition-colors">👤 Akaunti Yangu (Profile)</Link></li>
            <li><Link href="/auth/login" className="hover:text-emerald-400 transition-colors">🔑 Log In / Register</Link></li>
          </ul>
        </div>

        {/* ── COL 3: CATEGORIES ── */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-emerald-500/30 pb-2">
            Makundi Mashuhuri
          </h4>
          <ul className="space-y-2 text-xs font-bold text-slate-200">
            <li><span className="text-emerald-400">●</span> Maleo Bus Mods TZ</li>
            <li><span className="text-emerald-400">●</span> Maleo Map Mods TZ</li>
            <li><span className="text-emerald-400">●</span> Tanzania Games</li>
            <li><span className="text-emerald-400">●</span> PC Games &amp; PS2 Android</li>
          </ul>
        </div>

        {/* ── COL 4: CONTACT & SOCIALS ── */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-blue-500/30 pb-2">
            Mawasiliano &amp; Socials
          </h4>
          <div className="space-y-2 text-xs font-bold text-slate-200">
            <a href="https://wa.me/255655361060" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-emerald-400 transition-colors min-h-[32px]">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp: +255 655 361 060</span>
            </a>
            <a href="https://youtube.com/@chidyprime" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-red-400 transition-colors min-h-[32px]">
              <Youtube className="w-4 h-4 text-red-500" />
              <span>YouTube: @chidyprime</span>
            </a>
            <a href="https://www.instagram.com/chidyprime" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-pink-400 transition-colors min-h-[32px]">
              <Instagram className="w-4 h-4 text-pink-500" />
              <span>Instagram: @chidyprime</span>
            </a>
            <a href="https://www.facebook.com/chidyprime" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-blue-400 transition-colors min-h-[32px]">
              <Facebook className="w-4 h-4 text-blue-500" />
              <span>Facebook: Chidy Prime</span>
            </a>
            <a href="https://www.tiktok.com/@chidyprime" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors min-h-[32px]">
              <span className="w-4 h-4 flex items-center justify-center font-black text-[10px] bg-slate-800 text-white rounded-full border border-slate-600">🎵</span>
              <span>TikTok: @chidyprime</span>
            </a>
          </div>

          {/* Social Media Quick Icons Row */}
          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <a href="https://www.instagram.com/chidyprime" target="_blank" rel="noopener noreferrer" title="Instagram @chidyprime" aria-label="Instagram" className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-pink-500 hover:scale-110 hover:border-pink-500 transition-all touch-manipulation">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="https://www.facebook.com/chidyprime" target="_blank" rel="noopener noreferrer" title="Facebook Chidy Prime" aria-label="Facebook" className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-blue-500 hover:scale-110 hover:border-blue-500 transition-all touch-manipulation">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="https://www.tiktok.com/@chidyprime" target="_blank" rel="noopener noreferrer" title="TikTok @chidyprime" aria-label="TikTok" className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-white hover:scale-110 hover:border-white transition-all font-bold text-sm touch-manipulation">
              🎵
            </a>
            <a href="https://youtube.com/@chidyprime" target="_blank" rel="noopener noreferrer" title="YouTube @chidyprime" aria-label="YouTube" className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-red-500 hover:scale-110 hover:border-red-500 transition-all touch-manipulation">
              <Youtube className="w-5 h-5" />
            </a>
            <a href="https://wa.me/255655361060" target="_blank" rel="noopener noreferrer" title="WhatsApp Direct" aria-label="WhatsApp" className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-emerald-400 hover:scale-110 hover:border-emerald-400 transition-all touch-manipulation">
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        </div>

      </div>

      {/* ── WHATSAPP OFFICIAL CHANNEL BANNER ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <a 
          href="https://whatsapp.com/channel/0029VaDKe8j72WTmz2iJEc2J" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3 px-6 rounded-2xl border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.01] text-xs sm:text-sm uppercase tracking-wide text-center"
        >
          <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
          <span>JIUNGE NA CHANNEL YETU YA WHATSAPP</span>
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
        </a>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-emerald-500/20 text-center text-xs text-slate-200 font-bold flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>&copy; {new Date().getFullYear()} CHIDYPRIME x CHIDY GAMING. Haki zote zimehifadhiwa.</p>
        <div className="flex items-center gap-1">
          <span>Made with</span>
          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          <span>for Tanzanian Gamers 🇹🇿</span>
        </div>
      </div>
    </footer>
  );
}
