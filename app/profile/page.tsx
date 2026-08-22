'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PhoneFirstAuthCard from '@/components/PhoneFirstAuthCard';
import { 
  User, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Gamepad2, 
  Download, 
  CheckCircle2, 
  Clock, 
  Search, 
  Key, 
  Sparkles,
  Smartphone,
  ExternalLink,
  PackageCheck,
  Zap,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePWA } from '@/components/PWAProvider';

export default function UserProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [searchingPhone, setSearchingPhone] = useState(false);

  const { installApp } = usePWA();
  const supabase = createClient();

  const loadUserProfileAndVault = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let localPhone = '';
      let localName = '';
      try {
        localPhone = localStorage.getItem('cpcg_user_phone') || '';
        localName = localStorage.getItem('cpcg_user_name') || '';
      } catch (e) {}

      if (session?.user) {
        const authUser = session.user;
        setUser(authUser);

        // Fetch extra profile data if exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profile) setProfileData(profile);

        const userPhone = profile?.phone_number || authUser.phone || authUser.user_metadata?.phone || localPhone;
        
        let query = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (userPhone) {
          query = query.or(`user_id.eq.${authUser.id},visitor_phone.eq.${userPhone}`);
        } else {
          query = query.eq('user_id', authUser.id);
        }

        const { data: userOrders } = await query;
        if (userOrders && userOrders.length > 0) {
          setOrders(userOrders);
        }
      } else if (localPhone) {
        // Logged in with phone local credentials
        setProfileData({
          full_name: localName || `Gamer-${localPhone.slice(-4)}`,
          phone_number: localPhone,
          status: 'active',
        });

        const digits = localPhone.replace(/\D/g, '');
        const clean = digits.startsWith('0') ? '255' + digits.slice(1) : (digits.startsWith('255') ? digits : '255' + digits);
        const local = clean.startsWith('255') ? '0' + clean.slice(3) : clean;

        const { data: phoneOrders } = await supabase
          .from('orders')
          .select('*')
          .or(`visitor_phone.eq.${clean},visitor_phone.eq.${local}`)
          .order('created_at', { ascending: false });

        if (phoneOrders) {
          setOrders(phoneOrders);
        }
      } else {
        setUser(null);
        setProfileData(null);
        setOrders([]);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfileAndVault();

    const handleAuthEvent = () => {
      loadUserProfileAndVault();
    };

    window.addEventListener('cpcg_auth_change', handleAuthEvent);
    return () => {
      window.removeEventListener('cpcg_auth_change', handleAuthEvent);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}

    try {
      localStorage.removeItem('cpcg_registered');
      localStorage.removeItem('cpcg_user_phone');
      localStorage.removeItem('cpcg_user_name');
      localStorage.removeItem('cpcg_user_registered');
      localStorage.removeItem('cpcg_unlocked_games');
      localStorage.removeItem('cpcg_active_order_id');
      localStorage.removeItem('cpcg_active_game_id');
      sessionStorage.clear();
    } catch (e) {}

    setUser(null);
    setProfileData(null);
    setOrders([]);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cpcg_auth_change'));
      window.dispatchEvent(new CustomEvent('cpcg_logout_reset'));
    }

    window.location.href = '/';
  };

  // Phone lookup helper for guest buyers
  const handlePhoneSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneQuery.trim()) return;

    setSearchingPhone(true);
    try {
      const digits = phoneQuery.replace(/\D/g, '');
      const clean = digits.startsWith('0') ? '255' + digits.slice(1) : (digits.startsWith('255') ? digits : '255' + digits);
      const local = clean.startsWith('255') ? '0' + clean.slice(3) : clean;

      const { data: phoneOrders } = await supabase
        .from('orders')
        .select('*')
        .or(`visitor_phone.eq.${clean},visitor_phone.eq.${local},phone_number.eq.${clean},phone_number.eq.${local}`)
        .order('created_at', { ascending: false });

      if (phoneOrders) {
        setOrders(phoneOrders);
      }
    } catch (err) {
      console.error('Phone lookup error:', err);
    } finally {
      setSearchingPhone(false);
    }
  };

  const isAuthenticated = !!user || !!profileData;
  const displayName = profileData?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Mteja wa CHIDYPRIME';
  const displayPhone = profileData?.phone_number || user?.phone || user?.user_metadata?.phone || 'Bado Haujawekwa';
  const joinDate = user?.created_at ? formatDate(user.created_at) : 'Agosti 2026';

  const completedOrders = orders.filter((o) => ['completed', 'approved'].includes(o.status?.toLowerCase()));
  const pendingOrders = orders.filter((o) => o.status?.toLowerCase() === 'pending');

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar />

      <main className="main-storefront-wrapper relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-36">
        
        {loading ? (
          <div className="w-full h-64 rounded-3xl bg-slate-900 border border-slate-800 animate-pulse" />
        ) : !isAuthenticated ? (
          <div className="space-y-8 py-4">
            <div className="text-center space-y-2 max-w-md mx-auto">
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                Akaunti ya Gamer
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Ingia au jisajili kwa namba ya simu kutazama oda zako, kupakua michezo, na kudhibiti akaunti yako.
              </p>
            </div>

            <PhoneFirstAuthCard 
              initialMode="login" 
              onSuccess={() => loadUserProfileAndVault()} 
            />
          </div>
        ) : (
          <>
            {/* ── PROFILE HEADER BANNER ────────────────────────────────────────── */}
            <div className="relative rounded-3xl overflow-hidden border-2 border-emerald-500/50 bg-gradient-to-r from-slate-950 via-black to-slate-950 p-6 sm:p-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                
                <div className="flex items-center gap-5">
                  {/* Avatar Icon */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] shrink-0">
                    <User className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                        {displayName}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider">
                        ● ACTIVE
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Phone className="w-3.5 h-3.5" />
                        {displayPhone}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        Alijiunga: {joinDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={installApp}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)] cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 fill-black" />
                    <span>Install App</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/40 text-red-400 hover:text-red-300 font-extrabold text-xs uppercase transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Ondoka (Logout)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── STATS SUMMARY METRICS ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Oda Zote</span>
                <span className="text-2xl font-black text-white">{orders.length}</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Zilizokamilika</span>
                <span className="text-2xl font-black text-emerald-400">{completedOrders.length}</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/30 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Zinazosubiri</span>
                <span className="text-2xl font-black text-amber-400">{pendingOrders.length}</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-blue-500/30 space-y-1">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Status ya Akaunti</span>
                <span className="text-sm font-black text-cyan-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Verified
                </span>
              </div>
            </div>

            {/* ── DIGITAL VAULT: MY GAMES & DOWNLOADS ──────────────────────────── */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">
                      My Games Vault & Active Orders
                    </h2>
                    <p className="text-xs text-slate-400">
                      Orodha ya michezo yote uliyolipia na link zake za kudownload
                    </p>
                  </div>
                </div>

                {/* Quick Phone Search Form */}
                <form onSubmit={handlePhoneSearch} className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="Tafuta kwa namba (07...)"
                      value={phoneQuery}
                      onChange={(e) => setPhoneQuery(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48 sm:w-56 font-bold"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                  <button
                    type="submit"
                    disabled={searchingPhone}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {searchingPhone ? '...' : 'Tafuta'}
                  </button>
                </form>
              </div>

              {/* Table / List */}
              <div className="rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-5">Mchezo / Bidhaa</th>
                        <th className="py-3.5 px-5">Namba ya Simu</th>
                        <th className="py-3.5 px-5">Kiasi</th>
                        <th className="py-3.5 px-5">Status</th>
                        <th className="py-3.5 px-5 text-right">Kitendo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-bold">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500">
                            <div className="max-w-xs mx-auto space-y-2">
                              <PackageCheck className="w-8 h-8 text-slate-600 mx-auto" />
                              <p className="text-xs font-bold text-slate-400">Hakuna oda au michezo iliyopatikana</p>
                              <Link
                                href="/front"
                                className="inline-block px-4 py-2 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-wider shadow-md hover:bg-emerald-400 transition-colors"
                              >
                                Tazama Duka la Games &rarr;
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        orders.map((order) => {
                          const isApproved = ['completed', 'approved', 'paid'].includes(order.status?.toLowerCase());
                          const isPending = order.status?.toLowerCase() === 'pending';

                          return (
                            <tr key={order.id} className="hover:bg-slate-900/40 transition-colors">
                              {/* Game Title */}
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                                    <Gamepad2 className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-white block font-extrabold truncate max-w-xs">
                                      {order.game_title || order.game_name || order.product_title || `Order #${order.id.slice(0, 8)}`}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-normal">
                                      {formatDate(order.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Phone */}
                              <td className="py-4 px-5 text-slate-300 font-mono">
                                {order.visitor_phone || order.phone_number || '—'}
                              </td>

                              {/* Price */}
                              <td className="py-4 px-5 text-white">
                                {formatCurrency(order.amount || order.price || 0)}
                              </td>

                              {/* Status */}
                              <td className="py-4 px-5">
                                {isApproved ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black text-[10px] uppercase">
                                    <CheckCircle2 className="w-3 h-3" /> Approved
                                  </span>
                                ) : isPending ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-black text-[10px] uppercase">
                                    <Clock className="w-3 h-3" /> Pending
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-black text-[10px] uppercase">
                                    Failed
                                  </span>
                                )}
                              </td>

                              {/* PAKUA TENA Button */}
                              <td className="py-4 px-5 text-right">
                                {isApproved ? (
                                  <Link
                                    href={`/download/${order.download_token || order.id}`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-[11px] shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all"
                                  >
                                    <Download className="w-3.5 h-3.5 fill-black" />
                                    <span>PAKUA TENA</span>
                                  </Link>
                                ) : (
                                  <span className="text-slate-600 font-bold text-[10px] uppercase">
                                    Inasubiri Malipo
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Logout Footer Strip */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-slate-800 flex items-center justify-between text-xs text-slate-400 font-bold">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Kila muamala kwenye Vault yako umeratibiwa moja kwa moja na Admin HQ kwa usalama 100%.</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ondoka kwenye akaunti</span>
              </button>
            </div>
          </>
        )}

      </main>
    </div>
  );
}