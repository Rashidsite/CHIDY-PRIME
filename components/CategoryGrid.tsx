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
  const activeList = Array.isArray(categories) && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const [isRegistered, setIsRegistered] = useState<boolean>(true);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const reg = localStorage.getItem('cpcg_user_registered');
        if (reg === 'true' || reg === '1') {
          setIsRegistered(true);
        }
      }
    } catch (e) {}
  }, []);

  const handleCardClick = (catName: string) => {
    if (isRegistered) {
      if (onSelectCategory) onSelectCategory(catName || 'Maleo Mods');
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
              {(activeList ?? []).length} categories available
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/30">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="text-xs text-blue-400 font-black uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {(activeList ?? []).map((cat, idx) => {
          const catName = cat?.name || 'Category';
          const isSelected = (selectedCategory || '').toLowerCase() === catName.toLowerCase();
          const rawKey = cat?.id || catName || idx;
          const cardId = `category-card-${String(rawKey).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          const isOddTotal = (activeList ?? []).length % 2 !== 0;
          const isLast = idx === (activeList ?? []).length - 1;
          const isFullSpanMobile = isOddTotal && isLast;

          return (
            <motion.div
              key={cat?.id || idx}
              id={cardId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.03, ease: 'easeOut' }}
              onClick={() => handleCardClick(catName)}
              className={`relative z-10 rounded-2xl overflow-hidden bg-[#0F172A] flex flex-col justify-between border scroll-mt-24 ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-800'
              } shadow-lg hover:border-blue-500/60 transition-all duration-300 cursor-pointer group touch-manipulation interactive-card ${
                isFullSpanMobile ? 'col-span-2 md:col-span-1' : ''
              }`}
            >
              {/* Card Header: Title + Game Count */}
              <div className="flex items-center justify-between p-2 sm:p-3 bg-[#0F172A] border-b border-slate-800/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight leading-tight truncate group-hover:text-blue-400 transition-colors">
                      {catName}
                    </h3>
                    {cat?.description && (
                      <p className="text-[9px] sm:text-[10px] text-slate-200 font-medium line-clamp-1 hidden sm:block">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black whitespace-nowrap bg-slate-900 text-blue-400 border border-slate-800">
                    {cat?.game_count ?? 12}
                  </span>
                </div>
              </div>

              {/* Card Body: Cover Image */}
              <div className={`relative w-full overflow-hidden bg-slate-950 ${
                isFullSpanMobile ? 'aspect-[21/9] sm:aspect-video' : 'aspect-[16/10]'
              }`}>
                <Image
                  src={cat?.image_url || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg'}
                  alt={catName}
                  fill
                  quality={75}
                  sizes={isFullSpanMobile ? '(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-80" />
              </div>

              {/* Card Footer: Action Button */}
              <div className="p-2 sm:p-3 bg-[#0F172A] border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[9px] sm:text-[11px] font-black uppercase text-blue-400 group-hover:text-blue-300 transition-colors flex items-center gap-1">
                  <span>Fungua</span>
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-glow" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
