'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCounter from '@/components/AnimatedCounter';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Gamepad2, 
  TrendingUp, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Radio,
  CheckCircle2,
  Clock,
  XCircle,
  CalendarDays,
  Infinity,
  ShieldCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  PackageCheck,
  Layers
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | '7days' | 'weekly' | 'monthly'>('7days');
  const [livePulse, setLivePulse] = useState(false);
  const [gatewayData, setGatewayData] = useState<any>(null);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [gatewayRefreshing, setGatewayRefreshing] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);

  const supabase = createClient();

  const loadHealthData = async () => {
    try {
      const res = await fetch('/api/admin/health');
      const json = await res.json();
      if (json.success) setHealthData(json.health);
    } catch (e) {}
  };

  const loadGatewayAnalytics = async (silent = false) => {
    if (!silent && !gatewayData) setGatewayLoading(true);
    else if (silent) setGatewayRefreshing(true);
    try {
      const res = await fetch('/api/admin/gateway-analytics');
      const json = await res.json();
      if (json.success) setGatewayData(json.data);
    } catch (err) {
      console.error('Failed to load gateway analytics:', err);
    } finally {
      setGatewayLoading(false);
      setGatewayRefreshing(false);
    }
  };

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics?timeframe=${timeframe}`);
      const json = await res.json();
      if (json.success) {
        setStats(json.metrics);
        setSalesChart(json.salesChart || []);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadAnalytics();
    loadGatewayAnalytics();
    loadHealthData();

    const channel = supabase
      .channel('public-admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        setLivePulse(true);
        setTimeout(() => setLivePulse(false), 2000);
        loadAnalytics();
        loadHealthData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_orders' }, () => {
        setLivePulse(true);
        setTimeout(() => setLivePulse(false), 2000);
        loadAnalytics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        loadAnalytics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadAnalytics();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAnalytics, supabase]);

  const data = {
    totalRevenue: Number(stats?.totalRevenue || 0),
    totalOrders: Number(stats?.totalOrders || 0),
    completedOrders: Number(stats?.completedOrders || 0),
    pendingOrders: Number(stats?.pendingOrders || 0),
    failedOrders: Number(stats?.failedOrders || 0),
    activeUsers: Number(stats?.activeUsers || 0),
    totalGames: Number(stats?.totalGames || 0),
    lifetimeRevenue: Number(stats?.lifetimeRevenue || 0),
    topSellingProducts: stats?.topSellingProducts || [],
    categoryMetrics: stats?.categoryMetrics || [],
  };

  return (
    <div className="space-y-8 max-w-7xl">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3 uppercase">
            <BarChart3 className="w-8 h-8 sm:w-9 sm:h-9 text-blue-500 shrink-0" />
            <span>Performance Analytics & Trends</span>
            {livePulse && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse font-bold">
                <Radio className="w-3.5 h-3.5" />
                Live Sync
              </span>
            )}
          </h1>
          <p className="text-sm font-semibold text-slate-300 mt-1.5">
            Takwimu halisi za mauzo, oda, wateja, na michezo kutoka kwenye database ya Supabase.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0">
          {[
            { id: '7days', label: 'SIKU 7' },
            { id: 'monthly', label: 'MWEZI (MONTHLY)' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-extrabold uppercase transition-all ${
                timeframe === t.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SYSTEM HEALTH & TELEMETRY CARD ── */}
      <div className="p-6 rounded-3xl bg-[#0F172A] border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-sm font-black text-white uppercase tracking-tight">SYSTEM HEALTH & TELEMETRY MONITOR</h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Live Telemetry</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold">
          {/* Database */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Database Status</span>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-black text-white">Supabase PostgreSQL</span>
              <span className="px-2 py-0.5 rounded bg-emerald-600/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase">
                {healthData?.database?.status || 'CONNECTED'}
              </span>
            </div>
          </div>

          {/* Payment Gateways */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Payment Gateways</span>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-black text-white">PressoPay / HarakaPay</span>
              <span className="px-2 py-0.5 rounded bg-emerald-600/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase">
                ONLINE
              </span>
            </div>
          </div>

          {/* Telegram Bot */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Telegram Order Bot</span>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-black text-white">Instant Alerts</span>
              <span className="px-2 py-0.5 rounded bg-emerald-600/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Real-Time Sync */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Live WebSocket Sync</span>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-black text-blue-400">Channel: storefront-sync</span>
              <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase">
                LISTENING
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — REAL LIVE OVERVIEW STAT CARDS (4 cards)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Lifetime Revenue */}
        <motion.div
          animate={livePulse ? { scale: [1, 1.03, 1] } : {}}
          transition={{ duration: 0.4 }}
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-300 uppercase tracking-wider">
              Total Lifetime Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">
              <AnimatedCounter value={data.lifetimeRevenue} formatter={(v) => formatCurrency(v)} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-extrabold mt-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Mapato yote yaliyolipwa kikamilifu</span>
            </div>
          </div>
        </motion.div>

        {/* Total Registered Accounts */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-300 uppercase tracking-wider">
              Registered Accounts
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">
              <AnimatedCounter value={data.activeUsers} formatter={(v) => Math.round(v).toLocaleString()} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-extrabold mt-1.5">
              <ArrowUpRight className="w-4 h-4" />
              <span>Wateja waliopo kwenye database</span>
            </div>
          </div>
        </div>

        {/* Total Games in Catalog */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-300 uppercase tracking-wider">
              Games &amp; Mods Catalog
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Gamepad2 className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">
              <AnimatedCounter value={data.totalGames} formatter={(v) => Math.round(v).toLocaleString()} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-purple-400 font-extrabold mt-1.5">
              <Layers className="w-4 h-4" />
              <span>Bidhaa zilizopo dukani</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <motion.div
          animate={livePulse ? { scale: [1, 1.03, 1] } : {}}
          transition={{ duration: 0.4 }}
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-300 uppercase tracking-wider">
              Total Orders Processed
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">
              <AnimatedCounter value={data.totalOrders} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-extrabold mt-1.5">
              <PackageCheck className="w-4 h-4" />
              <span>Miamala yote iliyoingia</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — REAL ORDER STATUS BREAKDOWN
      ══════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-black text-white uppercase tracking-widest">Hali ya Miamala na Malipo (Order Status Breakdown)</h2>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Approved Orders */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">Approved Orders</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              <AnimatedCounter value={data.completedOrders} formatter={(v) => Math.round(v).toLocaleString()} />
            </div>
            <div className="mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 font-bold">Approved Rate</span>
                <span className="text-xs font-black text-emerald-500">
                  {data.totalOrders > 0 ? Math.round((data.completedOrders / data.totalOrders) * 100) : 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${data.totalOrders > 0 ? Math.round((data.completedOrders / data.totalOrders) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">Pending Orders</span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              <AnimatedCounter value={data.pendingOrders} formatter={(v) => Math.round(v).toLocaleString()} />
            </div>
            <div className="mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 font-bold">Pending Rate</span>
                <span className="text-xs font-black text-amber-500">
                  {data.totalOrders > 0 ? Math.round((data.pendingOrders / data.totalOrders) * 100) : 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-amber-500 transition-all duration-700"
                  style={{ width: `${data.totalOrders > 0 ? Math.round((data.pendingOrders / data.totalOrders) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Failed / Rejected Orders */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">Rejected / Failed</span>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">
              <AnimatedCounter value={data.failedOrders} formatter={(v) => Math.round(v).toLocaleString()} />
            </div>
            <div className="mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 font-bold">Rejected Rate</span>
                <span className="text-xs font-black text-rose-500">
                  {data.totalOrders > 0 ? Math.round((data.failedOrders / data.totalOrders) * 100) : 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-rose-500 transition-all duration-700"
                  style={{ width: `${data.totalOrders > 0 ? Math.round((data.failedOrders / data.totalOrders) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — REAL REVENUE TRAJECTORY CHART
      ══════════════════════════════════════════════════════════════ */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white uppercase">
              REVENUE TRAJECTORY ({timeframe === '7days' ? 'MWELEKEO WA SIKU 7' : 'MWELEKEO WA MWEZI'})
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
              Takwimu za mauzo halisi ya kila siku kutoka kwenye database
            </p>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesChart}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} fontWeight="bold" />
              <YAxis stroke="#94a3b8" fontSize={12} fontWeight="bold" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '13px' }}
                formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Mapato']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — REAL TOP SELLING PRODUCTS TABLE
      ══════════════════════════════════════════════════════════════ */}
      {data.topSellingProducts.length > 0 && (
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-card">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white uppercase">TOP SELLING GAMES &amp; MODS</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">Michezo na mods zinazoongoza kwa mauzo na wateja halisi</p>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-300 font-extrabold uppercase tracking-wider text-xs">
                  <th className="pb-3.5">Mchezo / Mod</th>
                  <th className="pb-3.5">Kategoria</th>
                  <th className="pb-3.5 text-center">Idadi ya Mauzo</th>
                  <th className="pb-3.5 text-right">Jumla ya Mapato (TZS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
                {data.topSellingProducts.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-800/60 transition-colors">
                    <td className="py-4 font-extrabold text-white max-w-xs truncate text-sm">{item.title}</td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-950 text-blue-400 border border-slate-800 text-xs font-extrabold uppercase">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-white font-extrabold text-sm text-center">
                      <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {item.purchases} orders
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <span className="font-black text-emerald-400 text-sm sm:text-base">{formatCurrency(item.revenue)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5 — PAYMENT GATEWAY BREAKDOWN
      ══════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-black text-white uppercase tracking-widest">Payment Gateway Breakdown &amp; Health Monitor</h2>
          <div className="flex-1 h-px bg-slate-800" />
          <button
            onClick={() => loadGatewayAnalytics(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${gatewayRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            Refresh
          </button>
        </div>

        {gatewayLoading ? (
          <div className="text-slate-500 font-bold text-xs uppercase animate-pulse">Loading gateway analytics...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-extrabold text-xs uppercase tracking-wider ${
                gatewayData?.pressopay?.health
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {gatewayData?.pressopay?.health
                  ? <Wifi className="w-4 h-4 text-blue-400" />
                  : <WifiOff className="w-4 h-4 text-slate-500" />}
                PressoPay
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                  gatewayData?.pressopay?.health ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-500'
                }`}>
                  {gatewayData?.pressopay?.health ? '● ONLINE' : '○ STANDBY'}
                </span>
                <span className="text-slate-500 font-bold text-[9px]">PRIMARY</span>
              </div>

              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-extrabold text-xs uppercase tracking-wider ${
                gatewayData?.harakapay?.health
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {gatewayData?.harakapay?.health
                  ? <Wifi className="w-4 h-4 text-emerald-400" />
                  : <WifiOff className="w-4 h-4 text-slate-500" />}
                HarakaPay
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                  gatewayData?.harakapay?.health ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'
                }`}>
                  {gatewayData?.harakapay?.health ? '● ONLINE' : '○ STANDBY'}
                </span>
                <span className="text-slate-500 font-bold text-[9px]">FALLBACK</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* PressoPay Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-blue-500/20 space-y-4 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest">PressoPay</span>
                    <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-extrabold uppercase">Primary</span>
                  </div>
                  <span className="text-2xl font-black text-white">
                    {gatewayData?.pressopay?.sharePercent ?? 0}%
                  </span>
                </div>

                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all duration-700"
                    style={{ width: `${gatewayData?.pressopay?.sharePercent ?? 0}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Volume</span>
                    <span className="font-black text-white">{formatCurrency(gatewayData?.pressopay?.volume ?? 0)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Transactions</span>
                    <span className="font-black text-white">{(gatewayData?.pressopay?.transactions ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* HarakaPay Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/20 space-y-4 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">HarakaPay</span>
                    <span className="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold uppercase">Fallback</span>
                  </div>
                  <span className="text-2xl font-black text-white">
                    {gatewayData?.harakapay?.sharePercent ?? 0}%
                  </span>
                </div>

                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${gatewayData?.harakapay?.sharePercent ?? 0}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Volume</span>
                    <span className="font-black text-white">{formatCurrency(gatewayData?.harakapay?.volume ?? 0)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="block text-slate-500 font-bold uppercase tracking-wider mb-1">Transactions</span>
                    <span className="font-black text-white">{(gatewayData?.harakapay?.transactions ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
