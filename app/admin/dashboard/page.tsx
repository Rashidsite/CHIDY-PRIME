'use client';

import { useEffect } from 'react';

export default function AdminDashboardRedirect() {
  useEffect(() => {
    window.location.replace('/admin');
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-bold text-sm">Inafungua Chidy Admin Portal...</span>
      </div>
    </div>
  );
}
