'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export interface GameMediaThumbnailProps {
  coverImage: string;
  screenshots?: string[];
  videoUrl?: string;
  thumbnailType?: 'image' | 'slideshow' | 'video' | 'auto';
  thumbnailFit?: 'contain' | 'cover' | 'top' | string;
  title?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxMCI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjMGUxNzJhIi8+PC9zdmc+';

export const getYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = (url || '').match(regExp);
  return match && match[1] ? match[1] : null;
};

export const getVimeoId = (url: string): string | null => {
  if (!url) return null;
  const match = (url || '').match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i);
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

export default function GameMediaThumbnail({
  coverImage,
  screenshots = [],
  videoUrl = '',
  thumbnailType = 'auto',
  thumbnailFit = 'cover',
  title = 'Game',
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
}: GameMediaThumbnailProps) {
  // Normalize images list
  const allImages = useMemo(() => {
    const list: string[] = [];
    if (coverImage && typeof coverImage === 'string' && coverImage.trim()) {
      list.push(coverImage.trim());
    }
    if (Array.isArray(screenshots)) {
      screenshots.forEach((s) => {
        if (s && typeof s === 'string' && s.trim() && !list.includes(s.trim())) {
          list.push(s.trim());
        }
      });
    }
    return list.length > 0 ? list : ['https://images.unsplash.com/photo-1550745165-9bc0b252726f'];
  }, [coverImage, screenshots]);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if video should be rendered
  const cleanVideoUrl = (videoUrl || '').trim();
  const ytId = getYouTubeId(cleanVideoUrl);
  const vimeoId = getVimeoId(cleanVideoUrl);
  const hasDirectVideo = isDirectVideoUrl(cleanVideoUrl);

  const isVideoMode =
    thumbnailType === 'video' ||
    (thumbnailType === 'auto' && Boolean(ytId || vimeoId || hasDirectVideo || cleanVideoUrl));

  // Multi-image slideshow effect (when not in video mode and multiple images exist)
  const isSlideshowMode = !isVideoMode && allImages.length > 1;

  useEffect(() => {
    if (!isSlideshowMode) return;

    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % allImages.length);
    }, 3600);

    return () => clearInterval(timer);
  }, [isSlideshowMode, allImages.length]);

  // Video Autoplay enforcer
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, [cleanVideoUrl]);

  // 1. VIDEO THUMBNAIL MODE
  if (isVideoMode && cleanVideoUrl) {
    if (ytId) {
      return (
        <div className={`relative w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none select-none ${className}`}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&disablekb=1&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&iv_load_policy=3`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-[150%] h-[150%] min-w-full min-h-full object-cover border-0 scale-125 pointer-events-none"
          />
        </div>
      );
    }

    if (vimeoId) {
      return (
        <div className={`relative w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none select-none ${className}`}>
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&loop=1&autopause=0&background=1&playsinline=1`}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture"
            className="w-[150%] h-[150%] min-w-full min-h-full object-cover border-0 scale-125 pointer-events-none"
          />
        </div>
      );
    }

    return (
      <div className={`relative w-full h-full bg-slate-950 overflow-hidden ${className}`}>
        <video
          ref={videoRef}
          src={cleanVideoUrl}
          poster={allImages[0] || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="w-full h-full object-cover pointer-events-none"
        />
      </div>
    );
  }

  // 2. MULTI-IMAGE SLIDESHOW THUMBNAIL MODE
  if (isSlideshowMode) {
    return (
      <div className={`relative w-full h-full overflow-hidden bg-slate-900 ${className}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={allImages[currentImgIndex]}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full"
          >
            <Image
              src={allImages[currentImgIndex]}
              alt={`${title} - Preview ${currentImgIndex + 1}`}
              fill
              quality={80}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes={sizes}
              className="object-cover object-center select-none"
              priority={priority && currentImgIndex === 0}
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        {/* Minimal Bottom Indicators */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-slate-950/70 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-slate-700/50 pointer-events-none">
          {allImages.map((_, idx) => (
            <span
              key={idx}
              className={`block rounded-full transition-all ${
                idx === currentImgIndex
                  ? 'w-3 h-1 bg-blue-400 shadow-sm'
                  : 'w-1 h-1 bg-slate-400/60'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // 3. SINGLE STATIC IMAGE MODE
  const fit = (thumbnailFit || 'cover').toLowerCase();

  if (fit === 'contain') {
    return (
      <div className={`relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center ${className}`}>
        {/* Ambient blurred backdrop so portrait/tall images seamlessly fill 16:9 cards without harsh empty spaces */}
        <div
          className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-125 pointer-events-none"
          style={{ backgroundImage: `url(${allImages[0]})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-[#0F172A]/40 opacity-70 pointer-events-none" />
        <Image
          src={allImages[0]}
          alt={title}
          fill
          quality={85}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes={sizes}
          className="object-contain object-center select-none group-hover:scale-[1.03] transition-transform duration-500 ease-out z-[1]"
          priority={priority}
          draggable={false}
        />
      </div>
    );
  }

  const objectFitClass = fit === 'top' ? 'object-cover object-top' : 'object-cover object-center';

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-900 ${className}`}>
      <Image
        src={allImages[0]}
        alt={title}
        fill
        quality={80}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        sizes={sizes}
        className={`${objectFitClass} select-none group-hover:scale-[1.03] transition-transform duration-500 ease-out`}
        priority={priority}
        draggable={false}
      />
    </div>
  );
}
