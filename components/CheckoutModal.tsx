'use client';

import React, { useState } from 'react';
import { X, Smartphone, CreditCard, ShieldCheck, Zap, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { GameProduct } from './GameCard';
import { formatCurrency } from '@/lib/utils';
import { CheckoutSchema } from '@/lib/zod/schemas';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: GameProduct;
  onSuccess?: (order: any) => void;
}

export default function CheckoutModal({ isOpen, onClose, game, onSuccess }: CheckoutModalProps) {
  const [phone, setPhone] = useState('255');
  const [gateway, setGateway] = useState<'pressopay' | 'harakapay' | 'mpesa' | 'azampay'>('pressopay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate using Zod
    const validation = CheckoutSchema.safeParse({
      game_id: game.id,
      visitor_phone: phone,
      payment_gateway: gateway,
    });

    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: game.id,
          visitor_phone: phone,
          payment_gateway: gateway,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment initiation failed. Please check phone number.');
      }

      if (onSuccess) onSuccess(data.order);
      // Redirect to instant order delivery page or download token page
      window.location.href = `/download/${data.order.download_token}`;
    } catch (err: any) {
      setError(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-glass-border rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-glass space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 text-brand-glow flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Instant Checkout</h3>
              <p className="text-xs text-slate-400">Automated Instant Digital Delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Product Summary */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white">{game.title}</h4>
            <span className="text-xs text-slate-400 uppercase font-semibold">{game.category}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total Amount</span>
            <span className="text-lg font-black text-brand-glow">
              {game.price === 0 ? 'FREE' : formatCurrency(game.price)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Phone Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Mobile Phone Number (M-Pesa / Tigo Pesa / Airtel Money)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="2557XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                required
              />
              <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              You will receive an instant payment request prompt (STK Push) on your phone.
            </p>
          </div>

          {/* Payment Gateway Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Select Automated Payment Gateway
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGateway('pressopay')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  gateway === 'pressopay'
                    ? 'bg-brand-600/20 border-brand-500 text-white shadow-glow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Zap className="w-4 h-4 text-accent-cyan" />
                <span>PressoPay (Auto)</span>
              </button>

              <button
                type="button"
                onClick={() => setGateway('harakapay')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  gateway === 'harakapay'
                    ? 'bg-brand-600/20 border-brand-500 text-white shadow-glow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CreditCard className="w-4 h-4 text-accent-purple" />
                <span>HarakaPay</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-cyan text-white text-sm font-bold shadow-glow hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Automated STK Push...</span>
              </>
            ) : (
              <>
                <span>Complete Purchase & Get Access</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Encrypted Automated Transaction • 100% Instant Delivery Guaranteed</span>
        </div>
      </div>
    </div>
  );
}
