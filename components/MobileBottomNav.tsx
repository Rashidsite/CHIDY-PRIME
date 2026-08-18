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
    case 'obsidian':
      containerClasses = 'fixed bottom-0 inset-x-0 bg-[#060911] border-t border-slate-800/90 shadow-[0_-10px_30px_rgba(0,0,0,0.85)] z-40';
      break;
    case 'pill':
      containerClasses = 'fixed bottom-4 inset-x-3 max-w-md mx-auto rounded-full bg-slate-900/95 backdrop-blur-xl border border-blue-500/40 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-40 px-2 py-1.5';
      break;
    case 'docked':
      containerClasses = 'fixed bottom-0 inset-x-0 bg-black border-t border-slate-800 shadow-2xl z-40';
      break;
    case 'glassmorphism':
    default:
      containerClasses = 'fixed bottom-0 inset-x-0 bg-slate-950/85 backdrop-blur-lg border-t border-slate-800/80 shadow-[0_-8px_25px_rgba(0,0,0,0.7)] z-40';
      break;
  }

  return (
    <div className={`md:hidden ${containerClasses}`}>
      <nav className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
        {liveItems.map((item) => {
          const IconComponent = ICON_MAP[item.icon] || Gamepad2;
          const isActive = pathname === item.url || (item.url.startsWith('#') && false);
          const isExternal = item.url.startsWith('http') || item.url.startsWith('//');

          const handleClick = (e: React.MouseEvent) => {
            if (item.url.includes('#catalog') || item.id === 'nav-all-games' || item.id === 'nav-categories') {
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
            <div className="relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-250 cursor-pointer touch-manipulation group">
              {/* Icon Container */}
              <div
                className={`relative p-1 rounded-lg transition-transform duration-250 ${
                  isActive
                    ? 'text-blue-400 bg-blue-600/20 scale-110'
                    : 'text-slate-400 group-hover:text-slate-200'
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
                {animations.glowing_radar && item.icon === 'MessageCircle' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-extrabold uppercase tracking-tight mt-0.5 truncate transition-colors ${
                  isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
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
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex justify-center focus:outline-none"
              >
                {content}
              </a>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.url}
              onClick={handleClick}
              className="flex-1 flex justify-center focus:outline-none"
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
