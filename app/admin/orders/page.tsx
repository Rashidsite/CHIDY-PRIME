'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Search, RefreshCw, Radio,
  CheckCircle2, XCircle, Clock, User, Phone, Package,
  BadgeCheck, AlertTriangle, X, Download, Banknote,
  ChevronRight, ShieldCheck, ShieldX, Loader2,
  Bell, Inbox, UserPlus, PlusCircle, Trash2, Sparkles,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import ManualGrantModal from '@/components/ManualGrantModal';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// ────────────────────────────────────────────────────────────────────────────
// STATUS CONFIG
// ────────────────────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; row: string; badge: string; icon: React.ReactNode; delivery: string; deliveryColor: string }> = {
  completed:  { label: 'Approved',   row: 'border-l-emerald-500', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" />, delivery: '✅ Huduma imetolewa — mtu amepata download link', deliveryColor: 'text-emerald-400' },
  approved:   { label: 'Approved',   row: 'border-l-emerald-500', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" />, delivery: '✅ Huduma imetolewa — mtu amepata download link', deliveryColor: 'text-emerald-400' },
  pending:    { label: 'Pending',    row: 'border-l-amber-500',   badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',       icon: <Clock className="w-3 h-3" />,        delivery: '⏳ Inasubiri — malipo bado hayajathibitishwa',    deliveryColor: 'text-amber-400'   },
  processing: { label: 'Processing', row: 'border-l-blue-500',    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',           icon: <Loader2 className="w-3 h-3 animate-spin" />, delivery: '🔄 Inashughulikiwa — subiri kidogo',        deliveryColor: 'text-blue-400'    },
  rejected:   { label: 'Rejected',   row: 'border-l-red-500',     badge: 'bg-red-500/15 text-red-400 border-red-500/30',             icon: <XCircle className="w-3 h-3" />,       delivery: '❌ Huduma haikutolewa — order ilikataliwa',     deliveryColor: 'text-red-400'     },
  failed:     { label: 'Failed',     row: 'border-l-red-500',     badge: 'bg-red-500/15 text-red-400 border-red-500/30',             icon: <XCircle className="w-3 h-3" />,       delivery: '❌ Malipo yameshindwa — mtu hakupata huduma',   deliveryColor: 'text-red-400'     },
};

function getStatus(s: string) {
  return STATUS[s?.toLowerCase()] ?? { label: s || 'Unknown', row: 'border-l-slate-600', badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: <AlertTriangle className="w-3 h-3" />, delivery: '❓ Hali haijulikani', deliveryColor: 'text-slate-400' };
}

function getName(o: any)  { return o.customer_name || o.visitor_name  || o.full_name || o.name  || ''; }
function getPhone(o: any) { return o.visitor_phone || o.phone_number  || o.phone     || o.customer_phone || ''; }

// ────────────────────────────────────────────────────────────────────────────
// TOAST
// ────────────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  const colors = { success: 'bg-emerald-900/90 border-emerald-500/40 text-emerald-100', error: 'bg-red-900/90 border-red-500/40 text-red-100', warning: 'bg-amber-900/90 border-amber-500/40 text-amber-100', info: 'bg-blue-900/90 border-blue-500/40 text-blue-100' };
  const icons  = { success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />, error: <XCircle className="w-5 h-5 text-red-400 shrink-0" />, warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />, info: <Bell className="w-5 h-5 text-blue-400 shrink-0" /> };
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-md shadow-2xl max-w-sm ${colors[t.type]}`}>
            {icons[t.type]}
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-sm leading-tight">{t.title}</p>
              <p className="text-xs opacity-80 mt-0.5 leading-snug">{t.message}</p>
            </div>
            <button onClick={() => onRemove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// DELIVERY STEPS
// ────────────────────────────────────────────────────────────────────────────
const DELIVERY_STEPS = [
  { key: 'received', label: 'Order Received',     subLabel: 'Order imeingia kwenye mfumo',       icon: <Inbox className="w-4 h-4" />,      alwaysDone: true  },
  { key: 'payment',  label: 'Payment Confirmed',  subLabel: 'Malipo yamethibitishwa',            icon: <Banknote className="w-4 h-4" />,   alwaysDone: false },
  { key: 'admin',    label: 'Approved by Admin',  subLabel: 'Admin amekubali kwa mkono',         icon: <BadgeCheck className="w-4 h-4" />, alwaysDone: false },
  { key: 'download', label: 'Download Link Sent', subLabel: '✅ Mteja amepata bidhaa — tayari!', icon: <Download className="w-4 h-4" />,   alwaysDone: false },
];

// ────────────────────────────────────────────────────────────────────────────
// ORDER DETAIL PANEL
// ────────────────────────────────────────────────────────────────────────────
function OrderDetailPanel({ order, onClose, onAction }: {
  order: any; onClose: () => void; onAction: (id: string, status: string) => void;
}) {
  const [localStatus, setLocalStatus] = useState(order.status);
  const [approving,   setApproving]   = useState(false);
  const [ticksDone,   setTicksDone]   = useState(0);
  const [celebrated,  setCelebrated]  = useState(false);

  const isApproved = ['completed', 'approved'].includes(localStatus?.toLowerCase());
  const isRejected = ['rejected',  'failed'].includes(localStatus?.toLowerCase());
  const s = getStatus(localStatus);
  const name  = getName(order);
  const phone = getPhone(order);

  useEffect(() => {
    if (!approving) {
      setLocalStatus(order.status);
      const isOrderApproved = ['completed', 'approved'].includes(order.status?.toLowerCase());
      if (isOrderApproved) {
        setTicksDone(DELIVERY_STEPS.length);
      } else {
        setTicksDone(0);
      }
    }
  }, [order, approving]);

  useEffect(() => {
    if (!approving) return;
    let step = 0;
    const iv = setInterval(() => {
      step += 1;
      setTicksDone(step);
      if (step >= DELIVERY_STEPS.length) {
        clearInterval(iv);
        setApproving(false);
        setTimeout(() => setCelebrated(true),  200);
        setTimeout(() => setCelebrated(false), 3700);
      }
    }, 420);
    return () => clearInterval(iv);
  }, [approving]);

  const handleApprove = () => {
    if (isApproved) return;
    setLocalStatus('completed');
    setTicksDone(4);
    setApproving(false);
    setCelebrated(true);
    setTimeout(() => setCelebrated(false), 3000);
    onAction(order.id, 'completed');
  };

  const handleReject = () => {
    if (isRejected) return;
    setLocalStatus('rejected');
    setTicksDone(0);
    setApproving(false);
    onAction(order.id, 'rejected');
  };

  const handlePending = () => {
    setLocalStatus('pending');
    setTicksDone(0);
    setApproving(false);
    onAction(order.id, 'pending');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative h-full w-full max-w-md bg-slate-900 border-l border-slate-800 overflow-y-auto flex flex-col"
      >
        <AnimatePresence>
          {celebrated && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-emerald-950/95 backdrop-blur-sm pointer-events-none"
            >
              <motion.div animate={{ scale: [1, 1.25, 1], rotate: [0, 12, -12, 0] }} transition={{ repeat: 2, duration: 0.45 }}
                className="text-7xl mb-5">✅</motion.div>
              <p className="text-2xl font-black text-emerald-300 uppercase tracking-wide">Imefanikiwa!</p>
              <p className="text-sm text-emerald-400 font-bold mt-2">Mtu amepata download link</p>
              <p className="text-xs text-emerald-600 mt-1">Huduma imetolewa kikamilifu</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-black text-white text-lg uppercase">Order Details</h2>
            <p className="text-xs text-slate-400 font-mono truncate max-w-[240px]">{order.order_number || order.id}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          <div className={`rounded-2xl p-5 border transition-colors duration-700 ${
            isApproved ? 'bg-emerald-900/20 border-emerald-500/30' :
            isRejected ? 'bg-red-900/20 border-red-500/30' :
            'bg-amber-900/20 border-amber-500/30'
          }`}>
            <div className="flex items-center gap-3 mb-5">
              <motion.div animate={isApproved ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.5 }}>
                {isApproved ? <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  : isRejected ? <ShieldX className="w-8 h-8 text-red-400" />
                  : <Clock className="w-8 h-8 text-amber-400" />}
              </motion.div>
              <div>
                <p className="font-black text-white text-base">
                  {isApproved ? '✅ Huduma Imetolewa' : isRejected ? '❌ Huduma Haikutolewa' : '⏳ Inasubiri Uthibitisho'}
                </p>
                <p className={`text-xs font-bold mt-0.5 ${s.deliveryColor}`}>{s.delivery}</p>
              </div>
            </div>

            <div className="space-y-0">
              {DELIVERY_STEPS.map((step, i) => {
                const isDone    = step.alwaysDone || i < ticksDone;
                const isCurrent = !isDone && i === ticksDone && !isRejected;
                const isFailed  = isRejected && !step.alwaysDone;

                return (
                  <div key={step.key} className="flex items-stretch gap-4">
                    <div className="flex flex-col items-center w-10 shrink-0">
                      <motion.div
                        initial={false}
                        animate={isDone && !isFailed ? { scale: [1, 1.4, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                          isFailed     ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                          isDone       ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' :
                          isCurrent    ? 'bg-slate-800 border-blue-500/60 text-blue-400 animate-pulse' :
                                         'bg-slate-900 border-slate-700 text-slate-600'
                        }`}
                      >
                        {isDone && !isFailed
                          ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, delay: 0.1 }}>
                              <CheckCircle2 className="w-5 h-5" />
                            </motion.div>
                          : isFailed ? <XCircle className="w-5 h-5" />
                          : step.icon
                        }
                      </motion.div>
                      {i < DELIVERY_STEPS.length - 1 && (
                        <div className={`w-0.5 flex-1 my-1 transition-colors duration-700 min-h-[16px] ${isDone ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />
                      )}
                    </div>

                    <div className="pb-4 flex-1 flex flex-col justify-center">
                      <p className={`text-sm font-extrabold transition-colors duration-500 ${
                        isFailed ? 'text-red-400 line-through' :
                        isDone   ? 'text-white' :
                        isCurrent? 'text-blue-300' :
                                   'text-slate-600'
                      }`}>{step.label}</p>
                      <p className={`text-[11px] font-medium mt-0.5 transition-colors duration-500 ${
                        isDone && !isFailed ? 'text-emerald-400' :
                        isFailed            ? 'text-red-600' :
                                              'text-slate-600'
                      }`}>
                        {isDone && !isFailed ? step.subLabel : isFailed ? '✗ Imefutwa' : 'Inasubiri...'}
                      </p>
                    </div>

                    <div className="w-6 flex items-start justify-center pt-2.5 shrink-0">
                      {isDone && !isFailed && (
                        <motion.span initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                          className="text-emerald-400 text-xl font-black">✓</motion.span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 space-y-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Taarifa za Mteja
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">Jina</span>
                <span className="font-extrabold text-white text-sm">{name || <span className="text-slate-600 italic text-xs">Halijulikani</span>}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">Simu</span>
                <span className="font-mono font-bold text-blue-400 text-sm">{phone || '—'}</span>
              </div>
              {order.customer_email && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold">Email</span>
                  <span className="font-mono text-slate-300 text-xs">{order.customer_email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 space-y-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Package className="w-3.5 h-3.5" /> Taarifa za Order
            </h3>
            <div className="space-y-2.5">
              {[
                { label: 'Bidhaa',  value: order.game_title || order.product_title || 'Digital Product' },
                { label: 'Kiasi',   value: formatCurrency(order.amount) },
                { label: 'Hali',    value: <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${s.badge}`}>{s.icon}{s.label}</span> },
                { label: 'Tarehe',  value: order.created_at ? new Date(order.created_at).toLocaleString('sw-TZ') : '—' },
              ].map((row, i) => (
                <div key={i} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-slate-500 font-bold shrink-0">{row.label}</span>
                  <span className="font-bold text-white text-sm text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Vitendo vya Mkono</h3>

            <motion.button whileTap={{ scale: 0.97 }} onClick={handleApprove} disabled={isApproved}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border font-extrabold text-sm uppercase transition-all ${
                isApproved
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 cursor-not-allowed'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:text-white shadow-lg shadow-emerald-900/20'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isApproved ? 'bg-emerald-500/10' : 'bg-emerald-500/20'}`}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p>Approve Manual</p>
                  <p className="text-[10px] font-medium opacity-70 normal-case">
                    {isApproved ? 'Tayari imeapproviwa ✓' : 'Bonyeza — ticks zitawaka moja moja'}
                  </p>
                </div>
              </div>
              {isApproved
                ? <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.5 }}>
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </motion.div>
                : <ChevronRight className="w-5 h-5 opacity-50" />
              }
            </motion.button>

            <motion.button whileTap={{ scale: 0.97 }} onClick={handleReject} disabled={isRejected}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border font-extrabold text-sm uppercase transition-all ${
                isRejected
                  ? 'bg-red-500/5 border-red-500/10 text-red-700 cursor-not-allowed'
                  : 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25 hover:text-white shadow-lg shadow-red-900/20'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isRejected ? 'bg-red-500/10' : 'bg-red-500/20'}`}>
                  <XCircle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p>Reject Order</p>
                  <p className="text-[10px] font-medium opacity-70 normal-case">Kata order — mtu hatapata huduma</p>
                </div>
              </div>
              {isRejected ? <XCircle className="w-6 h-6 text-red-600" /> : <ChevronRight className="w-5 h-5 opacity-50" />}
            </motion.button>

            <motion.button whileTap={{ scale: 0.97 }} onClick={handlePending}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-slate-700 bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white font-extrabold text-sm uppercase transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
                <div className="text-left">
                  <p>Rudisha Pending</p>
                  <p className="text-[10px] font-medium opacity-70 normal-case">Weka tena katika hali ya kusubiri</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-50" />
            </motion.button>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────────────────────
export default function AdminOrdersPage() {
  const [orders,       setOrders]       = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [livePulse,    setLivePulse]    = useState(false);
  const [updating,     setUpdating]     = useState<string | null>(null);
  const [selectedOrder,setSelectedOrder]= useState<any>(null);
  const [toasts,       setToasts]       = useState<Toast[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [cleaningUp,   setCleaningUp]   = useState(false);

  const supabase = createClient();

  const handleCleanup = async () => {
    if (!confirm('Je, una uhakika unataka kufuta oda zote zilizopita zaidi ya masaa 24 ambazo hazikulipwa (pending/rejected)? Oda zilizoidhinishwa na umiliki wa wateja utabaki salama 100%.')) {
      return;
    }
    setCleaningUp(true);
    try {
      const res = await fetch('/api/admin/orders/cleanup', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        addToast({
          type: 'success',
          title: '🧹 Usafishaji Umekamilika!',
          message: json.message || `Oda ${json.deletedCount || 0} zimesafishwa.`,
        });
        fetchOrders();
      } else {
        throw new Error(json.error || 'Usafishaji umeshindwa.');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: '❌ Hitilafu ya Usafishaji',
        message: err.message || 'Kumetokea tatizo wakati wa kusafisha.',
      });
    } finally {
      setCleaningUp(false);
    }
  };

  const addToast = (t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 5000);
  };
  const removeToast = (id: string) => setToasts((p) => p.filter((t) => t.id !== id));

  const fetchOrders = useCallback(async () => {
    try {
      const { data: usersData } = await supabase.from('xx_users').select('name, phone');

      // 1. Primary Query: payment_orders joined with posts and visitors
      const { data: poData, error: poErr } = await supabase
        .from('payment_orders')
        .select('*, posts(id, title, price, image_url, links), visitors(id, name, phone)')
        .order('created_at', { ascending: false });

      let finalOrders: any[] = [];

      if (poData && poData.length > 0) {
        finalOrders = poData.map((o: any) => {
          const orderPhone = o.phone_number || o.visitors?.phone || '';
          const normalizedPhone = orderPhone.replace(/\D/g, '').slice(-9);

          const matchedUser = usersData?.find((u) => {
            const uPhone = u.phone || '';
            return uPhone.replace(/\D/g, '').slice(-9) === normalizedPhone;
          });

          const orderRef = o.promo_used?.split('|')[0] || o.id;

          return {
            ...o,
            order_number: orderRef,
            customer_name: o.visitors?.name || matchedUser?.name || '',
            customer_phone: orderPhone,
            visitor_phone: orderPhone,
            product_title: o.posts?.title || 'Digital Product',
            game_title: o.posts?.title || 'Digital Product',
            amount: o.amount || o.posts?.price || 0,
            status: o.status || 'pending',
            payment_gateway: o.promo_used?.includes('PP:') ? 'pressopay' : 'pressopay',
          };
        });
      } else {
        // Fallback query if payment_orders is empty
        const { data: legacy } = await supabase
          .from('xx_orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (legacy) {
          finalOrders = legacy.map((o: any) => ({
            ...o,
            order_number: o.reference_id || o.id,
            customer_name: '',
            customer_phone: o.phone || '',
            visitor_phone: o.phone || '',
            product_title: 'Digital Product',
            game_title: 'Digital Product',
            amount: o.amount || 0,
            status: o.status || 'pending',
            payment_gateway: 'pressopay',
          }));
        }
      }

      setOrders(finalOrders);
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchOrders();

    // ── LIVE REALTIME LISTENER FOR ADMIN DASHBOARD ──
    const adminChannel = supabase
      .channel('admin-orders-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_orders' },
        (payload: any) => {
          setLivePulse(true);
          setTimeout(() => setLivePulse(false), 3000);
          fetchOrders();

          if (payload.eventType === 'INSERT') {
            const newPhone = payload.new?.phone_number || '';
            addToast({
              type: 'info',
              title: '🔔 Order Mpya Imeingia!',
              message: `Mteja: ${newPhone || 'Mteja wa Mtandaoni'} — Kiasi: TZS ${payload.new?.amount || 0}`,
            });
          }
          if (payload.eventType === 'UPDATE' && payload.new) {
            setSelectedOrder((prev: any) =>
              prev && prev.id === payload.new.id ? { ...prev, ...payload.new } : prev
            );
          }
        }
      )
      .on('broadcast', { event: 'ORDER_CREATED' }, (payload: any) => {
        setLivePulse(true);
        setTimeout(() => setLivePulse(false), 3000);
        fetchOrders();
        const data = payload?.payload || payload;
        addToast({
          type: 'info',
          title: '🔔 Order Mpya Imeingia!',
          message: `${data.customerName || data.visitorPhone || 'Mteja'} — TZS ${data.amount || 0}`,
        });
      })
      .on('broadcast', { event: 'ORDER_APPROVED' }, (payload: any) => {
        setLivePulse(true);
        setTimeout(() => setLivePulse(false), 3000);
        fetchOrders();
        const data = payload?.payload || payload;
        addToast({
          type: 'success',
          title: '✅ Malipo Yamethibitishwa!',
          message: `Order ${data.orderNumber || ''} imethibitishwa na kufunguliwa!`,
        });
      })
      .on('broadcast', { event: 'ORDER_UPDATED' }, () => {
        setLivePulse(true);
        setTimeout(() => setLivePulse(false), 3000);
        fetchOrders();
      })
      .subscribe();

    // Cross-Domain Sync Channel
    const syncChannel = supabase
      .channel('cross-domain-admin-sync')
      .on('broadcast', { event: 'ORDER_CREATED' }, () => {
        fetchOrders();
      })
      .on('broadcast', { event: 'ORDER_APPROVED' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(adminChannel);
      supabase.removeChannel(syncChannel);
    };
  }, [fetchOrders, supabase]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdating(id + newStatus);

    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
    setSelectedOrder((prev: any) =>
      prev && prev.id === id ? { ...prev, status: newStatus } : prev
    );

    const o = orders.find((x) => x.id === id);
    const label = getName(o) || getPhone(o) || 'Mteja';

    if (newStatus === 'completed' || newStatus === 'approved') {
      addToast({
        type: 'success',
        title: '✅ Oda Imeidhinishwa!',
        message: `${label} — Oda Imeidhinishwa na Kufunguliwa kwa Mteja!`,
      });
    } else if (newStatus === 'rejected') {
      addToast({
        type: 'error',
        title: '❌ Rejected',
        message: `${label} — Order imekataliwa. Mtu hatapata huduma.`,
      });
    } else {
      addToast({
        type: 'warning',
        title: '⏳ Pending',
        message: 'Order imerudishwa pending.',
      });
    }

    try {
      if (newStatus === 'completed' || newStatus === 'approved') {
        const res = await fetch('/api/admin/orders/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, orderId: id }),
        });
        if (!res.ok) {
          await fetch('/api/admin/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'completed' }),
          });
        }
      } else {
        await fetch('/api/admin/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: newStatus }),
        });
      }

      fetchOrders();
    } catch (err) {
      console.warn('Status update sync error:', err);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = orders
    .filter((o) => {
      if (filterStatus === 'all')      return true;
      if (filterStatus === 'approved') return ['completed','approved'].includes(o.status?.toLowerCase());
      if (filterStatus === 'rejected') return ['rejected','failed'].includes(o.status?.toLowerCase());
      return o.status?.toLowerCase() === filterStatus;
    })
    .filter((o) =>
      (o.order_number || o.id || '').toLowerCase().includes(search.toLowerCase()) ||
      getPhone(o).includes(search) || getName(o).toLowerCase().includes(search.toLowerCase()) ||
      (o.game_title || '').toLowerCase().includes(search.toLowerCase())
    );

  const counts = {
    all:      orders.length,
    approved: orders.filter(o => ['completed','approved'].includes(o.status?.toLowerCase())).length,
    pending:  orders.filter(o => o.status?.toLowerCase() === 'pending').length,
    rejected: orders.filter(o => ['rejected','failed'].includes(o.status?.toLowerCase())).length,
  };

  return (
    <div className="space-y-8 max-w-7xl">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3 uppercase">
            <ShoppingBag className="w-8 h-8 text-blue-500" />
            <span>Order Logs & Manual Override</span>
            {livePulse && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse font-bold">
                <Radio className="w-3.5 h-3.5" /> Live
              </span>
            )}
          </h1>
          <p className="text-sm font-semibold text-slate-300 mt-1">
            Bonyeza order yoyote kuona maelezo kamili au tumia zana za papo hapo kufungulia wateja access.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowGrantModal(true)}
            className="px-4 sm:px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Fungulia Mteja Access (Manual Grant)</span>
          </button>

          <button
            onClick={handleCleanup}
            disabled={cleaningUp}
            className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 text-xs font-bold uppercase transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            title="Futa oda za zamani (24h+) ambazo hazikulipwa ili dashboard iwe nyepesi"
          >
            {cleaningUp ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
            ) : (
              <Trash2 className="w-4 h-4 text-rose-400" />
            )}
            <span>{cleaningUp ? 'Inasafisha...' : '🧹 Safisha Oda (24h+)'}</span>
          </button>

          <button
            onClick={fetchOrders}
            className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold uppercase hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-blue-400" /> Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all',      label: 'Zote',        count: counts.all,      color: 'border-slate-700 text-white bg-slate-900 data-[active=true]:border-blue-500 data-[active=true]:text-blue-400' },
          { key: 'approved', label: '✅ Approved',  count: counts.approved, color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 data-[active=true]:border-emerald-400' },
          { key: 'pending',  label: '⏳ Pending',   count: counts.pending,  color: 'bg-amber-500/10 border-amber-500/20 text-amber-400 data-[active=true]:border-amber-400' },
          { key: 'rejected', label: '❌ Rejected',  count: counts.rejected, color: 'bg-red-500/10 border-red-500/20 text-red-400 data-[active=true]:border-red-400' },
        ].map((tab) => (
          <button key={tab.key} data-active={filterStatus === tab.key} onClick={() => setFilterStatus(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-extrabold uppercase transition-all ${tab.color}`}>
            {tab.label}
            <span className="w-6 h-5 rounded-md bg-black/20 flex items-center justify-center font-black text-[10px]">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input type="text" placeholder="Tafuta jina, simu, order ref..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-600 font-medium" />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
      </div>

      {/* ── MOBILE VIEW: STACKED TOUCH-FRIENDLY ORDER CARDS (screens < 1024px) ── */}
      <div className="lg:hidden space-y-3.5">
        {loading && (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 font-bold">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span>Inapakia oda za wateja...</span>
            </div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 font-bold">
            Hakuna orders zilizopatikana.
          </div>
        )}

        <AnimatePresence>
          {filtered.map((o) => {
            const s = getStatus(o.status);
            const isApproved = ['completed', 'approved'].includes(o.status?.toLowerCase());
            const isRejected = ['rejected', 'failed'].includes(o.status?.toLowerCase());
            const customerName = getName(o) || 'Mteja Asiye na Jina';
            const phone = getPhone(o);
            const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
            const waPhone = cleanPhone.startsWith('0') ? '255' + cleanPhone.slice(1) : cleanPhone.startsWith('255') ? cleanPhone : '255' + cleanPhone;

            return (
              <motion.div
                key={`mob-${o.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedOrder(o)}
                className={`p-4 rounded-2xl bg-slate-900 border border-slate-800 border-l-4 ${s.row} space-y-3.5 shadow-md active:scale-[0.99] transition-all cursor-pointer`}
              >
                {/* Card Top: Order Ref, Gateway & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-white tracking-tight">
                        {(o.order_number || o.id || '').substring(0, 14)}…
                      </span>
                      {o.payment_gateway && o.payment_gateway !== 'free' && (
                        <span className="px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {o.payment_gateway === 'harakapay' ? '⚡ HarakaPay' : o.payment_gateway}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {o.created_at ? new Date(o.created_at).toLocaleString('sw-TZ', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </span>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black uppercase text-[10px] border shrink-0 ${s.badge}`}>
                    {s.icon}
                    <span>{s.label}</span>
                  </span>
                </div>

                {/* Customer Details & Quick Contact Chips */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-white text-xs truncate">{customerName}</p>
                    <p className="font-mono text-blue-400 text-xs font-bold mt-0.5">{phone || '—'}</p>
                  </div>

                  {phone && (
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${phone}`}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-blue-400 hover:text-white min-h-[38px] min-w-[38px] flex items-center justify-center touch-manipulation"
                        title="Call Customer"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <a
                        href={`https://wa.me/${waPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 min-h-[38px] min-w-[38px] flex items-center justify-center touch-manipulation"
                        title="Chat on WhatsApp"
                      >
                        <span className="text-xs font-black">💬</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Product Title & Price */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-800/60 pt-2.5">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Bidhaa:</span>
                    <p className="font-bold text-white text-xs truncate">
                      {o.game_title || o.product_title || 'Digital Product'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Kiasi:</span>
                    <p className="font-black text-emerald-400 text-sm">
                      {formatCurrency(o.amount)}
                    </p>
                  </div>
                </div>

                {/* Mobile Full-Width Actions Bar (44px min height for high touch accessibility) */}
                <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleUpdateStatus(o.id, 'completed')}
                    disabled={isApproved || updating === o.id + 'completed'}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all min-h-[44px] touch-manipulation cursor-pointer ${
                      isApproved
                        ? 'opacity-35 cursor-not-allowed bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{updating === o.id + 'completed' ? 'Inaidhinisha...' : '⚡ Approve & Unlock'}</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(o.id, 'rejected')}
                    disabled={isRejected || updating === o.id + 'rejected'}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all min-h-[44px] touch-manipulation cursor-pointer ${
                      isRejected
                        ? 'opacity-35 cursor-not-allowed bg-rose-500/10 text-rose-600 border-rose-500/20'
                        : 'bg-slate-800 text-rose-400 border-rose-500/30 hover:bg-rose-600 hover:text-white'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setSelectedOrder(o)}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all min-h-[44px] touch-manipulation flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>Zaidi</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── DESKTOP TABLE VIEW (Visible ONLY on screens >= 1024px) ── */}
      <div className="hidden lg:block rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-extrabold uppercase tracking-wider text-xs">
                <th className="py-4 px-4">Order / Tarehe</th>
                <th className="py-4 px-4">Mteja</th>
                <th className="py-4 px-4">Bidhaa</th>
                <th className="py-4 px-4">Bei</th>
                <th className="py-4 px-4">Hali ya Huduma</th>
                <th className="py-4 px-4">Vitendo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading && (
                <tr><td colSpan={6} className="py-14 text-center text-slate-400 font-bold">
                  <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="py-14 text-center text-slate-500 font-bold">Hakuna orders.</td></tr>
              )}
              <AnimatePresence>
                {filtered.map((o) => {
                  const s = getStatus(o.status);
                  const isApproved = ['completed','approved'].includes(o.status?.toLowerCase());
                  const isRejected = ['rejected','failed'].includes(o.status?.toLowerCase());
                  return (
                    <motion.tr key={o.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      onClick={() => setSelectedOrder(o)}
                      className={`border-l-2 ${s.row} hover:bg-slate-800/50 transition-colors cursor-pointer`}>
                      <td className="py-4 px-4">
                        <p className="font-mono text-slate-400 text-xs truncate max-w-[130px]">{(o.order_number || o.id || '').substring(0, 16)}…</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">{o.created_at ? new Date(o.created_at).toLocaleString('sw-TZ', { dateStyle: 'short', timeStyle: 'short' }) : ''}</p>
                        {o.payment_gateway && o.payment_gateway !== 'free' && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mt-1 ${
                            o.payment_gateway === 'harakapay'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {o.payment_gateway === 'harakapay' ? '⚡ HarakaPay' : `💳 ${o.payment_gateway}`}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {getName(o) ? <p className="font-extrabold text-white text-sm">{getName(o)}</p> : <p className="text-slate-600 text-xs italic">Jina halijulikani</p>}
                        <p className="font-mono text-blue-400 text-xs mt-0.5">{getPhone(o) || '—'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-white text-sm truncate max-w-[140px]">{o.game_title || o.product_title || 'Digital Product'}</p>
                      </td>
                      <td className="py-4 px-4 font-black text-blue-400 text-base whitespace-nowrap">{formatCurrency(o.amount)}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold uppercase text-[10px] border ${s.badge}`}>{s.icon}{s.label}</span>
                        <p className={`text-[10px] font-bold mt-1 ${s.deliveryColor}`}>{isApproved ? '✅ Amepata huduma' : isRejected ? '❌ Hakupata huduma' : '⏳ Hajapokelewa'}</p>
                      </td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button onClick={() => handleUpdateStatus(o.id, 'completed')} disabled={isApproved || updating === o.id + 'completed'}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase border transition-all ${isApproved ? 'opacity-30 cursor-not-allowed bg-emerald-500/5 text-emerald-700 border-emerald-500/10' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'}`}>
                            <CheckCircle2 className="w-3 h-3" /> {updating === o.id + 'completed' ? '...' : '⚡ Approve & Unlock'}
                          </button>
                          <button onClick={() => handleUpdateStatus(o.id, 'rejected')} disabled={isRejected || updating === o.id + 'rejected'}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase border transition-all ${isRejected ? 'opacity-30 cursor-not-allowed bg-red-500/5 text-red-700 border-red-500/10' : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/30'}`}>
                            <XCircle className="w-3 h-3" /> {updating === o.id + 'rejected' ? '...' : 'Reject'}
                          </button>
                          <button onClick={() => setSelectedOrder(o)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                            <ChevronRight className="w-3 h-3" /> Zaidi
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} onAction={handleUpdateStatus} />
        )}
      </AnimatePresence>

      <ManualGrantModal
        isOpen={showGrantModal}
        onClose={() => setShowGrantModal(false)}
        onSuccess={(msg) => {
          addToast({
            type: 'success',
            title: '⚡ Access Imefunguliwa!',
            message: msg,
          });
          fetchOrders();
        }}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />

    </div>
  );
}
