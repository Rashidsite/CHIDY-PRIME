'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Download, ShieldCheck, Key, Copy, Clock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';

export default function DownloadTokenPage() {
  const params = useParams();
  const token = params.token as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function verifyDownloadToken() {
      if (!token) return;
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from('orders')
          .select('*')
          .eq('download_token', token)
          .single();

        if (err || !data) {
          setError('Invalid or expired download token. Please check your order history.');
        } else {
          setOrder(data);
        }
      } catch (e: any) {
        setError(e.message || 'Token verification failed');
      } finally {
        setLoading(false);
      }
    }
    verifyDownloadToken();
  }, [token, supabase]);

  const handleCopyKey = () => {
    if (!order?.activation_key) return;
    navigator.clipboard.writeText(order.activation_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyDownloadUrl = () => {
    if (!order?.download_url) return;
    navigator.clipboard.writeText(order.download_url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Clock className="w-8 h-8 text-brand-glow animate-spin" />
          <span>Verifying Secure Download Token...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white p-4 space-y-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-slate-400 max-w-md">{error}</p>
        <Link href="/orders" className="px-4 py-2 rounded-xl bg-brand-600 text-xs font-bold text-white shadow-glow">
          Return to Orders
        </Link>
      </div>
    );
  }

  const isCompleted = order.status === 'completed' || order.status === 'approved';

  return (
    <>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        
        <Link href="/orders" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Orders</span>
        </Link>

        <div className="p-8 rounded-3xl bg-glass-card border border-glass-border backdrop-blur-glass shadow-glass space-y-8 text-center sm:text-left">
          
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Payment Auto-Verified & Access Granted</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {order.game_title}
              </h1>
              <p className="text-xs text-slate-400">
                Order Reference: <span className="font-mono text-slate-200">{order.order_number}</span>
              </p>
            </div>
          </div>

          {/* Activation Key Card */}
          {order.activation_key && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Digital Product Activation Key</span>
                </span>
                {copiedKey && <span className="text-[10px] text-accent-cyan font-bold">Copied!</span>}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={order.activation_key}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono font-bold text-accent-cyan tracking-wider focus:outline-none"
                />
                <button
                  onClick={handleCopyKey}
                  className="p-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors shrink-0 shadow-glow"
                  title="Copy Key"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Download Action Section */}
          <div className="p-6 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 border border-brand-500/30 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-semibold text-brand-glow">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                High-Speed Direct Link
              </span>
              <span className="text-slate-400">Expires in 48 Hours</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <a
                href={order.download_url ? order.download_url : `/api/download?token=${order.download_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-accent-cyan text-white text-sm font-bold shadow-glow hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>Start Direct File Download</span>
              </a>

              <button
                onClick={handleCopyDownloadUrl}
                className="w-full sm:w-auto px-4 py-4 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 hover:text-white transition-colors"
              >
                {copiedLink ? 'Link Copied!' : 'Copy Direct Link'}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <p className="font-semibold text-white">Need installation support?</p>
            <p>
              If you experience any issues downloading or activating your mod, contact our automated support assistant or present your order reference number.
            </p>
          </div>

        </div>
      </main>
    </>
  );
}
