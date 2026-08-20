'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Gamepad2, 
  ShoppingBag, 
  Users, 
  Settings, 
  Store, 
  ShieldCheck, 
  Sparkles, 
  Palette,
  X,
  Lock,
  LogOut
} from 'lucide-react';

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  pendingOrdersCount?: number;
  onLogout?: () => void;
}

export default function AdminSidebar({
  mobileOpen = false,
  onClose,
  pendingOrdersCount = 0,
  onLogout,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const links = [
    { href: '/admin/dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
    { href: '/admin/cms/ui', label: '🎨 UI & CMS Controls', icon: Palette },
    { href: '/admin/games', label: 'Game Catalog (CRUD)', icon: Gamepad2 },
    { 
      href: '/admin/orders', 
      label: 'Orders & Transactions', 
      icon: ShoppingBag, 
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} New` : undefined 
    },
    { href: '/admin/users', label: 'Users & Roles', icon: Users },
    { href: '/admin/cms/categories', label: 'CMS Categories', icon: Sparkles },
    { href: '/admin/cms/slides', label: 'CMS Hero Slides', icon: Store },
    { href: '/admin/settings', label: 'Store Settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-5 space-y-6">
      <div className="space-y-6">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-purple to-brand-600 flex items-center justify-center shadow-glow shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight uppercase">chidy<span className="text-blue-500">prime</span></h2>
              <span className="text-[10px] font-bold text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full border border-accent-purple/20">
                Admin HQ Portal
              </span>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Links */}
        <nav className="space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all min-h-[44px] touch-manipulation cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse shadow-sm">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Actions: Lock Admin & Return to Storefront */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2">
        {onLogout && (
          <button
            type="button"
            onClick={() => {
              if (onClose) onClose();
              onLogout();
            }}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/40 text-xs font-black uppercase tracking-wider transition-all min-h-[44px] touch-manipulation shadow-md cursor-pointer hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]"
          >
            <Lock className="w-4 h-4 text-rose-400" />
            <span>🔒 Lock Admin (Toka)</span>
          </button>
        )}

        <Link
          href="/"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider border border-slate-700 transition-all min-h-[44px] touch-manipulation shadow-md cursor-pointer"
        >
          <Store className="w-4 h-4 text-emerald-400" />
          <span>Back to Storefront</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Fixed Sidebar (lg:flex) ── */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* ── Mobile Slide-Over Drawer (< lg) ── */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer touch-manipulation"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 shadow-2xl z-10 flex flex-col justify-between overscroll-contain"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
