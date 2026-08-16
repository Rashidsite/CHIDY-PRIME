'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  cta_text?: string;
  cta_link?: string;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: '1',
    title: 'MALEO BUS SIMULATOR MODS TZ',
    subtitle: 'Experience ultimate realism with authentic Tanzanian bus mods, high-detail skins, and custom routes.',
    image_url: 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
    cta_text: 'Explore Bus Mods',
    cta_link: '#catalog',
  },
  {
    id: '2',
    title: 'PC & CONSOLE DIGITAL GAMES',
    subtitle: 'Instant digital key generation & high-speed direct download links delivered straight to your device.',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop',
    cta_text: 'Browse Digital Games',
    cta_link: '#catalog',
  },
  {
    id: '3',
    title: 'AUTOMATED MOBILE PAYMENTS',
    subtitle: 'Pay easily via PressoPay, HarakaPay, or M-Pesa STK Push with instant automated product access delivery.',
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop',
    cta_text: 'Instant Access Now',
    cta_link: '#catalog',
  },
];

interface HeroSlideshowProps {
  slides?: Slide[];
  intervalMs?: number;
}

export default function HeroSlideshow({ slides = DEFAULT_SLIDES, intervalMs = 5000 }: HeroSlideshowProps) {
  const activeSlides = slides.length > 0 ? slides : DEFAULT_SLIDES;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeSlides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [activeSlides.length, intervalMs]);

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % activeSlides.length);
  };

  const slide = activeSlides[current];

  return (
    <div className="relative w-full h-[420px] sm:h-[480px] lg:h-[540px] rounded-3xl overflow-hidden border border-glass-border shadow-glass group bg-slate-950">
      
      {/* Slide Image with Smooth Blend */}
      <div className="absolute inset-0">
        <Image
          src={slide.image_url}
          alt={slide.title}
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-cover object-center transition-all duration-700 ease-in-out scale-105 group-hover:scale-100"
        />
        {/* Dark Gradient Overlay for Glass Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
      </div>

      {/* Slide Text & Action Content */}
      <div className="relative z-10 h-full max-w-4xl px-6 sm:px-12 flex flex-col justify-center gap-4">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-glow text-xs font-semibold backdrop-blur-md w-fit animate-fade-in">
          <Zap className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Official Storefront • Instant Automated Delivery</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight uppercase font-sans drop-shadow-md">
          {slide.title}
        </h1>

        {/* Subtitle */}
        {slide.subtitle && (
          <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
            {slide.subtitle}
          </p>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href={slide.cta_link || '#catalog'}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-cyan text-white font-bold text-sm shadow-glow hover:scale-105 transition-transform"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{slide.cta_text || 'Shop Digital Catalog'}</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900/60 border border-slate-800 px-4 py-3 rounded-2xl backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Verified Digital Keys & Files</span>
          </div>
        </div>
      </div>

      {/* Carousel Arrow Controls */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-white flex items-center justify-center backdrop-blur-md hover:bg-brand-600 transition-all opacity-0 group-hover:opacity-100"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-white flex items-center justify-center backdrop-blur-md hover:bg-brand-600 transition-all opacity-0 group-hover:opacity-100"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
        {activeSlides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-2 rounded-full transition-all ${
              current === idx ? 'w-8 bg-brand-glow shadow-glow' : 'w-2 bg-slate-600 hover:bg-slate-400'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
