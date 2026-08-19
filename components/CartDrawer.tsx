'use client';

import React from 'react';
import Image from 'next/image';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { GameProduct } from './GameCard';
import { formatCurrency } from '@/lib/utils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: GameProduct[];
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onClearCart,
  onCheckout,
}: CartDrawerProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalAmount = items.reduce((acc, item) => acc + item.price, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between p-6 shadow-2xl animate-slide-right overscroll-contain">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600/20 text-brand-glow flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white">Your Cart</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 overscroll-contain" style={{ overscrollBehaviorY: 'contain' }}>
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all"
              >
                <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                  <Image
                    src={item.cover_image}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                  <span className="text-xs text-brand-glow font-extrabold block mt-0.5">
                    {item.price === 0 ? 'FREE' : formatCurrency(item.price)}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-600" />
              <p className="text-slate-400 text-sm font-medium">Your cart is empty.</p>
              <button
                onClick={onClose}
                className="text-xs text-brand-glow hover:underline font-semibold"
              >
                Continue Shopping &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Footer & Checkout */}
        {items.length > 0 && (
          <div className="border-t border-slate-800 pt-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total Price:</span>
              <span className="text-xl font-black text-white tracking-tight">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <Zap className="w-4 h-4 text-accent-cyan shrink-0" />
              <span>Instant download link & digital activation keys upon payment</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClearCart}
                className="px-3 py-3 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 text-xs font-semibold transition-colors"
              >
                Clear
              </button>
              <button
                onClick={onCheckout}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-cyan text-white text-sm font-bold shadow-glow hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
