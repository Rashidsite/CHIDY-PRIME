'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, CheckCircle2, Clock, XCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const supabase = createClient();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setOrders(data);
      } else {
        const { data: legacy } = await supabase
          .from('payment_orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (legacy) setOrders(legacy);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      fetchOrders();
    } catch (err) {
      alert('Status update failed');
    }
  };

  const filtered = orders.filter((o) =>
    (o.order_number || o.id || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.visitor_phone || o.phone_number || '').includes(search) ||
    (o.game_title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-accent-cyan" />
            <span>Order Logs & Manual Access Override</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live transaction status monitoring, STK callback logs, and manual customer support verification.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2 shrink-0"
        >
          <RefreshCw className="w-4 h-4 text-brand-glow" />
          <span>Refresh Live Logs</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Filter by Order Ref, Customer Phone, Title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
      </div>

      <div className="p-6 rounded-3xl bg-glass-card border border-glass-border backdrop-blur-glass overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Order Ref</th>
                <th className="pb-3">Customer Phone</th>
                <th className="pb-3">Game Title</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Gateway</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Manual Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 font-mono font-bold text-white">{o.order_number || o.id}</td>
                  <td className="py-3 font-semibold text-slate-200">{o.visitor_phone || o.phone_number}</td>
                  <td className="py-3 font-medium text-white max-w-xs truncate">{o.game_title || 'Digital Product'}</td>
                  <td className="py-3 font-extrabold text-brand-glow">{formatCurrency(o.amount)}</td>
                  <td className="py-3 font-semibold uppercase text-slate-400">{o.payment_gateway || 'pressopay'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      o.status === 'completed' || o.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateStatus(o.id, 'completed')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold transition-all text-[11px]"
                        title="Approve Payment"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(o.id, 'pending')}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 font-bold transition-all text-[11px]"
                        title="Mark Pending"
                      >
                        Pending
                      </button>
                    </div>
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
