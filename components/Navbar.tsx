'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Gamepad2, 
  Search, 
  ShoppingBag, 
  User, 
  ShieldCheck, 
  Menu, 
  X, 
  LogOut,
  PackageCheck,
  Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface NavbarProps {
  cartCount?: number;
  onOpenCart?: () => void;
  onSearchChange?: (term: string) => void;
}

export default function Navbar({ cartCount = 0, onOpenCart, onSearchChange }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'admin') {
          setIsAdmin(true);
        }
      }
    }
    checkUser();
  }, [supabase]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchChange) {
      onSearchChange(search);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80 border-b border-glass-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-accent-purple to-accent-cyan flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-brand-glow bg-clip-text text-transparent tracking-tight">
            chidy<span className="text-accent-cyan">prime</span>
          </span>
        </Link>

        {/* Global Store Search */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
          <input
            type="text"
            placeholder="Search games, mods, activation keys..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (onSearchChange) onSearchChange(e.target.value);
            }}
            className="w-full bg-slate-900/70 border border-slate-700/60 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </form>

        {/* Navigation Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link 
            href="/orders" 
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${pathname === '/orders' ? 'text-brand-glow' : 'text-slate-300 hover:text-white'}`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>My Orders</span>
          </Link>

          {isAdmin && (
            <Link 
              href="/admin/dashboard" 
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent-purple/20 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/30 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Panel</span>
            </Link>
          )}

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:text-white hover:bg-slate-800 transition-all"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-glow animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 max-w-[100px] truncate">{user.email}</span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-semibold hover:from-brand-500 hover:to-brand-600 shadow-glow transition-all"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onOpenCart}
            className="relative p-2 rounded-lg bg-slate-800 text-slate-200"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-200"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (onSearchChange) onSearchChange(e.target.value);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 text-sm font-medium"
            >
              <Gamepad2 className="w-4 h-4 text-brand-glow" />
              <span>Storefront</span>
            </Link>
            <Link
              href="/orders"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 text-sm font-medium"
            >
              <PackageCheck className="w-4 h-4 text-accent-cyan" />
              <span>My Digital Orders</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-purple/20 text-accent-purple text-sm font-medium"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </Link>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-slate-800 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({user.email})</span>
              </button>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold shadow-glow"
              >
                <User className="w-4 h-4" />
                <span>Sign In / Register</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
