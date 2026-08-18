'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Gamepad2, Sparkles, ChevronRight, UserPlus } from 'lucide-react';

export interface CategoryItem {
  id: string;
  name: string;
  image_url: string;
  game_count?: number;
  description?: string;
}

interface CategoryGridProps {
  categories?: CategoryItem[];
  selectedCategory?: string;
  onSelectCategory?: (categoryName: string) => void;
  onRegisterClick?: () => void;
  isRegistered?: boolean;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: 'maleo',
    name: 'Maleo Mods',
    image_url: 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
    game_count: 24,
    description: 'Basi za Shabiby, Yutong & Map ya Tanzania 🇹🇿',
  },
  {
    id: 'world-games',
    name: 'World Games',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop',
    game_count: 36,
    description: 'GTA V, FIFA EA FC 24, Dynasty Warriors & PC Games 🎮',
  },
  {
    id: 'tz-simulators',
    name: 'TZ Simulators',
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop',
    game_count: 18,
    description: 'Michezo ya Truck, Bus & Car Simulation ⚡',
  },
];

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxMCI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjMGUxNzJhIi8+PC9zdmc+';

export default function CategoryGrid({
  categories = DEFAULT_CATEGORIES,
  selectedCategory = '',
  onSelectCategory,
  onRegisterClick,
}: CategoryGridProps) {
  const activeList = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const [isRegistered, setIsRegistered] = useState<boolean>(true);

  useEffect(() => {
    try {
      const reg = localStorage.getItem('cpcg_user_registered');
      if (reg === 'true' || reg === '1') {
        setIsRegistered(true);
      }
    } catch (e) {}
  }, []);

  const handleCardClick = (catName: string) => {
    if (isRegistered) {
      if (onSelectCategory) onSelectCategory(catName);
    } else {
      if (onRegisterClick) onRegisterClick();
    }
  };

  return (
    <section id="category-vault-section" className="w-full space-y-6 relative z-10 scroll-mt-24">
      {/* Section Header */}
      <div className="flex items-center justify-between p-4 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-black text-white tracking-tight uppercase leading-none">
              🇹🇿 Tanzania Games & Category Vault
            </h2>
            <p className="text-xs text-blue-400 font-bold mt-1">
              {activeList.length} categories available
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/30">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="text-xs text-blue-400 font-black uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* ── Category Cards Grid (Responsive 2 to 4 columns, preventing oversized cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {activeList.map((cat, idx) => {
          const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
          const cardId = `category-card-${(cat.id || cat.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

          return (
            <motion.div
              key={cat.id}
              id={cardId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.03, ease: 'easeOut' }}
              onClick={() => handleCardClick(cat.name)}
              className={`relative z-10 rounded-2xl overflow-hidden bg-[#0F172A] flex flex-col justify-between border scroll-mt-24 ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-800'
              } shadow-lg hover:border-blue-500/60 transition-all duration-300 cursor-pointer group touch-manipulation interactive-card`}
            >
              {/* ── Card Header: Title + Game Count ── */}
              <div className="flex items-center justify-between p-3 bg-[#0F172A] border-b border-slate-800/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <Gamepad2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-snug truncate group-hover:text-blue-400 transition-colors">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-[10px] text-slate-400 font-medium line-clamp-1">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap bg-slate-900 text-blue-400 border border-slate-800">
                    {cat.game_count ?? 12} games
                  </span>
                </div>
              </div>

              {/* ── Unobstructed Clean Thumbnail Image (16:9 Aspect Ratio) ── */}
              <div className="relative w-full bg-slate-900 overflow-hidden aspect-[16/9] max-h-48">
                <Image
                  src={cat.image_url || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg'}
                  alt={cat.name}
                  fill
                  quality={90}
                  unoptimized={Boolean(cat.image_url && (cat.image_url.includes('ibb.co') || cat.image_url.includes('images.unsplash.com')))}
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 ease-out select-none pointer-events-auto"
                  loading="lazy"
                  draggable={false}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent opacity-90" />

                {/* Integrated Action Pill Button at bottom of card artwork */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                  <div className="px-3 py-1.5 rounded-lg bg-blue-600/90 backdrop-blur-md text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-md group-hover:bg-blue-500 transition-colors">
                    <Gamepad2 className="w-3.5 h-3.5 text-white" />
                    <span>FUNGUA GAMES</span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-950/80 border border-slate-700 text-white flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
