'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Smartphone,
  ShieldCheck,
  Zap,
  Loader2,
  CheckCircle2,
  Download,
  Key,
  ExternalLink,
  Search,
  User,
  RotateCcw,
  Clock,
  Radio,
  AlertTriangle,
  Copy,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { GameProduct, formatPlanDuration } from './GameCard';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { parseUniversalDownloadLinks, ExtractedDownloadLink } from '@/lib/link-parser';
import { useAuth } from './AuthProvider';
import { cleanPhoneNumber } from '@/lib/payment-gateway';

export type CheckoutStep = 'STEP_1_FORM' | 'STEP_2_PROCESSING' | 'STEP_3_SUCCESS';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: GameProduct;
  onSuccess?: (order: any) => void;
}

function getProductLabel(category: string): 'GAME' | 'MOD' | 'VIDEO' {
  const c = (category || '').toLowerCase();
  if (c.includes('mod') || c.includes('map') || c.includes('bus')) return 'MOD';
  if (c.includes('video') || c.includes('tv')) return 'VIDEO';
  return 'GAME';
}

const COUNTDOWN_INITIAL_SECONDS = 60;

export default function CheckoutModal({ isOpen, onClose, game, onSuccess }: CheckoutModalProps) {
  // ── Form State ──
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('07');

  // ── Step State Machine ──
  const [step, setStep] = useState<CheckoutStep>('STEP_1_FORM');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_INITIAL_SECONDS);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [directLinks, setDirectLinks] = useState<ExtractedDownloadLink[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);

  const { syncPhoneAuth, profile } = useAuth();
  const isFree = game.price === 0;
  const productLabel = getProductLabel(game.category);

  // ── References & Timers ──
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevIsOpenRef = useRef(false);
  const supabase = createClient();

  // Reset or initialize ONLY when modal opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      let isUnlockedAlready = isFree;
      try {
        const savedUnlocked = localStorage.getItem('cpcg_unlocked_games');
        if (savedUnlocked) {
          const parsed = JSON.parse(savedUnlocked);
          if (Array.isArray(parsed) && parsed.includes(game?.id)) {
            isUnlockedAlready = true;
          }
        }
      } catch (e) {}

      if (isUnlockedAlready) {
        setStep('STEP_3_SUCCESS');
      } else {
        setStep('STEP_1_FORM');
        setError(null);
        setCountdown(COUNTDOWN_INITIAL_SECONDS);

        if (profile?.phone_number && (phone === '07' || !phone)) {
          setPhone(profile.phone_number);
        }
        if (profile?.full_name && !fullName) {
          setFullName(profile.full_name);
        }
      }
    } else if (!isOpen && prevIsOpenRef.current) {
      clearAllTimers();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, isFree, game?.id]);

  // Load product download links
  useEffect(() => {
    const loadGameLinks = async () => {
      if (!isOpen || !game?.id) return;
      try {
        const { data: postData } = await supabase
          .from('posts')
          .select('*')
          .eq('id', game.id)
          .maybeSingle();

        const { data: gameData } = await supabase
          .from('games')
          .select('*')
          .eq('id', game.id)
          .maybeSingle();

        const mergedRecord = { ...game, ...postData, ...gameData };
        const extracted = parseUniversalDownloadLinks(mergedRecord);
        setDirectLinks(extracted);
      } catch (e) {}
    };

    loadGameLinks();
  }, [isOpen, game?.id]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  const clearAllTimers = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  const resetAndClose = () => {
    clearAllTimers();
    setStep('STEP_1_FORM');
    setError(null);
    setPhone('07');
    setActiveOrder(null);
    setCountdown(COUNTDOWN_INITIAL_SECONDS);
    onClose();
  };

  const handleRetry = () => {
    clearAllTimers();
    setError(null);
    setCountdown(COUNTDOWN_INITIAL_SECONDS);
    setStep('STEP_1_FORM');
  };

  // Start 60s Countdown Timer
  const startCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(COUNTDOWN_INITIAL_SECONDS);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setError('Muda wa kuthibitisha malipo umekwisha. Tafadhali bonyeza Hakiki Malipo au Jaribu Tena.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Transition to Step 3: SUCCESS RECEIPT & DIRECT UNLOCK
  const handlePaymentConfirmed = (order: any) => {
    clearAllTimers();
    setActiveOrder(order);

    if (onSuccess) {
      onSuccess(order);
    }

    try {
      if (order?.game_id || game.id) {
        const targetId = order?.game_id || game.id;
        const currentUnlocked = JSON.parse(localStorage.getItem('cpcg_unlocked_games') || '[]');
        if (!currentUnlocked.includes(targetId)) {
          currentUnlocked.push(targetId);
          localStorage.setItem('cpcg_unlocked_games', JSON.stringify(currentUnlocked));
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cpcg_order_unlocked', { detail: order || { game_id: targetId } }));
        }
      }
    } catch (e) {}

    setStep('STEP_3_SUCCESS');
  };

  // Start Realtime Webhook & Polling listener
  const startPaymentPolling = (orderId: string, orderNumber: string) => {
    let attempts = 0;
    const maxAttempts = 60;

    const channel = supabase
      .channel(`order_checkout_status_${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload: any) => {
          const status = (payload.new?.status || '').toLowerCase();
          if (['completed', 'approved', 'paid'].includes(status)) {
            handlePaymentConfirmed(payload.new);
            supabase.removeChannel(channel);
          }
        }
      )
      .subscribe();

    const broadcastChannel = supabase
      .channel(`order_broadcast_modal_${orderId}`)
      .on(
        'broadcast',
        { event: 'ORDER_APPROVED' },
        (payload: any) => {
          const data = payload?.payload || payload;
          if (data && (data.orderId === orderId || data.orderNumber === orderNumber || data.productId === game.id)) {
            clearAllTimers();
            supabase.removeChannel(channel);
            supabase.removeChannel(broadcastChannel);
            handlePaymentConfirmed({
              id: orderId,
              order_number: orderNumber,
              game_id: game.id,
              status: 'completed',
              activation_key: data.activationKey,
              download_token: data.downloadToken,
            });
          }
        }
      )
      .subscribe();

    const handleWindowUnlocked = (e: any) => {
      const detail = e?.detail;
      if (
        detail &&
        (detail.orderId === orderId ||
          detail.orderNumber === orderNumber ||
          detail.productId === game.id ||
          detail.game_id === game.id)
      ) {
        clearAllTimers();
        supabase.removeChannel(channel);
        supabase.removeChannel(broadcastChannel);
        handlePaymentConfirmed({
          id: orderId,
          order_number: orderNumber,
          game_id: game.id,
          status: 'completed',
          activation_key: detail.activationKey || detail.activation_key,
          download_token: detail.downloadToken || detail.download_token,
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('cpcg_order_unlocked', handleWindowUnlocked);
    }

    pollTimerRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/orders/status?ref=${orderId}`);
        const data = await res.json();
        if (data.success && data.is_completed) {
          clearAllTimers();
          supabase.removeChannel(channel);
          supabase.removeChannel(broadcastChannel);
          if (typeof window !== 'undefined') {
            window.removeEventListener('cpcg_order_unlocked', handleWindowUnlocked);
          }
          handlePaymentConfirmed(data.order);
          return;
        }
      } catch (err) {
        console.warn('Status poll error:', err);
      }

      if (attempts >= maxAttempts) {
        clearAllTimers();
        supabase.removeChannel(channel);
        supabase.removeChannel(broadcastChannel);
        if (typeof window !== 'undefined') {
          window.removeEventListener('cpcg_order_unlocked', handleWindowUnlocked);
        }
      }
    }, 2000);
  };

  const handleManualCheck = async () => {
    setCheckingStatus(true);
    setError(null);
    try {
      const target = activeOrder?.id || activeOrder?.order_number || localStorage.getItem('cpcg_active_order_id') || '';
      const cleaned = cleanPhoneNumber(phone) || localStorage.getItem('cpcg_user_phone') || '';

      let res = await fetch(`/api/orders/status?ref=${encodeURIComponent(target)}&phone=${encodeURIComponent(cleaned)}`);
      let data = await res.json();

      if (!data.success || !data.is_completed) {
        res = await fetch(`/api/checkout/status?order_id=${encodeURIComponent(target)}&phone=${encodeURIComponent(cleaned)}`);
        data = await res.json();
      }

      if (data.success && data.is_completed) {
        handlePaymentConfirmed(data.order || { id: target, game_id: game.id, status: 'completed' });
      } else {
        setError('Malipo bado hayajathibitishwa na mtandao wa simu. Tafadhali subiri kidogo kisha bonyeza tena Hakiki.');
      }
    } catch (e: any) {
      setError(e.message || 'Hitilafu imetokea wakati wa kuhakiki malipo.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleaned = cleanPhoneNumber(phone);

    if (!cleaned || cleaned.length < 9) {
      setError('Tafadhali weka namba sahihi ya simu (mfano: 07XX XXX XXX au 06XX XXX XXX).');
      return;
    }

    const resolvedName = fullName.trim() || `User-${cleaned}`;

    try {
      localStorage.setItem('cpcg_user_phone', cleaned);
      localStorage.setItem('cpcg_user_registered', 'true');
      localStorage.setItem('cpcg_active_game_id', game.id);
    } catch (e) {}

    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: resolvedName,
        phone: cleaned,
      }),
    }).catch(() => {});

    syncPhoneAuth(resolvedName, cleaned);

    setStep('STEP_2_PROCESSING');
    startCountdown();

    setLoading(true);

    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: game.id,
        visitor_phone: cleaned,
        customer_name: resolvedName,
        payment_gateway: 'pressopay',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          setError(data.error || 'Malipo hayakufanikiwa kuanzishwa kwenye simu. Tafadhali bonyeza Jaribu Tena.');
          return;
        }

        setActiveOrder(data.order);

        try {
          if (data.order?.id) localStorage.setItem('cpcg_active_order_id', data.order.id);
          if (data.order?.order_number) localStorage.setItem('cpcg_active_order_number', data.order.order_number);
        } catch (e) {}

        if (isFree || data.order?.status === 'completed' || data.order?.status === 'approved') {
          handlePaymentConfirmed(data.order);
        } else {
          startPaymentPolling(data.order.id, data.order.order_number);
        }
      })
      .catch((err) => {
        setError(err.message || 'Hitilafu ya mtandao imetokea. Tafadhali bonyeza Jaribu Tena.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleCopyKey = () => {
    if (!activeOrder?.activation_key) return;
    navigator.clipboard.writeText(activeOrder.activation_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="bg-[#0B111E] border border-slate-800/80 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
        >

          {/* STEP 1: INPUT FORM */}
          {step === 'STEP_1_FORM' && (
            <>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
                    <Zap className="w-5 h-5 fill-white text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                      MALIPO YA HARAKA ({productLabel})
                    </h3>
                    <p className="text-[10px] text-blue-400 font-bold">Instant STK Push Delivery</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetAndClose}
                  className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center hover:text-white transition-colors cursor-pointer touch-manipulation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800/80 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black uppercase text-blue-400 block tracking-widest">
                    {game.category}
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-white truncate mt-0.5">
                    {game.title}
                  </h4>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block leading-none mb-1">BEI</span>
                  <span className="text-sm font-black text-white leading-none block">
                    {formatCurrency(game.price)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5">
                    JINA LAKO KAMILI (FULL NAME)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Mbwana Samatta (Optional)"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#111827] border border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <User className="w-4 h-4 text-blue-400 absolute left-3.5 top-4" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5">
                    NAMBA YA SIMU YA MALIPO (07XX / 06XX)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="07XX XXX XXX au 06XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#111827] border border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <Smartphone className="w-4 h-4 text-blue-400 absolute left-3.5 top-4" />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98]"
                >
                  <Zap className="w-4 h-4 fill-white text-white" />
                  <span>LIPA TSH {game.price.toLocaleString()} KWA SIMU</span>
                </button>

                <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>100% Salama • Auto-Account & STK Push Unlocking</span>
                </div>
              </form>
            </>
          )}

          {/* STEP 2: PROCESSING & AWAITING PIN */}
          {step === 'STEP_2_PROCESSING' && (
            <div className="flex flex-col items-center justify-center py-4 gap-5 text-center">
              <div className="relative flex items-center justify-center my-2">
                <motion.div
                  animate={{ scale: [1, 1.45, 1], opacity: [0.25, 0.75, 0.25] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute w-24 h-24 rounded-full bg-blue-600/20 border border-blue-500/40"
                />
                <motion.div
                  animate={{ scale: [1, 1.85, 1], opacity: [0.1, 0.35, 0.1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
                  className="absolute w-32 h-32 rounded-full bg-indigo-600/15"
                />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/30">
                  <Smartphone className="w-9 h-9 text-white animate-pulse" />
                </div>
              </div>

              <div className="w-full max-w-xs h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-1/2 h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 rounded-full"
                />
              </div>

              <div className="space-y-3 max-w-sm">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>USSD Push Imetumwa Kwenye Simu</span>
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  Weka PIN Kwenye Simu Yako
                </h3>

                {/* Network Badges */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[9px] font-black border border-rose-500/30">M-PESA</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[9px] font-black border border-blue-500/30">TIGO PESA</span>
                  <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-[9px] font-black border border-red-500/30">AIRTEL</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/30">HALOPESA</span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200 font-bold leading-relaxed">
                  📲 Tafadhali angalia simu yako (<span className="text-white font-black">{phone}</span>) sasa hivi na uingize PIN yako ya siri kuthibitisha malipo ya{' '}
                  <span className="text-emerald-400 font-black">{formatCurrency(game.price)}</span>.
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Ukurasa huu utajifungua kiotomatiki mara tu unapoingiza PIN yako!
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#111827] border border-slate-800 text-xs font-mono font-bold text-slate-300">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Muda uliobaki: </span>
                <span className={countdown <= 10 ? 'text-rose-400 font-black' : 'text-blue-400 font-black'}>
                  {countdown}s
                </span>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold text-left flex items-start gap-2.5 w-full">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <span>⚠️ {error}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2.5 w-full mt-1">
                <button
                  type="button"
                  disabled={checkingStatus}
                  onClick={handleManualCheck}
                  className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50"
                >
                  {checkingStatus ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Inahakiki Kwenye Mtandao...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>🔎 HAKIKI MALIPO (VERIFY PAYMENT)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="flex-1 py-3 px-4 rounded-2xl bg-[#111827] border border-slate-700 text-slate-300 text-xs font-bold hover:text-white hover:border-slate-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>JARIBU TENA</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="py-3 px-4 rounded-2xl bg-[#111827] border border-slate-800 text-slate-400 text-xs font-bold hover:text-white transition-colors cursor-pointer touch-manipulation"
                  >
                    Ghairi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS RECEIPT */}
          {step === 'STEP_3_SUCCESS' && (
            <div className="space-y-6">
              <div className="text-center space-y-3 pt-2">
                <motion.div
                  initial={{ scale: 0, rotate: -25 }}
                  animate={{ scale: [0, 1.25, 1], rotate: [0, 8, 0] }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </motion.div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                    Malipo Yamefanikiwa! 🎉
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Huduma yako imethibitishwa na kufunguliwa papo hapo.
                  </p>
                </div>

                <div className="py-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                    {formatCurrency(game.price)}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#080D18] border border-slate-800/80 space-y-3 text-left">
                <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Mteja</span>
                  <span className="text-white font-extrabold">{fullName || phone}</span>
                </div>

                <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Bidhaa</span>
                  <span className="text-white font-extrabold truncate max-w-[200px]">{game.title}</span>
                </div>

                <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-purple-400" /> Muda wa Ufikiaji
                  </span>
                  <span className="text-purple-300 font-black">
                    {formatPlanDuration(game.access_duration || game.license_duration || activeOrder?.access_duration, isFree)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Ref ID</span>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {activeOrder?.order_number || activeOrder?.id || `CPCG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`}
                  </span>
                </div>

                {activeOrder?.activation_key && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" /> Key:
                    </span>
                    <span className="font-mono text-xs font-extrabold text-amber-400 truncate max-w-[180px]">
                      {activeOrder.activation_key}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded-md transition-colors cursor-pointer"
                    >
                      {copiedKey ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase text-slate-400 block text-left tracking-widest pl-1">
                  Viunganishi vya Kupakua ({directLinks.length || 1})
                </span>

                {directLinks.length > 0 ? (
                  directLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-600/20 cursor-pointer touch-manipulation hover:scale-[1.01]"
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Download className="w-4 h-4 shrink-0" />
                        <span>{link.label}</span>
                      </span>
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                  >
                    <span>PAKUA GAME SASA ➔</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={resetAndClose}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#111827] border border-slate-800 text-slate-300 text-xs font-bold hover:text-white transition-colors cursor-pointer touch-manipulation"
              >
                Kamilisha (Done)
              </button>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
