import React from 'react';

export default function AdminSlidesLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div className="h-8 bg-slate-900 border border-slate-800 rounded-xl w-64" />
        <div className="h-10 bg-slate-900 border border-slate-800 rounded-xl w-44" />
      </div>
      <div className="h-96 bg-slate-900 border border-slate-800 rounded-3xl" />
    </div>
  );
}
