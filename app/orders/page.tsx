'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { PackageCheck, Search, Download, Clock, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function UserOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadUserOrders() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

        if (session?.user) {
          query = query.eq('user_id', session.user.id);
        }

        const { data: ordersData } = await query;
        if (ordersData) {
          setOrders(ordersData);
        }
      } catch (err) {
        console.error('Failed to load user orders:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUserOrders();
  }, [supabase]);

  const handlePhoneSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneSearch.trim()) return;
    setLoading(true);
    try {
      const digits = phoneSearch.replace(/\D/g, '');
      const clean = digits.startsWith('0') ? '255' + digits.slice(1) : (digits.startsWith('255') ? digits : '255' + digits);
      const local = clean.startsWith('255') ? '0' + clean.slice(3) : clean;

      const { data } = await supabase
        .from('orders')
        .select('*')
        .or(`visitor_phone.eq.${clean},visitor_phone.eq.${local},phone_number.eq.${clean},phone_number.eq.${local}`)
        .order('created_at', { ascending: false });

      if (data) setOrders(data);
    } catch (err) {
      console.error('Phone lookup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="main-storefront-wrapper relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-36">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <PackageCheck className="w-8 h-8 text-accent-cyan" />
              <span>Digital Orders & Access Links</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              View your purchased games, active digital activation keys, and time-sensitive direct download tokens.
            </p>
          </div>

          {/* Quick Phone Search */}
          <form onSubmit={handlePhoneSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Mobile Phone (255...)"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 w-64"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-500 transition-colors"
            >
              Lookup
            </button>
          </form>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 animate-pulse">Loading order history...</div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => {
              const isCompleted = order.status === 'completed' || order.status === 'approved';

              return (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-glass-card border border-glass-border backdrop-blur-glass flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-brand-500/40 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{order.game_title}</span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isCompleted ? 'Payment Verified' : order.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Order: <strong className="text-slate-200">{order.order_number}</strong></span>
                      <span>Phone: <strong className="text-slate-200">{order.visitor_phone}</strong></span>
                      <span>Date: {formatDate(order.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Amount Paid</span>
                      <span className="text-base font-black text-brand-glow">
                        {order.amount === 0 ? 'FREE' : formatCurrency(order.amount)}
                      </span>
                    </div>

                    {isCompleted ? (
                      <Link
                        href={`/download/${order.download_token}`}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold shadow-glow hover:scale-105 transition-all flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Get Download</span>
                      </Link>
                    ) : (
                      <div className="text-xs text-amber-400 font-semibold flex items-center gap-1 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
                        <Clock className="w-4 h-4" />
                        <span>Awaiting Payment</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-900/40 rounded-3xl border border-glass-border text-center space-y-3">
            <PackageCheck className="w-12 h-12 text-slate-600" />
            <h3 className="text-lg font-bold text-white">No digital orders found</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              If you recently completed a mobile purchase, enter your phone number in the search bar above.
            </p>
            <Link href="/" className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-glow">
              Explore Digital Storefront
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
