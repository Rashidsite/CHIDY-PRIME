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

export interface MediaInfo {
  type: 'image' | 'video';
  image: string;
  video: string;
  videoType: 'youtube' | 'vimeo' | 'direct' | 'none';
  youtubeId: string | null;
  vimeoId: string | null;
}

export const getYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
};

export const getVimeoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i);
  return match && match[1] ? match[1] : null;
};

export const isDirectVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.m3u8') ||
    url.includes('.r2.dev') ||
    url.includes('b-cdn.net') ||
    url.includes('blob:') ||
    url.includes('video/upload')
  );
};

export const parseMedia = (rawUrl: string): MediaInfo => {
  let img = '';
  let vid = '';
  let explicitType: 'image' | 'video' | null = null;

  if (rawUrl && typeof rawUrl === 'string') {
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        img = parsed.image || '';
        vid = parsed.video || '';
        if (parsed.type === 'video' || parsed.type === 'image') {
          explicitType = parsed.type;
        }
      } catch (e) {}
    } else {
      if (getYouTubeId(trimmed) || getVimeoId(trimmed) || isDirectVideoUrl(trimmed)) {
        vid = trimmed;
        explicitType = 'video';
      } else {
        img = trimmed;
        explicitType = 'image';
      }
    }
  }

  const ytId = vid ? getYouTubeId(vid) : (img ? getYouTubeId(img) : null);
  const vmId = vid ? getVimeoId(vid) : (img ? getVimeoId(img) : null);

  let videoType: 'youtube' | 'vimeo' | 'direct' | 'none' = 'none';
  let finalType: 'image' | 'video' = 'image';

  if (ytId) {
    videoType = 'youtube';
    finalType = 'video';
    if (!img || img.includes('youtube.com') || img.includes('youtu.be')) {
      img = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
  } else if (vmId) {
    videoType = 'vimeo';
    finalType = 'video';
  } else if (vid || isDirectVideoUrl(img)) {
    videoType = 'direct';
    finalType = 'video';
    if (!vid && isDirectVideoUrl(img)) {
      vid = img;
    }
  } else if (explicitType === 'video' && vid) {
    videoType = 'direct';
    finalType = 'video';
  } else {
    finalType = 'image';
  }

  return {
    type: finalType,
    image: img,
    video: vid,
    videoType,
    youtubeId: ytId,
    vimeoId: vmId,
  };
};

