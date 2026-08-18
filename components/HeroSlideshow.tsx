'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Gamepad2, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  tag: string;
  cta_text?: string;
  cta_link?: string;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Maleo Bus Mods TZ',
    subtitle: 'Basi za Shabiby, Yutong, na barabara za Tanzania 🇹🇿',
    image_url: 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
    tag: 'MALEO MODS',
    cta_text: 'Tazama Mods',
    cta_link: '#catalog',
  },
  {
    id: '2',
    title: 'PC Games & Activation Keys',
    subtitle: 'GTA V, EA FC 24, Cyberpunk na game keys kwa bei nafuu 🎮',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop',
    tag: 'DIGITAL VAULT',
    cta_text: 'Fungua Store',
    cta_link: '#catalog',
  },
  {
    id: '3',
    title: 'Tanzania Games & Simulators',
    subtitle: 'Michezo mikali ya simu na PC ya Kitanzania ⚡',
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop',
    tag: 'LOCAL GAMES',
    cta_text: 'Pakua Sasa',
    cta_link: '#catalog',
  },
];

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxMCI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjMGUxNzJhIi8+PC9zdmc+';

const parseMedia = (rawUrl: string) => {
  try {
    if (rawUrl && rawUrl.startsWith('{')) {
      const parsed = JSON.parse(rawUrl);
      return {
        image: parsed.image || '',
        video: parsed.video || '',
        type: parsed.type || 'video',
      };
    }
  } catch (e) {}
  return {
    image: rawUrl || '',
    video: '',
    type: 'image',
  };
};

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

interface HeroSlideshowProps {
  slides?: Slide[];
  intervalMs?: number;
  onCtaClick?: (link?: string, slide?: Slide) => void;
}

export default function HeroSlideshow({ slides = DEFAULT_SLIDES, intervalMs = 5000, onCtaClick }: HeroSlideshowProps) {
  const router = useRouter();
  const activeSlides = slides.length > 0 ? slides : DEFAULT_SLIDES;
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetAutoplay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeSlides.length);
    }, intervalMs);
  };

  useEffect(() => {
    resetAutoplay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSlides.length, intervalMs]);

  const prevSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrent((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
    resetAutoplay();
  };

  const nextSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrent((prev) => (prev + 1) % activeSlides.length);
    resetAutoplay();
  };

  const goToSlide = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrent(idx);
    resetAutoplay();
  };

  const handleCtaClick = (e: React.MouseEvent, ctaLink?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (onCtaClick) {
      onCtaClick(ctaLink, slide);
    }

    const target = ctaLink || '#catalog';

    if (target.startsWith('#')) {
      const el = document.getElementById(target.substring(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        const catalog = document.getElementById('catalog');
        if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      router.push(target);
    }
  };

  const slide = activeSlides[current] || activeSlides[0];
  const mediaInfo = parseMedia(slide.image_url);
  const isYouTube = mediaInfo.type === 'video' && (mediaInfo.video.includes('youtube.com') || mediaInfo.video.includes('youtu.be'));
  const ytId = isYouTube ? getYouTubeId(mediaInfo.video) : null;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-[#0F172A] border border-slate-800 shadow-xl group">
      
      {/* ── SPLIT SHOWCASE: Picture on Right, Text on Solid Slate Panel on Left ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[320px] sm:min-h-[340px]">
        
        {/* ── LEFT: Text & Action Panel ── */}
        <div className="md:col-span-5 p-6 sm:p-8 bg-[#0F172A] flex flex-col justify-center gap-3 z-10 border-b md:border-b-0 md:border-r border-slate-800">
          
          {/* Badge */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`tag-${slide.id}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 text-[11px] font-black tracking-widest uppercase w-fit"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{slide.tag || 'HOT OFFER'}</span>
            </motion.div>
          </AnimatePresence>

          {/* Title */}
          <AnimatePresence mode="wait">
            <motion.h1
              key={`title-${slide.id}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-lg sm:text-2xl font-black text-white tracking-tight uppercase leading-snug"
            >
              {slide.title}
            </motion.h1>
          </AnimatePresence>

          {/* Subtitle */}
          {slide.subtitle && (
            <AnimatePresence mode="wait">
              <motion.p
                key={`sub-${slide.id}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-xs text-slate-300 font-semibold line-clamp-2 leading-relaxed"
              >
                {slide.subtitle}
              </motion.p>
            </AnimatePresence>
          )}

          {/* CTA Action Button */}
          <div className="pt-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => handleCtaClick(e, slide.cta_link)}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 border border-blue-400 shadow-md transition-colors cursor-pointer touch-manipulation"
            >
              <Gamepad2 className="w-4 h-4 text-white" />
              <span>{slide.cta_text || 'Tazama Sasa'}</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        </div>

        {/* ── RIGHT: Image / Video Showcase Container ── */}
        <div className="md:col-span-7 relative min-h-[220px] sm:min-h-[260px] md:min-h-full bg-slate-900 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="absolute inset-0 w-full h-full"
            >
              {ytId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&disablekb=1&modestbranding=1&rel=0`}
                  title={slide.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  className="w-full h-full object-cover border-0 pointer-events-none scale-125"
                />
              ) : (
                <Image
                  src={mediaInfo.image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg'}
                  alt={slide.title}
                  fill
                  priority={current === 0}
                  quality={95}
                  unoptimized={Boolean(mediaInfo.image && (mediaInfo.image.includes('ibb.co') || mediaInfo.image.includes('images.unsplash.com')))}
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover object-center select-none pointer-events-auto"
                  draggable={false}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-60 md:hidden" />
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
            <button
              onClick={prevSlide}
              className="w-9 h-9 rounded-full bg-slate-950/80 border border-slate-700 text-white flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition-colors shadow-md cursor-pointer touch-manipulation"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="w-9 h-9 rounded-full bg-slate-950/80 border border-slate-700 text-white flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition-colors shadow-md cursor-pointer touch-manipulation"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Slide Indicator Dots */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5">
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => goToSlide(idx, e)}
                className={`h-2 rounded-full transition-all cursor-pointer touch-manipulation ${
                  idx === current ? 'w-6 bg-blue-500' : 'w-2 bg-slate-700/80 hover:bg-slate-500'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
