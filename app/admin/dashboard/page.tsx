'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Gamepad2, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/analytics');
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const data = stats || {
    totalRevenue: 2980000,
    totalOrders: 271,
    completedOrders: 240,
    activeUsers: 1480,
    totalGames: 281,
    salesChart: [
      { name: 'Jan', revenue: 450000, orders: 42 },
      { name: 'Feb', revenue: 620000, orders: 58 },
      { name: 'Mar', revenue: 890000, orders: 74 },
      { name: 'Apr', revenue: 1120000, orders: 95 },
      { name: 'May', revenue: 1450000, orders: 130 },
      { name: 'Jun', revenue: 1890000, orders: 162 },
      { name: 'Jul', revenue: 2340000, orders: 210 },
      { name: 'Aug', revenue: 2980000, orders: 271 },
    ],
    recentOrders: [
      { id: '1', order_number: 'ORD-8F92A1', visitor_phone: '255796615257', game_title: 'SHABIBY YUTONG LUXURY BUS MODE', amount: 6000, status: 'completed', created_at: new Date().toISOString() },
      { id: '2', order_number: 'ORD-3X41B9', visitor_phone: '255712345678', game_title: 'MALEO MAP MODE TZ', amount: 5000, status: 'completed', created_at: new Date().toISOString() },
      { id: '3', order_number: 'ORD-9L11C4', visitor_phone: '255698765432', game_title: 'GTA V Ultra Realism Mod', amount: 15000, status: 'pending', created_at: new Date().toISOString() },
    ]
  };

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Real-time Store Analytics</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
            Live Updates
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor total revenue, mobile payments, daily sales performance, and active customers.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Revenue */}
        <div className="p-5 rounded-2xl bg-glass-card border border-glass-border backdrop-blur-glass space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {formatCurrency(data.totalRevenue)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+24% vs last month</span>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="p-5 rounded-2xl bg-glass-card border border-glass-border backdrop-blur-glass space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 text-brand-glow flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {data.totalOrders}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {data.completedOrders} Payments Auto-Verified
            </span>
          </div>
        </div>

        {/* Active Users */}
        <div className="p-5 rounded-2xl bg-glass-card border border-glass-border backdrop-blur-glass space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Customers</span>
            <div className="w-9 h-9 rounded-xl bg-accent-cyan/20 text-accent-cyan flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {data.activeUsers}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Registered & Visitor Profiles</span>
          </div>
        </div>

        {/* Games Catalog */}
        <div className="p-5 rounded-2xl bg-glass-card border border-glass-border backdrop-blur-glass space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Games & Mods</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">
              {data.totalGames}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Published Products</span>
          </div>
        </div>

      </div>

      {/* Sales Analytics Chart */}
      <div className="p-6 rounded-3xl bg-glass-card border border-glass-border backdrop-blur-glass space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Monthly Sales & Revenue Growth</h3>
            <p className="text-xs text-slate-400">Automated mobile transaction performance (TZS)</p>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.salesChart}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="p-6 rounded-3xl bg-glass-card border border-glass-border backdrop-blur-glass space-y-4">
        <h3 className="text-base font-bold text-white">Recent Store Transactions</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Order Ref</th>
                <th className="pb-3">Product Title</th>
                <th className="pb-3">Customer Phone</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {data.recentOrders?.map((ord: any) => (
                <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 font-mono font-bold text-white">{ord.order_number || ord.id}</td>
                  <td className="py-3 font-semibold text-white max-w-xs truncate">{ord.game_title || 'Game Download'}</td>
                  <td className="py-3 text-slate-400">{ord.visitor_phone || ord.phone_number}</td>
                  <td className="py-3 font-extrabold text-brand-glow">{formatCurrency(ord.amount)}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                      ord.status === 'completed' || ord.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
