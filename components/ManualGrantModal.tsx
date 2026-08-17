'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, UserPlus, Phone, User, Gamepad2, Banknote,
  Clock, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface ManualGrantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function ManualGrantModal({ isOpen, onClose, onSuccess }: ManualGrantModalProps) {
  const [games, setGames] = useState<Array<{ id: string; title: string; price: number; category?: string }>>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  const [selectedGameId, setSelectedGameId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('07');
  const [customerName, setCustomerName] = useState('Mteja wa WhatsApp');
  const [paymentSource, setPaymentSource] = useState('WhatsApp M-Pesa');
  const [accessDuration, setAccessDuration] = useState('Lifetime');
  const [amount, setAmount] = useState<number | string>('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successState, setSuccessState] = useState(false);

  const supabase = createClient();

  // Load available games from Supabase
  useEffect(() => {
    if (!isOpen) return;
    async function loadGames() {
      setLoadingGames(true);
      setErrorMsg('');
      try {
        const { data: gamesData } = await supabase
          .from('games')
          .select('id, title, price, category')
          .eq('status', 'published')
          .order('title', { ascending: true });

        const { data: postsData } = await supabase
          .from('posts')
          .select('id, title, price, category')
          .eq('status', 'published')
          .order('title', { ascending: true });

        const mergedMap = new Map<string, any>();
        (gamesData || []).forEach((g) => mergedMap.set(String(g.id), g));
        (postsData || []).forEach((p) => {
          if (!mergedMap.has(String(p.id))) mergedMap.set(String(p.id), p);
        });

        const list = Array.from(mergedMap.values());
        setGames(list);
        if (list.length > 0 && !selectedGameId) {
          setSelectedGameId(list[0].id);
          setAmount(list[0].price || 0);
        }
      } catch (err) {
        console.warn('Failed to load games for manual grant:', err);
      } finally {
        setLoadingGames(false);
      }
    }
    loadGames();
  }, [isOpen, supabase]);

  const handleGameSelect = (id: string) => {
    setSelectedGameId(id);
    const found = games.find((g) => g.id === id);
    if (found) {
      setAmount(found.price || 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGameId) {
      setErrorMsg('Tafadhali chagua mchezo kwanza.');
      return;
    }
    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 8) {
      setErrorMsg('Tafadhali weka namba sahihi ya simu ya mteja.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/orders/grant-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: selectedGameId,
          customerPhone,
          customerName,
          paymentSource,
          accessDuration,
          amount: Number(amount) || 0,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Imeshindwa kufungua access.');
      }

      setSuccessState(true);
      setTimeout(() => {
        setSuccessState(false);
        onSuccess(json.message || 'Access imefunguliwa kikamilifu!');
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Hitilafu imetokea.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden my-8"
        >
          {/* Top Gradient Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Fungulia Mteja Access (Manual Grant)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Instant Override
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Mpe mteja wa WhatsApp, simu, au ofisini access ya game mara moja bila kupitia STK push.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successState ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-white">ACCESS IMEFUNGULIWA KIKAMILIFU! 🎉</h3>
              <p className="text-xs text-slate-400">Game imewekwa kwenye mfumo na mteja anaweza kudownload mara moja.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Game Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1. Chagua Game / Mod</span>
                </label>
                {loadingGames ? (
                  <div className="h-11 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-xs text-slate-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Inapakia orodha ya michezo...</span>
                  </div>
                ) : (
                  <select
                    value={selectedGameId}
                    onChange={(e) => handleGameSelect(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {games.map((g) => (
                      <option key={g.id} value={g.id} className="bg-slate-900 text-white py-1">
                        {g.title} — ({formatCurrency(g.price)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2. Customer Phone & Name (Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>2. Namba ya Simu</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="07XXXXXXXX au 255..."
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>3. Jina la Mteja</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Mfano: Mteja wa WhatsApp"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* 3. Payment Source & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-amber-400" />
                    <span>4. Njia ya Malipo</span>
                  </label>
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="WhatsApp M-Pesa">WhatsApp M-Pesa</option>
                    <option value="Tigo Pesa Direct">Tigo Pesa Direct</option>
                    <option value="Airtel Money Direct">Airtel Money Direct</option>
                    <option value="Halopesa Direct">Halopesa Direct</option>
                    <option value="Cash / Free Promo">Cash / Free Promo</option>
                    <option value="Benki Direct / NMB / CRDB">Benki Direct / NMB / CRDB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>5. Muda wa Ufikiaji (Duration)</span>
                  </label>
                  <select
                    value={accessDuration}
                    onChange={(e) => setAccessDuration(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="Lifetime">♾️ Ufikiaji wa Maisha (Lifetime)</option>
                    <option value="30 Days">⏳ Siku 30 (Mwezi 1)</option>
                    <option value="7 Days">⏳ Siku 7 (Wiki 1)</option>
                    <option value="24 Hours">⏳ Masaa 24 (Siku 1)</option>
                    <option value="2 Hours">⏳ Masaa 2 tu</option>
                  </select>
                </div>
              </div>

              {/* 4. Amount Received */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kiasi Kilicholipwa (TZS)</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    {formatCurrency(Number(amount) || 0)}
                  </span>
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Kiasi cha TZS (Mfano: 3000)"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition-colors"
                >
                  Ghairi
                </button>

                <button
                  type="submit"
                  disabled={submitting || loadingGames}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Inafungua Access...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>⚡ THIBITISHA & FUNGUA ACCESS</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
