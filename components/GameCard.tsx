'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingCart, Eye, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface GameProduct {
  id: string;
  title: string;
  description?: string;
  cover_image: string;
  price: number;
  rating?: number;
  category: string;
  tags?: string[];
  status?: string;
}

interface GameCardProps {
  game: GameProduct;
  onAddToCart?: (game: GameProduct) => void;
  onBuyNow?: (game: GameProduct) => void;
}

export default function GameCard({ game, onAddToCart, onBuyNow }: GameCardProps) {
  const isFree = game.price === 0;

  return (
    <div className="group relative flex flex-col rounded-2xl bg-glass-card border border-glass-border backdrop-blur-glass overflow-hidden hover:border-brand-500/50 hover:shadow-purple-glow transition-all duration-300">
      
      {/* Image Cover Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        <Image
          src={game.cover_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'}
          alt={game.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-center group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <span className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[11px] font-semibold text-accent-cyan border border-accent-cyan/30">
            {game.category}
          </span>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[11px] font-bold text-amber-400 border border-amber-400/30">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{game.rating || 4.8}</span>
          </div>
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-xs">
          <Link
            href={`/games/${game.id}`}
            className="p-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-lg"
            title="View Details"
          >
            <Eye className="w-5 h-5" />
          </Link>
          <button
            onClick={() => onAddToCart && onAddToCart(game)}
            className="p-3 rounded-xl bg-brand-600 text-white hover:bg-brand-500 transition-colors shadow-glow"
            title="Add to Cart"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Details Container */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <Link href={`/games/${game.id}`} className="block">
            <h3 className="text-base font-bold text-white group-hover:text-brand-glow transition-colors line-clamp-1">
              {game.title}
            </h3>
          </Link>
          {game.description && (
            <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
              {game.description}
            </p>
          )}
        </div>

        {/* Pricing & Buy Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Instant Access</span>
            <span className="text-lg font-black text-white tracking-tight">
              {isFree ? (
                <span className="text-emerald-400 font-extrabold">FREE DOWNLOAD</span>
              ) : (
                formatCurrency(game.price)
              )}
            </span>
          </div>

          <button
            onClick={() => onBuyNow && onBuyNow(game)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold hover:shadow-glow hover:scale-105 transition-all"
          >
            {isFree ? 'Get Link' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
