'use client';

import { useEffect } from 'react';

export default function ContentProtectionGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Prevent Right-Click / Long-Press Context Menu on Images & Protected Store Content
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Allow right-click on inputs and textareas (for paste/copy operations)
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input') ||
        target.closest('textarea');

      if (isInput) return;

      // Block right-click on images, banners, and general UI to prevent saving
      const isImageOrProtected =
        target.tagName === 'IMG' ||
        target.tagName === 'PICTURE' ||
        target.tagName === 'VIDEO' ||
        target.tagName === 'CANVAS' ||
        target.closest('img') ||
        target.closest('.interactive-card') ||
        target.closest('article') ||
        target.closest('.glass-card');

      if (isImageOrProtected || !isInput) {
        e.preventDefault();
      }
    };

    // 2. Prevent Dragging on Images
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'IMG' ||
        target?.tagName === 'PICTURE' ||
        target?.tagName === 'VIDEO' ||
        target?.closest('img')
      ) {
        e.preventDefault();
      }
    };

    // 3. Block Save-Page Shortcuts (Ctrl+S / Cmd+S)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('dragstart', handleDragStart, { capture: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('dragstart', handleDragStart, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
