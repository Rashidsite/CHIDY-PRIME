'use client';

import React from 'react';

export function CategorySkeleton() {
  return (
    <div className="animate-pulse rounded-3xl overflow-hidden bg-black/60 border-2 border-emerald-500/20 flex flex-col justify-between h-[340px] shadow-lg">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-emerald-500/10">
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-800 rounded w-2/3" />
              <div className="h-3 bg-slate-800 rounded w-1/2" />
            </div>
          </div>
        </div>
        {/* Thumbnail aspect-[16/10] */}
        <div className="w-full aspect-[16/10] bg-slate-900/80" />
      </div>
      {/* Bottom Button */}
      <div className="p-4 border-t border-emerald-500/10">
        <div className="h-12 bg-slate-800 rounded-2xl w-full" />
      </div>
    </div>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden bg-black/60 border-2 border-emerald-500/20 flex flex-col justify-between h-full min-h-[300px] shadow-lg">
      <div>
        {/* Cover image aspect-[16/10] */}
        <div className="w-full aspect-[16/10] bg-slate-900/80 relative">
          <div className="absolute top-3 left-3 w-16 h-4 bg-slate-800 rounded-lg" />
          <div className="absolute top-3 right-3 w-12 h-4 bg-slate-800 rounded-lg" />
        </div>
        {/* Details Panel */}
        <div className="p-4 space-y-3">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="space-y-1.5">
            <div className="h-3 bg-slate-800 rounded w-full" />
            <div className="h-3 bg-slate-800 rounded w-5/6" />
          </div>
        </div>
      </div>
      {/* Bottom row */}
      <div className="p-4 border-t border-emerald-500/10 flex items-center justify-between">
        <div className="space-y-1.5 w-1/3">
          <div className="h-2 bg-slate-800 rounded w-1/2" />
          <div className="h-4 bg-slate-800 rounded w-full" />
        </div>
        <div className="h-9 bg-slate-800 rounded-xl w-24" />
      </div>
    </div>
  );
}

export function HorizontalCarouselSkeleton() {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-5 bg-slate-800 rounded-full" />
          <div className="h-5 bg-slate-800 rounded w-48 animate-pulse" />
        </div>
        <div className="flex gap-1">
          <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
        </div>
      </div>
      {/* Cards Scroll */}
      <div className="flex gap-4 overflow-x-hidden py-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-[280px] shrink-0">
            <GameCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
