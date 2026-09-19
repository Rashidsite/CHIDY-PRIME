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
  MessageCircle,
} from 'lucide-react';
import { GameProduct, formatPlanDuration } from './GameCard';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { parseUniversalDownloadLinks, ExtractedDownloadLink } from '@/lib/link-parser';
import { cleanPhoneNumber, formatTzPhone, toLocalPhone } from '@/lib/payment-gateway';
import { calculateDurationExpiry, isGameAccessActive, saveUnlockedAccess, pruneExpiredAccess } from '@/lib/access-duration';

export type CheckoutStep = 'STEP_1_FORM' | 'STEP_2_PROCESSING' | 'STEP_3_SUCCESS';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: GameProduct;
  isUnlocked?: boolean;
  onSuccess?: (order: any) => void;
}

function getProductLabel(category: string): 'GAME' | 'MOD' | 'VIDEO' {
  const c = (category || '').toLowerCase();
  if (c.includes('mod') || c.includes('map') || c.includes('bus')) return 'MOD';
  if (c.includes('video') || c.includes('tv')) return 'VIDEO';
  return 'GAME';
}

const COUNTDOWN_INITIAL_SECONDS = 60;

export default function CheckoutModal({
  isOpen,
  onClose,
  game,
  isUnlocked = false,
  onSuccess,
}: CheckoutModalProps) {
  // ── Form State ──
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // ── Step State Machine ──
  const [step, setStep] = useState<CheckoutStep>('STEP_1_FORM');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_INITIAL_SECONDS);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [directLinks, setDirectLinks] = useState<ExtractedDownloadLink[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [usedGateway, setUsedGateway] = useState<string>('pressopay');
  const [gatewayReference, setGatewayReference] = useState<string | null>(null);
  const [dispatchingHaraka, setDispatchingHaraka] = useState(false);
  const [pushCount, setPushCount] = useState<number>(1);
  const [isRepushing, setIsRepushing] = useState<boolean>(false);

  const { syncPhoneAuth, profile } = useAuth();
  const isFree = game.price === 0;
  const productLabel = getProductLabel(game.category);

  // ── References & Timers ──
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const repushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pushCountRef = useRef<number>(1);
  const activeChannelRef = useRef<any>(null);
  const activeBroadcastRef = useRef<any>(null);
  const activeUnlockedListenerRef = useRef<any>(null);
  const prevIsOpenRef = useRef(false);
  const supabase = createClient();

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [isOpen]);

  // Reset or initialize ONLY when modal opens — validate Supabase for timed purchases
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Pre-fill phone/name from profile or localStorage if valid local format
      if (profile?.phone_number && !phone) {
        const raw = profile.phone_number.replace(/\D/g, '');
        const local = raw.startsWith('255') ? '0' + raw.slice(3) : raw;
        if (local.length === 10 && (local.startsWith('06') || local.startsWith('07'))) {
          setPhone(local);
        }
      } else if (!phone) {
        try {
          const savedPhone = localStorage.getItem('cpcg_user_phone');
          if (savedPhone) {
            const raw = savedPhone.replace(/\D/g, '');
            const local = raw.startsWith('255') ? '0' + raw.slice(3) : raw;
            if (local.length === 10 && (local.startsWith('06') || local.startsWith('07'))) {
              setPhone(local);
            }
          }
        } catch (e) {}
      }
      if (profile?.full_name && !fullName) {
        setFullName(profile.full_name);
      }

      // Check if game is free OR already unlocked with an active, non-expired duration window
      const rawDur =
        game?.access_duration ||
        game?.license_duration ||
        (game as any)?.plan_duration ||
        (game as any)?.duration_days;
      const isStillActive = game?.id ? isGameAccessActive(game.id, rawDur) : false;
      const isAlreadyUnlocked = isFree || isStillActive;

      if (isAlreadyUnlocked) {
        // Direct access: immediately render Step 3 Success with full download links
        setStep('STEP_3_SUCCESS');
        setError(null);
        prevIsOpenRef.current = isOpen;
        return;
      }

      // STRICT PAYWALL: Only games without active purchase open on STEP_1_FORM (Payment Prompt)
      setStep('STEP_1_FORM');
      setError(null);
      setCountdown(COUNTDOWN_INITIAL_SECONDS);
    } else if (!isOpen && prevIsOpenRef.current) {
      clearAllTimers();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, isFree, isUnlocked, game?.id, game?.access_duration, game?.license_duration]);

  // Load product download links
  useEffect(() => {
    const loadGameLinks = async () => {
      if (!isOpen || !game?.id) return;
      try {
        // Immediately populate from game props if available
        const immediate = parseUniversalDownloadLinks(game);
        if (immediate && immediate.length > 0) {
          setDirectLinks(immediate);
        }

        const { data: postData } = await supabase
          .from('posts')
          .select('*')
          .eq('id', game.id)
          .maybeSingle();

        const mergedRecord = { ...game, ...postData };
        const extracted = parseUniversalDownloadLinks(mergedRecord);
        if (extracted && extracted.length > 0) {
          setDirectLinks(extracted);
        }
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
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (repushTimerRef.current) {
      clearInterval(repushTimerRef.current);
      repushTimerRef.current = null;
    }
    if (activeChannelRef.current) {
      supabase.removeChannel(activeChannelRef.current);
      activeChannelRef.current = null;
    }
    if (activeBroadcastRef.current) {
      supabase.removeChannel(activeBroadcastRef.current);
      activeBroadcastRef.current = null;
    }
    if (activeUnlockedListenerRef.current && typeof window !== 'undefined') {
      window.removeEventListener('cpcg_order_unlocked', activeUnlockedListenerRef.current);
      activeUnlockedListenerRef.current = null;
    }
  };

  const resetAndClose = () => {
    clearAllTimers();
    setPushCount(1);
    pushCountRef.current = 1;
    setIsRepushing(false);

    // Only remove game from unlocked cache IF its duration has actually expired.
    // Never remove active or lifetime purchases just because the customer closed the modal!
    try {
      if (game?.id) {
        const stillActive = isGameAccessActive(
          game.id,
          game.access_duration || game.license_duration || (game as any).plan_duration || (game as any).duration_days
        );

        if (!stillActive) {
          pruneExpiredAccess(game.id);
        }
      }
    } catch (e) {}

    setStep('STEP_1_FORM');
    setError(null);
    setActiveOrder(null);
    setCountdown(COUNTDOWN_INITIAL_SECONDS);
    onClose();
  };

  const handleRetry = () => {
    clearAllTimers();
    setPushCount(1);
    pushCountRef.current = 1;
    setIsRepushing(false);
    setError(null);
    setCountdown(COUNTDOWN_INITIAL_SECONDS);
    setStep('STEP_1_FORM');
  };

  // Auto-Repush mechanism: sends up to 4 pushes if customer hasn't paid yet
  const startAutoRepush = (orderId: string, orderNumber: string, phoneToPush: string, orderAmount: number, orderTitle: string) => {
    if (repushTimerRef.current) {
      clearInterval(repushTimerRef.current);
      repushTimerRef.current = null;
    }

    pushCountRef.current = 1;
    setPushCount(1);

    // Repush every 13 seconds (attempts 2, 3, 4) until paid or max 4 reached
    repushTimerRef.current = setInterval(async () => {
      if (pushCountRef.current >= 4) {
        if (repushTimerRef.current) {
          clearInterval(repushTimerRef.current);
          repushTimerRef.current = null;
        }
        return;
      }

      const nextAttempt = pushCountRef.current + 1;
      try {
        console.log(`[Auto-Repush ⚡] Auto sending push #${nextAttempt}/4 to ${phoneToPush}...`);
        const res = await fetch('/api/checkout/repush', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderId,
            order_number: orderNumber,
            phone: phoneToPush,
            amount: orderAmount,
            title: orderTitle,
            attempt: nextAttempt,
          }),
        });
        const data = await res.json();
        if (data?.is_paid && data?.order) {
          handlePaymentConfirmed(data.order);
          return;
        }
        if (data?.success) {
          pushCountRef.current = nextAttempt;
          setPushCount(nextAttempt);
        }
      } catch (err) {
        console.warn('Auto-repush poll error:', err);
      }
    }, 13000);
  };

  const handleManualRepush = async () => {
    if (isRepushing || pushCountRef.current >= 4) return;
    setIsRepushing(true);
    setError(null);
    const nextAttempt = pushCountRef.current + 1;
    try {
      const targetId = activeOrder?.id || localStorage.getItem('cpcg_active_order_id') || '';
      const targetNumber = activeOrder?.order_number || localStorage.getItem('cpcg_active_order_number') || '';
      const digitsOnly = phone.replace(/\D/g, '');
      const internationalPhone = digitsOnly.startsWith('255') ? digitsOnly : '255' + digitsOnly.slice(-9);

      const res = await fetch('/api/checkout/repush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: targetId,
          order_number: targetNumber,
          phone: internationalPhone,
          amount: game.price,
          title: game.title,
          attempt: nextAttempt,
        }),
      });
      const data = await res.json();
      if (data?.is_paid && data?.order) {
        handlePaymentConfirmed(data.order);
        return;
      }
      if (data?.success) {
        pushCountRef.current = nextAttempt;
        setPushCount(nextAttempt);
      } else {
        setError(data?.error || 'Imeshindikana kutuma push nyingine kwa sasa.');
      }
    } catch (err: any) {
      setError(err?.message || 'Hitilafu ya mtandao wakati wa kutuma push.');
    } finally {
      setIsRepushing(false);
    }
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

  // Transition to Step 3: SUCCESS RECEIPT & DIRECT UNLOCK (Strict Verified Check)
  const handlePaymentConfirmed = (order: any) => {
    const statusStr = String(order?.status || order?.payment_status || '').toLowerCase();
    const isExplicitlyApproved = ['completed', 'approved', 'paid', 'success'].includes(statusStr);

    // STRICT PAYWALL SECURITY GUARD: Paid games MUST have explicit verified approval status
    if (!isFree && !isExplicitlyApproved) {
      console.warn('[CheckoutModal 🔒 Paywall] Blocked premature unlock attempt for paid game (status:', statusStr, '):', game.title);
      return;
    }

    clearAllTimers();
    setActiveOrder(order);

    if (order?.download_links && Array.isArray(order.download_links) && order.download_links.length > 0) {
      setDirectLinks(
        order.download_links.map((l: any) => ({
          label: l.name || l.label || 'Download File',
          url: l.url || '',
        }))
      );
    }

    if (onSuccess) {
      onSuccess(order);
    }

    try {
      const targetId = order?.game_id || order?.product_id || game.id;
      if (targetId) {
        const cleanedPhone = cleanPhoneNumber(phone) || localStorage.getItem('cpcg_user_phone') || '';
        const rawDuration =
          game.access_duration ||
          game.license_duration ||
          (game as any).plan_duration ||
          (game as any).duration_days ||
          order?.access_duration ||
          'Lifetime';

        saveUnlockedAccess(
          targetId,
          game.title,
          rawDuration,
          cleanedPhone,
          order?.order_number || order?.id
        );

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('cpcg_order_unlocked', {
              detail: order || { game_id: targetId, productId: targetId, isApproved: true },
            })
          );
          window.dispatchEvent(new Event('cpcg_auth_change'));
        }
      }
    } catch (e) {}

    setStep('STEP_3_SUCCESS');
  };

  // Start Realtime Webhook & Polling listener with strict ID verification
  const startPaymentPolling = (orderId: string, orderNumber?: string, gwRef?: string) => {
    // 1. Strict Guard Clause: Do not initialize channel with undefined/empty order ID
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '' || orderId === 'undefined') {
      console.warn('Payment polling skipped: invalid or undefined order reference.');
      return;
    }

    clearAllTimers();

    const cleanOrderId = orderId.trim();
    const cleanOrderNumber = (orderNumber || cleanOrderId).trim();
    const cleanedPhone = cleanPhoneNumber(phone) || localStorage.getItem('cpcg_user_phone') || '';
    const cleanGwRef = String(gwRef || gatewayReference || '').trim();

    // Clean up any previously active channels before subscribing
    if (activeChannelRef.current) {
      supabase.removeChannel(activeChannelRef.current);
      activeChannelRef.current = null;
    }
    if (activeBroadcastRef.current) {
      supabase.removeChannel(activeBroadcastRef.current);
      activeBroadcastRef.current = null;
    }

    // 2. Supabase Realtime: listen for DB updates on payment_orders & orders
    const channel = supabase
      .channel(`order_status_${cleanOrderId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'payment_orders', 
          filter: `id=eq.${cleanOrderId}` 
        },
        (payload: any) => {
          const status = (payload.new?.status || '').toLowerCase();
          if (['completed', 'approved', 'paid', 'success'].includes(status)) {
            handlePaymentConfirmed({
              ...payload.new,
              id: payload.new.id,
              game_id: payload.new.post_id || game.id,
              status: 'completed',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders', 
          filter: `id=eq.${cleanOrderId}` 
        },
        (payload: any) => {
          const status = (payload.new?.status || payload.new?.payment_status || '').toLowerCase();
          if (['completed', 'approved', 'paid', 'success'].includes(status)) {
            handlePaymentConfirmed(payload.new);
          }
        }
      )
      .subscribe();

    activeChannelRef.current = channel;

    // 3. Ultra-Reliable 2s Polling interval with live gateway status verification
    let attempts = 0;
    const maxAttempts = 60; // 60 × 2s = 2 minutes

    pollTimerRef.current = setInterval(async () => {
      attempts++;
      try {
        const gwParam = cleanGwRef ? `&gateway_ref=${encodeURIComponent(cleanGwRef)}` : '';
        const res = await fetch(
          `/api/payment/check-status?reference=${encodeURIComponent(cleanOrderNumber || cleanOrderId)}&phone=${encodeURIComponent(cleanedPhone)}${gwParam}`
        );
        const data = await res.json();
        const isConfirmed = 
          data?.success && 
          (data?.is_completed === true || data?.isCompleted === true) && 
          ['completed', 'approved', 'paid', 'success'].includes(String(data?.status || data?.order?.status || '').toLowerCase());

        if (isConfirmed && data?.order) {
          handlePaymentConfirmed(data.order);
          return;
        }

        // Secondary fallback: hit /api/checkout/status every 3rd attempt
        if (attempts % 3 === 0) {
          const res2 = await fetch(
            `/api/checkout/status?order_id=${encodeURIComponent(cleanOrderId)}&phone=${encodeURIComponent(cleanedPhone)}${gwParam}`
          );
          const data2 = await res2.json();
          const isConfirmed2 = 
            data2?.success && 
            (data2?.is_completed === true || data2?.isCompleted === true) && 
            ['completed', 'approved', 'paid', 'success'].includes(String(data2?.status || data2?.order?.status || '').toLowerCase());

          if (isConfirmed2 && data2?.order) {
            handlePaymentConfirmed(data2.order);
            return;
          }
        }
      } catch (err) {
        console.warn('Status poll error:', err);
      }

      if (attempts >= maxAttempts) {
        clearAllTimers();
        setError('Muda wa kusubiri malipo umekwisha. Kama umeweka PIN tafadhali bonyeza Hakiki Malipo.');
      }
    }, 2000);
  };

  const handleManualCheck = async () => {
    setCheckingStatus(true);
    setError(null);
    try {
      const target = activeOrder?.id || activeOrder?.order_number || localStorage.getItem('cpcg_active_order_id') || '';
      const cleaned = cleanPhoneNumber(phone) || localStorage.getItem('cpcg_user_phone') || '';
      const gwRef = gatewayReference || '';

      if (!target) {
        setError('Namba ya oda haikupatikana. Tafadhali bonyeza Jaribu Tena.');
        return;
      }

      const gwParam = gwRef ? `&gateway_ref=${encodeURIComponent(gwRef)}` : '';
      const res = await fetch(`/api/checkout/status?order_id=${encodeURIComponent(target)}&phone=${encodeURIComponent(cleaned)}${gwParam}`);
      const data = await res.json();

      const isConfirmed = 
        data.success && 
        (data.is_completed === true || data.isCompleted === true) && 
        ['completed', 'approved', 'paid', 'success'].includes(String(data.status || data.order?.status || '').toLowerCase());

      if (isConfirmed && data.order) {
        handlePaymentConfirmed(data.order);
      } else {
        setError('Malipo bado hayajathibitishwa na mtandao wa simu. Tafadhali kamilisha kuingiza PIN kwenye simu yako kisha bonyeza Hakiki.');
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

    const digitsOnly = phone.replace(/\D/g, '');
    let localPhone = digitsOnly;
    if (digitsOnly.startsWith('255') && digitsOnly.length === 12) {
      localPhone = '0' + digitsOnly.slice(3);
    }

    // Strict Tanzanian Mobile Network Validation (06XXXXXXXX or 07XXXXXXXX)
    const isValidTz =
      localPhone.length === 10 &&
      (localPhone.startsWith('06') || localPhone.startsWith('07'));

    if (!isValidTz) {
      setError('Tafadhali weka namba sahihi ya simu ya Tanzania inayoanza na 06 au 07 (tarakimu 10 kamili, mfano: 0796615257).');
      return;
    }

    const internationalPhone = '255' + localPhone.slice(1);
    const resolvedName = fullName.trim() || `User-${localPhone}`;

    try {
      localStorage.setItem('cpcg_user_phone', localPhone);
      localStorage.setItem('cpcg_user_registered', 'true');
      localStorage.setItem('cpcg_active_game_id', game.id);
    } catch (e) {}

    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: resolvedName,
        phone: internationalPhone,
      }),
    }).catch(() => {});

    syncPhoneAuth(resolvedName, localPhone);

    setStep('STEP_2_PROCESSING');
    startCountdown();
    setLoading(true);

    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: game.id,
        price: game.price,
        amount: game.price,
        title: game.title,
        visitor_phone: internationalPhone,
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

        const orderResult = data.order || { id: data.orderId, order_number: data.orderNumber };
        setActiveOrder(orderResult);

        // Capture gateway data from API response
        if (data.checkoutUrl) setCheckoutUrl(data.checkoutUrl);
        if (data.usedGateway) setUsedGateway(data.usedGateway);
        if (data.gatewayReference) setGatewayReference(data.gatewayReference);

        try {
          if (orderResult?.id) localStorage.setItem('cpcg_active_order_id', orderResult.id);
          if (orderResult?.order_number) localStorage.setItem('cpcg_active_order_number', orderResult.order_number);
        } catch (e) {}

        // STRICT PAYWALL: Only 100% free games (price === 0) skip polling. Paid games MUST stay on STEP_2_PROCESSING and wait for verified USSD PIN entry!
        if (isFree) {
          handlePaymentConfirmed(orderResult);
        } else if (orderResult?.id) {
          startPaymentPolling(orderResult.id, orderResult.order_number, data.gatewayReference || '');
          startAutoRepush(orderResult.id, orderResult.order_number, internationalPhone, game.price, game.title);
        } else {
          setError('Hitilafu ya kuanzisha malipo kwenye simu. Tafadhali bonyeza Jaribu Tena.');
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
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
      className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-[6px] flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="bg-[#0B111E]/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] space-y-6 max-h-[92vh] overflow-y-auto overscroll-contain"
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
                      CHIDYPRIME x CHIDYGAMING
                    </h3>
                    <p className="text-[10px] text-blue-400 font-bold">Malipo ya Haraka kwa Simu ({productLabel})</p>
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
                  <span className="inline-block mt-1 text-[10px] text-emerald-400 font-black">
                    {formatPlanDuration(game.access_duration || game.license_duration, isFree)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Bei</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400">
                    {isFree ? 'BURE' : formatCurrency(game.price)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Jina Lako Kamili (Full Name)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Mfano: Rashid Chidy"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#111827] border border-slate-700/80 rounded-2xl px-4 py-3.5 text-xs text-white placeholder:text-slate-500 font-bold focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Namba ya Simu (06XX / 07XX)</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="07XXXXXXXX au 06XXXXXXXX"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                      if (error) setError(null);
                    }}
                    className="w-full bg-[#111827] border border-slate-700/80 rounded-2xl px-4 py-3.5 text-xs text-emerald-400 font-mono font-bold placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 font-medium">
                    Andika namba yako halisi ya Vodacom, Tigo, Airtel au Halotel (tarakimu 10 kuanzia 06 au 07)
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Inatuma USSD Push...</span>
                    </>
                  ) : (
                    <>
                      <span>{isFree ? 'FUNGUA BURE SASA' : `LIPA ${formatCurrency(game.price)} SASA`}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* STEP 2: PROCESSING / USSD PUSH WAIT */}
          {step === 'STEP_2_PROCESSING' && (
            <div className="text-center space-y-5 py-2">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-500/20">
                  <Smartphone className="w-8 h-8 animate-bounce" />
                </div>
              </div>

              {/* Progress Line */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-1/2 h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 rounded-full"
                />
              </div>

              <div className="space-y-3 max-w-sm">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>USSD Push Imetumwa</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-wider">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400 animate-bounce" />
                    <span>Push {pushCount} ya 4</span>
                  </div>
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

                <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200 font-bold leading-relaxed space-y-1.5">
                  <p className="text-white font-extrabold">
                    📲 Tafadhali kamilisha malipo kwa kuweka PIN kwenye simu yako (<span className="text-amber-400 font-mono font-black">{phone}</span>)...
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Kiasi: <span className="text-emerald-400 font-black">{formatCurrency(game.price)}</span> | Mtandao: <span className="text-blue-400 font-black">M-Pesa / Tigo Pesa / Airtel / HaloPesa</span>
                  </p>
                  <div className="pt-1 text-[11px] text-amber-300/90 font-medium flex items-center justify-center gap-1.5">
                    <span>⚡ Push inarudiwa hadi mara 4 ukichelewa au ukikosa kuweka PIN.</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Ukurasa huu utajifungua kiotomatiki mara tu unapoingiza PIN yako!
                </p>
              </div>

                {checkoutUrl && (
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-colors text-center shadow-md"
                  >
                    👉 LIPA HAPA SELCOM / M-PESA (Njia ya pili)
                  </a>
                )}

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
                {pushCount < 4 && (
                  <button
                    type="button"
                    disabled={isRepushing}
                    onClick={handleManualRepush}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isRepushing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Inatuma Push ya {pushCount + 1} Kwenye Simu...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse" />
                        <span>Hujaona Push? Tuma Push ya {pushCount + 1}/4 Sasa</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  disabled={checkingStatus}
                  onClick={handleManualCheck}
                  className="w-full min-h-[44px] py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50"
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
                  <span className="text-white font-extrabold font-mono text-xs">
                    {(() => {
                      const name = (fullName || '').trim();
                      // Priority: activeOrder phone → localStorage saved phone → cleaned form phone
                      const orderPhone =
                        activeOrder?.visitor_phone ||
                        activeOrder?.phone_number ||
                        activeOrder?.phone ||
                        '';
                      const localPhone =
                        typeof window !== 'undefined'
                          ? localStorage.getItem('cpcg_user_phone') || ''
                          : '';
                      const formPhone = cleanPhoneNumber(phone) || '';
                      // Use the longest/most complete phone available
                      const rawPhone = [orderPhone, localPhone, formPhone]
                        .map((p) => (p || '').replace(/\D/g, ''))
                        .sort((a, b) => b.length - a.length)[0] || '';

                      if (rawPhone && rawPhone.length >= 9) {
                        const p = rawPhone.startsWith('255') ? '0' + rawPhone.slice(3) : rawPhone;
                        const formattedPhone =
                          p.length === 10
                            ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}`
                            : p;
                        if (name && !name.startsWith('User-')) {
                          return `${name} (${formattedPhone})`;
                        }
                        return formattedPhone;
                      }
                      return name || 'Mteja';
                    })()}
                  </span>
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
