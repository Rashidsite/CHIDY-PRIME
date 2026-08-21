'use client';

import React from 'react';
import Image from 'next/image';

interface BackgroundOverlayProps {
  imageUrl?: string;
  opacity?: number;
  enabled?: boolean;
}

export default function BackgroundOverlay({
  imageUrl,
  opacity = 0.3,
  enabled = true,
}: BackgroundOverlayProps) {
  if (!enabled || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700 overflow-hidden"
      style={{ opacity }}
    >
      <Image
        src={imageUrl}
        alt="Store Background"
        fill
        quality={50}
        sizes="100vw"
        loading="lazy"
        fetchPriority="low"
        className="object-cover object-center select-none"
        draggable={false}
      />
    </div>
  );
}
