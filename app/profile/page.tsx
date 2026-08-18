'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
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
  RefreshCw,
  Sparkles,
  Smartphone,
  ExternalLink,
  PackageCheck,
  Zap,
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

  useEffect(() => {
    async function loadUserProfileAndVault() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const authUser = session.user;
          setUser(authUser);

          // Fetch extra profile data if exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profile) setProfileData(profile);

          // Fetch orders by user_id or user's phone / email
          const userPhone = profile?.phone_number || authUser.phone || authUser.user_metadata?.phone;
          
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
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserProfileAndVault();
  }, [supabase]);

  // Phone lookup helper for guest buyers
  const handlePhoneSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneQuery.trim()) return;

    setSearchingPhone(true);
    try {
      const cleanPhone = phoneQuery.trim();
      const { data: phoneOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('visitor_phone', cleanPhone)
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

  const displayName = profileData?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Mteja wa CHIDYPRIME';
  const displayPhone = profileData?.phone_number || user?.phone || user?.user_metadata?.phone || 'Bado Haujawekwa';
  const joinDate = user?.created_at ? formatDate(user.created_at) : 'Agosti 2026';

  const completedOrders = orders.filter((o) => ['completed', 'approved'].includes(o.status?.toLowerCase()));
  const pendingOrders = orders.filter((o) => o.status?.toLowerCase() === 'pending');

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
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
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={installApp}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              >
                <Smartphone className="w-4 h-4 fill-black" />
                <span>Install App</span>
              </button>

              <Link
                href="/front"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-extrabold text-xs uppercase hover:border-emerald-500/50 transition-colors"
              >
                <Gamepad2 className="w-4 h-4 text-emerald-400" />
                <span>Duka la Games</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── STATS SUMMARY METRICS ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Jumla ya Games</span>
            <span className="text-2xl font-black text-white">{completedOrders.length}</span>
            <span className="text-[10px] text-emerald-400 font-bold block">Zilizopo kwenye Vault</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Status ya Akaunti</span>
            <span className="text-lg font-black text-emerald-400 uppercase">Imethibitishwa</span>
            <span className="text-[10px] text-slate-500 font-bold block">Instant Delivery Enabled</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Inasubiri (Pending)</span>
            <span className="text-2xl font-black text-amber-400">{pendingOrders.length}</span>
            <span className="text-[10px] text-slate-500 font-bold block">Malipo yapo njiani</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Msaada wa Wateja</span>
            <span className="text-xs font-black text-white block truncate">WhatsApp Official</span>
            <span className="text-[10px] text-emerald-400 font-bold block">Self-Service Active</span>
          </div>
        </div>

        {/* ── DIGITAL VAULT / PURCHASE HISTORY SECTION ─────────────────────── */}
        <div id="vault" className="space-y-5 pt-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <span>🎮 Digital Vault (Games Zangu)</span>
                </h2>
                <p className="text-xs text-emerald-400 font-bold">
                  Historia yote ya manunuzi na download links zako
                </p>
              </div>
            </div>

            {/* Phone Lookup for STK Guest Buyers */}
            <form onSubmit={handlePhoneSearch} className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="tel"
                  placeholder="Tafuta kwa Simu (255...)"
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  className="bg-black border border-emerald-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 w-56 font-mono"
                />
                <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-2.5" />
              </div>
              <button
                type="submit"
                disabled={searchingPhone}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase hover:bg-emerald-400 transition-all cursor-pointer"
              >
                {searchingPhone ? '...' : 'Tafuta'}
              </button>
            </form>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl bg-zinc-950 border-2 border-emerald-500/40 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-emerald-500/30 bg-black text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="py-4 px-5">Tarehe</th>
                    <th className="py-4 px-5">Game / Mod Title</th>
                    <th className="py-4 px-5">Kiasi</th>
                    <th className="py-4 px-5">Hali ya Malipo</th>
                    <th className="py-4 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10 text-white font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-bold uppercase animate-pulse">
                        Inapakia historia ya manunuzi yako...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 space-y-2">
                        <PackageCheck className="w-8 h-8 text-emerald-500/40 mx-auto" />
                        <p className="font-bold text-white uppercase">Bado Hujapata Game Yoyote</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Weka namba yako ya simu hapo juu kutafuta manunuzi ya purpule au tembelea duka letu kununua game mpya!
                        </p>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const isApproved = ['completed', 'approved'].includes(order.status?.toLowerCase());
                      const isPending = order.status?.toLowerCase() === 'pending';

                      return (
                        <tr key={order.id} className="hover:bg-emerald-500/5 transition-colors">
                          {/* Date */}
                          <td className="py-4 px-5 font-mono text-slate-400">
                            {order.created_at ? formatDate(order.created_at) : '—'}
                          </td>

                          {/* Game Title */}
                          <td className="py-4 px-5">
                            <span className="font-black text-white text-sm block max-w-xs truncate">
                              {order.game_title || 'Digital Access Product'}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 block mt-0.5">
                              Ref: {order.order_number || order.id}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-4 px-5 font-black text-emerald-400 text-sm whitespace-nowrap">
                            {order.amount === 0 ? 'BURE' : formatCurrency(order.amount)}
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

                          {/* PAKUA TENA (Download Again) Button */}
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

        {/* Sync Guarantee Card */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/20 flex items-center justify-between text-xs text-slate-400 font-bold">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Kila muamala kwenye Vault yako umeratibiwa moja kwa moja na Admin HQ kwa usalama 100%.</span>
          </div>
          <Link href="/front" className="text-emerald-400 hover:underline shrink-0">Rudi Dukani ➔</Link>
        </div>

      </main>
    </div>
  );
}
