'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import AdminLockGate from '@/components/AdminLockGate';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Loader2, Menu, Store, Lock } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  const supabase = createClient();

  const handleAdminLogout = useCallback(async () => {
    try {
      localStorage.removeItem('cpcg_admin_session');
      localStorage.removeItem('cpcg_admin_authenticated');
      await fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => {});
    } catch {}
    setAuthorized(false);
  }, []);

  const fetchPendingOrders = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (typeof count === 'number') {
        setPendingOrdersCount(count);
      }
    } catch {}
  }, [supabase]);

  useEffect(() => {
    async function checkAdminAuth() {
      setLoading(true);
      try {
        const savedToken = typeof window !== 'undefined' ? localStorage.getItem('cpcg_admin_session') : null;
        const isAuthFlag = typeof window !== 'undefined' ? localStorage.getItem('cpcg_admin_authenticated') : null;

        if (!savedToken && !isAuthFlag) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const res = await fetch('/api/admin/auth', {
          method: 'GET',
          headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : {},
        });

        const data = await res.json();
        if (data.authenticated || isAuthFlag === 'true') {
          setAuthorized(true);
        } else {
          localStorage.removeItem('cpcg_admin_session');
          localStorage.removeItem('cpcg_admin_authenticated');
          setAuthorized(false);
        }
      } catch {
        // If offline or network issue, fallback to localStorage flag
        const isAuthFlag = typeof window !== 'undefined' ? localStorage.getItem('cpcg_admin_authenticated') : null;
        setAuthorized(isAuthFlag === 'true');
      } finally {
        setLoading(false);
      }
    }

    checkAdminAuth();
    fetchPendingOrders();

    // Subscribe to realtime orders changes for live badge
    const ch = supabase
      .channel('admin-layout-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchPendingOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, fetchPendingOrders]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060913] text-slate-400">
        <div className="flex flex-col items-center gap-3 font-bold text-xs">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-slate-300 tracking-wider font-mono uppercase">Inahakiki Ufikiaji wa Admin...</span>
        </div>
      </div>
    );
  }

  // ── CYBER GAMING LOCK SCREEN (Completely blocks Admin if not authenticated) ──
  if (!authorized) {
    return <AdminLockGate onUnlock={() => setAuthorized(true)} />;
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col lg:flex-row bg-[#080d19] text-foreground overscroll-none">
      
      {/* ── TOP MOBILE ADMIN HEADER (Visible ONLY on screens < 1024px) ── */}
      <header className="lg:hidden shrink-0 sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
        {/* Brand & Pending Badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-blue-400" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-black text-white uppercase tracking-tight leading-tight">
                chidy<span className="text-blue-500">prime</span> HQ
              </h1>
              <span className="text-[9px] font-bold text-blue-400 block uppercase">
                Admin Panel
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions: Pending Badge, Store link & Lock button */}
        <div className="flex items-center gap-2">
          {pendingOrdersCount > 0 && (
            <Link
              href="/admin/orders"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-wider animate-pulse min-h-[38px] touch-manipulation"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>{pendingOrdersCount} Mpya</span>
            </Link>
          )}

          <Link
            href="/"
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/80 text-emerald-400 hover:bg-slate-700 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            title="Storefront"
          >
            <Store className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={handleAdminLogout}
            className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation cursor-pointer"
            title="Lock Admin (Logout)"
            aria-label="Lock Admin"
          >
            <Lock className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </header>

      {/* ── Fixed Sticky Left Navigation Sidebar ── */}
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        pendingOrdersCount={pendingOrdersCount}
        onLogout={handleAdminLogout}
      />

      {/* ── Independent Scrollable Main Content Area ── */}
      <main className="flex-1 h-screen overflow-y-auto p-6 md:p-8 w-full">
        <div className="max-w-7xl mx-auto w-full pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}

