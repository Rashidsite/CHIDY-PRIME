'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface ScreenshotGalleryProps {
  screenshots: string[];
}

export default function ScreenshotGallery({ screenshots }: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!screenshots || screenshots.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        In-Game Screenshots & Media
      </h3>

      {/* Thumbnails Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {screenshots.map((url, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            className="group relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-brand-500 transition-all focus:outline-none"
          >
            <Image
              src={url}
              alt={`Screenshot ${idx + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 className="w-5 h-5 text-white" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 p-3 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={() =>
              setSelectedIndex((prev) => (prev! - 1 + screenshots.length) % screenshots.length)
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="relative max-w-5xl max-h-[85vh] w-full aspect-video rounded-2xl overflow-hidden border border-slate-700">
            <Image
              src={screenshots[selectedIndex]}
              alt={`Full Screenshot ${selectedIndex + 1}`}
              fill
              className="object-contain"
            />
          </div>

          <button
            onClick={() =>
              setSelectedIndex((prev) => (prev! + 1) % screenshots.length)
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
