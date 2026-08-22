'use client';

import React from 'react';

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
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700"
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: opacity,
      }}
    />
  );
}