function SlideMediaViewer({ mediaInfo, title, isPriority }: { mediaInfo: MediaInfo; title: string; isPriority: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, [mediaInfo.video]);

  if (mediaInfo.type === 'video') {
    if (mediaInfo.videoType === 'youtube' && mediaInfo.youtubeId) {
      return (
        <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center pointer-events-none select-none">
          {mediaInfo.image && (
            <Image
              src={mediaInfo.image}
              alt={title}
              fill
              priority={isPriority}
              quality={80}
              className="object-cover object-center pointer-events-none -z-0 opacity-60"
            />
          )}
          <iframe
            src={`https://www.youtube.com/embed/${mediaInfo.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${mediaInfo.youtubeId}&controls=0&disablekb=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&iv_load_policy=3`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="eager"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] min-w-full min-h-full object-cover border-0 pointer-events-none z-[1]"
          />
        </div>
      );
    }

    if (mediaInfo.videoType === 'vimeo' && mediaInfo.vimeoId) {
      return (
        <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center pointer-events-none select-none">
          {mediaInfo.image && (
            <Image
              src={mediaInfo.image}
              alt={title}
              fill
              priority={isPriority}
              quality={80}
              className="object-cover object-center pointer-events-none -z-0 opacity-60"
            />
          )}
          <iframe
            src={`https://player.vimeo.com/video/${mediaInfo.vimeoId}?autoplay=1&muted=1&loop=1&autopause=0&background=1&playsinline=1`}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture"
            loading="eager"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] min-w-full min-h-full object-cover border-0 pointer-events-none z-[1]"
          />
        </div>
      );
    }

    if (mediaInfo.video) {
      return (
        <div className="relative w-full h-full bg-slate-950 overflow-hidden">
          <video
            ref={videoRef}
            src={mediaInfo.video}
            poster={mediaInfo.image || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
  }

  return (
    <Image
      src={mediaInfo.image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg'}
      alt={title}
      fill
      priority={isPriority}
      quality={85}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      sizes="(max-width: 768px) 100vw, 60vw"
      className="object-cover object-center select-none"
      draggable={false}
    />
  );
}

interface HeroSlideshowProps {
  slides?: Slide[];
  intervalMs?: number;
  onCtaClick?: (link?: string, slide?: Slide) => void;
}

export default function HeroSlideshow({ slides = DEFAULT_SLIDES, intervalMs = 5000, onCtaClick }: HeroSlideshowProps) {
  const router = useRouter();
  const activeSlides = Array.isArray(slides) && slides.length > 0 ? slides : DEFAULT_SLIDES;
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

  return (
    <div className="relative w-full aspect-[16/10] min-h-[220px] max-h-[280px] md:min-h-[340px] md:max-h-none md:aspect-auto rounded-2xl md:rounded-3xl overflow-hidden bg-[#0F172A] border border-slate-800 shadow-xl group">
      
      {/* ── DESKTOP SPLIT VIEW (md:grid) ── */}
      <div className="hidden md:grid md:grid-cols-12 min-h-[340px]">
        
        {/* LEFT: Text & Action Panel */}
        <div className="md:col-span-5 p-6 sm:p-8 bg-[#0F172A] flex flex-col justify-center gap-3 z-10 border-r border-slate-800">
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

        {/* RIGHT: Image / Video Container */}
        <div className="md:col-span-7 relative min-h-full bg-slate-900 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="absolute inset-0 w-full h-full"
            >
              <SlideMediaViewer mediaInfo={mediaInfo} title={slide.title} isPriority={current === 0} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── MOBILE IMMERSIVE VIEW (md:hidden) ── */}
      <div className="md:hidden absolute inset-0 w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 w-full h-full"
          >
            <SlideMediaViewer mediaInfo={mediaInfo} title={slide.title} isPriority={current === 0} />
          </motion.div>
        </AnimatePresence>

        {/* Clean Gradient Overlay - allows background video to be clearly visible while maintaining text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B111E] via-[#0B111E]/40 to-transparent z-10 pointer-events-none" />

        {/* Overlay Content */}
        <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5 z-20 flex flex-col justify-end gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-600/30 border border-blue-400/50 text-blue-300 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-blue-300" />
              <span>{slide.tag || 'GAME MPYA'}</span>
            </span>
          </div>

          <h1 className="text-sm sm:text-base font-black text-white uppercase tracking-tight truncate leading-tight mt-0.5">
            {slide.title}
          </h1>

          {slide.subtitle && (
            <p className="text-[10px] sm:text-xs text-slate-200 font-semibold truncate leading-tight">
              {slide.subtitle}
            </p>
          )}

          <div className="pt-1.5 flex items-center justify-between">
            <button
              onClick={(e) => handleCtaClick(e, slide.cta_link)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl font-black text-[11px] uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 border border-blue-400 shadow-md transition-colors cursor-pointer touch-manipulation"
            >
              <Gamepad2 className="w-4 h-4 text-white" />
              <span>{slide.cta_text || 'GAME MPYA ➔'}</span>
            </button>

            {/* Slide Dots on Mobile */}
            <div className="flex items-center gap-1.5 p-1">
              {(activeSlides ?? []).map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => goToSlide(idx, e)}
                  className={`h-2 rounded-full transition-all min-w-[20px] min-h-[44px] flex items-center justify-center`}
                  aria-label={`Slide ${idx + 1}`}
                >
                  <span className={`block h-1.5 rounded-full transition-all ${
                    idx === current ? 'w-4 bg-blue-400' : 'w-1.5 bg-slate-500'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Arrows */}
      <div className="hidden md:flex absolute bottom-4 right-4 z-20 items-center gap-2">
        <button
          onClick={prevSlide}
          className="min-w-[44px] min-h-[44px] rounded-full bg-slate-950/90 border border-slate-700 text-white flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition-colors shadow-md cursor-pointer touch-manipulation"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={nextSlide}
          className="min-w-[44px] min-h-[44px] rounded-full bg-slate-950/90 border border-slate-700 text-white flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition-colors shadow-md cursor-pointer touch-manipulation"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Slide Indicator Dots */}
      <div className="hidden md:flex absolute bottom-4 left-4 z-20 items-center gap-1.5">
        {(activeSlides ?? []).map((_, idx) => (
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
  );
}
