'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, 
  Search, 
  User, 
  Menu, 
  X, 
  LogOut,
  PackageCheck,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  LogIn,
  Download,
  Phone
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GameProduct } from './GameCard';
import { formatCurrency } from '@/lib/utils';
import { usePWA } from './PWAProvider';
import { useAuth } from './AuthProvider';
import LogoutConfirmModal from './LogoutConfirmModal';
import InstallAppButton from './InstallAppButton';

interface NavbarProps {
  onSearchChange?: (term: string) => void;
  games?: GameProduct[];
}

export default function Navbar({ onSearchChange, games = [] }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  const { installApp } = usePWA();
  const { user, profile, signOut: handleLogout } = useAuth();

  // Floating dropdown states
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // Ensure portal target (document.body) is available client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);



  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        desktopSearchRef.current && !desktopSearchRef.current.contains(event.target as Node) &&
        mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchChange) {
      onSearchChange(search);
    }
    setShowDropdown(false);
  };



  // Instant search results
  const matchingGames = useMemo(() => {
    if (search.trim().length < 2 || !games || games.length === 0) return [];
    const query = search.toLowerCase().trim();
    return games.filter(
      (game) =>
        game.title.toLowerCase().includes(query) ||
        game.category?.toLowerCase().includes(query) ||
        (game.description && game.description.toLowerCase().includes(query))
    ).slice(0, 5);
  }, [search, games]);

  const handleKeyDown = (e: React.KeyboardEvent, results: GameProduct[]) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        router.push(`/games/${results[activeIndex].id}`);
        setSearch('');
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  const renderSearchDropdown = (results: GameProduct[], activeIdx: number) => {
    if (results.length === 0) return null;
    return (
      <div className="absolute left-0 right-0 mt-2 z-50 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-2 space-y-1 pointer-events-auto">
        <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Matokeo ya Haraka</span>
          <span className="text-[9px] text-slate-300 font-bold">{results.length} games</span>
        </div>
        <div className="max-h-[280px] overflow-y-auto space-y-0.5 divide-y divide-slate-800/60">
          {results.map((game, index) => {
            const isSelected = index === activeIdx;
            const isFree = game.price === 0;
            return (
              <div
                key={game.id}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  router.push(`/games/${game.id}`);
                  setSearch('');
                  setShowDropdown(false);
                }}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all pointer-events-auto ${
                  isSelected ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 text-white'
                }`}
              >
                <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-800 bg-slate-900">
                  <Image
                    src={game.cover_image}
                    alt={game.title}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black truncate uppercase leading-tight text-white">
                    {game.title}
                  </h4>
                  <span className="text-[9px] font-bold uppercase tracking-wider block mt-0.5 text-blue-400">
                    {game.category}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black block leading-none text-blue-400">
                    {isFree ? 'BURE' : formatCurrency(game.price)}
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-wide block mt-0.5 text-slate-400">
                    {isFree ? 'DOWNLOAD' : 'BUY NOW'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Mteja wa CHIDYPRIME';
  const displayPhone = profile?.phone_number || user?.user_metadata?.phone_number || user?.phone || '';

  // ─── PORTAL DRAWER JSX ──────────────────────────────────────────────────────
  const drawerPortal = (
    <AnimatePresence>
      {mobileOpen && (
        <div className="fixed inset-0 z-[9999] md:hidden pointer-events-auto">
          {/* Dark Semi-Transparent Backdrop — Single Tap Instant Close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              e.stopPropagation();
              setMobileOpen(false);
            }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer pointer-events-auto"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-[10000] w-full max-w-sm bg-slate-950 border-l border-slate-800 shadow-2xl h-full flex flex-col justify-between overflow-y-auto pointer-events-auto"
          >
            <div className="p-6 space-y-6 flex-1">

              {/* 1. Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">CHIDYPRIME <span className="text-blue-400">feat</span> CHIDYGAMING</h3>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Digital Gaming & Mod Store</p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileOpen(false);
                  }}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 border border-slate-800 text-slate-200 flex items-center justify-center hover:text-white hover:bg-slate-800 transition-all cursor-pointer pointer-events-auto touch-manipulation"
                  aria-label="Close navigation drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 2. Quick Search Bar */}
              <div ref={mobileSearchRef} className="relative">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Search games, simulator mods..."
                    value={search}
                    onFocus={() => setShowDropdown(true)}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowDropdown(true);
                      setActiveIndex(-1);
                      if (onSearchChange) onSearchChange(e.target.value);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, matchingGames)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 min-h-[44px] text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-3.5" />
                </form>
                {showDropdown && renderSearchDropdown(matchingGames, activeIndex)}
              </div>

              {/* 3. Account / Profile Menu */}
              <div className="space-y-3">
                {user || profile ? (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-white truncate">{displayName}</h4>
                        <p className="text-[10px] text-slate-300 font-mono">{displayPhone}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 text-xs font-bold">
                      <Link
                        href="/profile"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileOpen(false);
                        }}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-white hover:border-blue-600/50 hover:text-blue-400 transition-colors pointer-events-auto min-h-[44px]"
                      >
                        <span className="flex items-center gap-2.5">👤 Profile Yangu</span>
                        <ArrowRight className="w-4 h-4 text-blue-400" />
                      </Link>

                      <Link
                        href="/profile#vault"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileOpen(false);
                        }}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-white hover:border-blue-600/50 hover:text-blue-400 transition-colors pointer-events-auto min-h-[44px]"
                      >
                        <span className="flex items-center gap-2.5">🎮 Games Zangu (Vault)</span>
                        <ArrowRight className="w-4 h-4 text-blue-400" />
                      </Link>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="flex items-center justify-between w-full p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer pointer-events-auto min-h-[44px]"
                      >
                        <span className="flex items-center gap-2.5">🚪 Toka (Logout)</span>
                        <LogOut className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Guest Login Button */
                  <Link
                    href="/auth/login"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileOpen(false);
                    }}
                    className="flex items-center justify-between p-4 min-h-[48px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-wider transition-all shadow-md pointer-events-auto"
                  >
                    <div className="flex items-center gap-3">
                      <LogIn className="w-5 h-5" />
                      <span>🔑 INGIA / JISAJILI</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </Link>
                )}
              </div>

              {/* 4. App Download Callout Card (Native PWA Component) */}
              <div className="pt-2">
                <InstallAppButton
                  variant="drawer"
                  onInstalledCallback={() => setMobileOpen(false)}
                />
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-slate-800 text-center text-[10px] text-slate-400 font-bold">
              🔒 Verified Mobile Gaming Store • Dar es Salaam 🇹🇿
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800 transition-all shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link href="/front" className="flex items-center gap-3 group shrink-0 pointer-events-auto">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:bg-blue-500 transition-all">
            <Gamepad2 className="w-5 h-5" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-base font-black tracking-tight text-white uppercase">chidy<span className="text-blue-500">prime</span></span>
              <span className="text-[10px] font-bold text-blue-400">×</span>
              <span className="text-base font-black tracking-tight text-white uppercase">chidygaming</span>
            </div>
            <span className="text-[10px] text-blue-400 font-bold tracking-wider uppercase mt-0.5">
              Digital Gaming & Mod Store
            </span>
          </div>
        </Link>

        {/* Global Store Search (Desktop) */}
        <div ref={desktopSearchRef} className="hidden lg:block flex-1 max-w-xs relative pointer-events-auto">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search Maleo Bus Mods, PC Games..."
              value={search}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
                setActiveIndex(-1);
                if (onSearchChange) onSearchChange(e.target.value);
              }}
              onKeyDown={(e) => handleKeyDown(e, matchingGames)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
            />
            <Search className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-3" />
          </form>
          {showDropdown && renderSearchDropdown(matchingGames, activeIndex)}
        </div>

        {/* Action Controls (Desktop) */}
        <div className="hidden lg:flex items-center gap-3 pointer-events-auto">
          <InstallAppButton variant="navbar" />

          <Link 
            href="/orders" 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors pointer-events-auto touch-manipulation ${pathname === '/orders' ? 'text-blue-400 bg-blue-600/10 border border-blue-500/30' : 'text-slate-300 hover:text-white bg-slate-900 border border-slate-800'}`}
          >
            <PackageCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>🎮 GAMES ZANGU</span>
          </Link>

          {(user || profile) ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-black uppercase hover:border-blue-500 transition-colors pointer-events-auto touch-manipulation"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Akaunti Yangu</span>
              </Link>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-all cursor-pointer pointer-events-auto touch-manipulation"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider hover:bg-blue-500 transition-colors shadow-md pointer-events-auto touch-manipulation"
            >
              <User className="w-3.5 h-3.5" />
              <span>🔑 INGIA / JISAJILI</span>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button — Visible ONLY on Mobile/Tablet (< 1024px) */}
        <div className="flex lg:hidden items-center gap-2 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMobileOpen(true);
            }}
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white transition-all cursor-pointer pointer-events-auto touch-manipulation flex items-center justify-center"
            aria-label="Open mobile navigation drawer"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Render Mobile Drawer outside header via React Portal */}
      {mounted && mobileOpen && createPortal(drawerPortal, document.body)}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </header>
  );
}
