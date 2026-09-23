'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Gamepad2, 
  Sparkles, 
  PackageCheck, 
  User, 
  MessageCircle, 
  Store, 
  Home,
  Flame,
  Search,
  ShoppingCart,
  Phone
} from 'lucide-react';
import { useCMSTheme } from './CMSThemeProvider';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Gamepad2,
  Sparkles,
  PackageCheck,
  User,
  MessageCircle,
  Store,
  Home,
  Flame,
  Search,
  ShoppingCart,
  Phone,
};

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { bottomNav, animations } = useCMSTheme();

  // Don't render on admin panel or when disabled in CMS
  if (!bottomNav.is_active || pathname.startsWith('/admin')) {
    return null;
  }

  const liveItems = (bottomNav.items ?? []).filter((item) => item.is_live);
  if (liveItems.length === 0) return null;

  // Style container variants
  let containerClasses = '';
  switch (bottomNav.style) {
    case 'cyber_neon':
      containerClasses = 'fixed bottom-4 inset-x-3 max-w-md mx-auto rounded-full bg-slate-950/95 backdrop-blur-2xl border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.45),0_10px_35px_rgba(0,0,0,0.9)] z-40 px-2 py-1.5';
      break;
    case 'obsidian':
      containerClasses = 'fixed bottom-0 inset-x-0 bg-[#050811] border-t border-slate-800/90 shadow-[0_-12px_35px_rgba(0,0,0,0.95)] z-40';
      break;
    case 'pill':
      containerClasses = 'fixed bottom-4 inset-x-3 max-w-md mx-auto rounded-full bg-slate-900/95 backdrop-blur-xl border border-blue-500/50 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(37,99,235,0.25)] z-40 px-2 py-1.5';
      break;
    case 'docked':
      containerClasses = 'fixed bottom-0 inset-x-0 bg-slate-950 border-t-2 border-blue-600/70 shadow-[0_-8px_30px_rgba(0,0,0,0.85)] z-40';
      break;
    case 'glassmorphism':
    default:
      containerClasses = 'fixed bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-2xl border-t border-slate-700/60 shadow-[0_-10px_30px_rgba(0,0,0,0.75)] z-40';
      break;
  }

  return (
    <div className={`md:hidden ${containerClasses}`}>
      <nav className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
        {liveItems.map((item) => {
          const IconComponent = ICON_MAP[item.icon] || Gamepad2;
          const targetUrl = (item.id === 'nav-chat' || item.label.toLowerCase().includes('msaada')) ? '/support' : item.url;
          const isActive = pathname === targetUrl;
          const isExternal = targetUrl.startsWith('http') || targetUrl.startsWith('//');

          const handleClick = (e: React.MouseEvent) => {
            if (targetUrl.includes('#catalog') || item.id === 'nav-all-games' || item.id === 'nav-categories') {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('cpcg_open_all_games', { detail: { category: 'ALL' } }));
                const catalogEl = document.getElementById('catalog');
                if (catalogEl) {
                  e.preventDefault();
                  catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }
            }
          };

          const content = (
            <div className="relative flex flex-col items-center justify-center py-1.5 px-3 min-w-[48px] min-h-[48px] rounded-xl transition-all duration-250 cursor-pointer touch-manipulation group">
              {/* Icon Container */}
              <div
                className={`relative p-1 rounded-lg transition-transform duration-250 ${
                  isActive
                    ? 'text-blue-400 bg-blue-600/20 scale-110'
                    : 'text-slate-200 group-hover:text-white'
                }`}
              >
                <IconComponent className="w-5 h-5" />

                {/* Badge Indicator */}
                {bottomNav.show_badge && item.badge && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm ring-1 ring-slate-950">
                    {item.badge}
                  </span>
                )}

                {/* Live Pulse Indicator if item label is Msaada or WhatsApp */}
                {animations.glowing_radar && (item.icon === 'MessageCircle' || item.id === 'nav-chat') && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-extrabold uppercase tracking-tight mt-0.5 truncate transition-colors ${
                  isActive ? 'text-blue-400' : 'text-slate-200 group-hover:text-white'
                }`}
              >
                {item.label}
              </span>
            </div>
          );

          if (isExternal) {
            return (
              <a
                key={item.id}
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex justify-center focus:outline-none min-h-[48px]"
              >
                {content}
              </a>
            );
          }

          return (
            <Link
              key={item.id}
              href={targetUrl}
              onClick={handleClick}
              className="flex-1 flex justify-center focus:outline-none min-h-[48px]"
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
