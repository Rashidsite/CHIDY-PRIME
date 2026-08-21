'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import { Star, ShieldCheck, Zap, Download, ArrowLeft, Cpu, HardDrive, Monitor } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { GameProduct, formatPlanDuration } from '@/components/GameCard';
import { useProductAccess } from '@/hooks/useProductAccess';

const ScreenshotGallery = dynamic(() => import('@/components/ScreenshotGallery'), { ssr: false });
const CheckoutModal = dynamic(() => import('@/components/CheckoutModal'), { ssr: false });

export default function GameDetailPage() {
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const supabase = createClient();
  const { isUnlocked, refresh: refreshAccess } = useProductAccess();

  useEffect(() => {
    async function loadGameDetails() {
      if (!gameId) return;
      setLoading(true);
      try {
        // Query `posts` table (Primary Storefront Source)
        const { data: postData } = await supabase
          .from('posts')
          .select('*')
          .eq('id', gameId)
          .maybeSingle();

        if (postData) {
          setGame({
            id: postData.id,
            title: postData.title,
            description: postData.description,
            cover_image: postData.image_url || postData.cover_image,
            price: postData.price || 0,
            rating: postData.rating || 4.8,
            category: postData.category || 'MALEO BUS MODE TZ',
            screenshots: [
              postData.image_url || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
              'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
              'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200',
            ],
            download_url: postData.links?.[0]?.url || postData.download_url || '',
            system_req_minimum: {
              os: 'Windows 10 64-Bit',
              cpu: 'Intel Core i5 3.0 GHz',
              ram: '8 GB RAM',
              gpu: 'NVIDIA GTX 960 / AMD RX 570',
              storage: '10 GB free space',
            },
          });
        } else {
          // Check optional `products` table
          const { data: prodData } = await supabase
            .from('products')
            .select('*')
            .eq('id', gameId)
            .maybeSingle();

          if (prodData) {
            setGame(prodData);
          }
        }
      } catch (err) {
        console.error('Error fetching game detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGameDetails();
  }, [gameId, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-slate-400">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-slate-800" />
          <span>Loading Game Details...</span>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white p-4 space-y-4">
        <h2 className="text-2xl font-bold">Game Not Found</h2>
        <Link href="/" className="px-4 py-2 rounded-xl bg-brand-600 text-sm font-semibold">
          Return to Storefront
        </Link>
      </div>
    );
  }

  const isFree = game.price === 0;

  return (
    <>
      <Navbar />

      <main className="main-storefront-wrapper relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-36">
        
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </Link>

        {/* Hero Product Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Cover Image */}
          <div className="lg:col-span-7 relative aspect-[16/10] w-full rounded-3xl overflow-hidden border border-glass-border shadow-glass bg-slate-900">
            <Image
              src={game.cover_image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f'}
              alt={game.title}
              fill
              priority
              className="object-cover object-center"
            />
          </div>

          {/* Product Details & Purchase Card */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-glass-card border border-glass-border backdrop-blur-glass space-y-6">
            
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-glow border border-brand-500/30 text-xs font-semibold">
                {game.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                {game.title}
              </h1>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{game.rating || 4.8} / 5.0 Rating</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase font-bold text-purple-400 block mb-0.5">
                  {formatPlanDuration(game.access_duration || game.license_duration, isFree)}
                </span>
                <span className="text-2xl font-black text-white">
                  {isUnlocked(gameId) ? (
                    <span className="text-emerald-400">UNLOCKED</span>
                  ) : isFree ? (
                    <span className="text-emerald-400">FREE DOWNLOAD</span>
                  ) : (
                    formatCurrency(game.price)
                  )}
                </span>
              </div>
              <button
                onClick={() => setCheckoutOpen(true)}
                className={`px-6 py-3 rounded-2xl ${
                  isUnlocked(gameId) || isFree
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-gradient-to-r from-brand-600 via-brand-500 to-accent-cyan shadow-glow hover:scale-105'
                } text-white text-sm font-bold transition-all flex items-center gap-2 cursor-pointer`}
              >
                {isUnlocked(gameId) || isFree ? <Download className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                <span>{isUnlocked(gameId) ? 'Pakua Sasa (Download)' : isFree ? 'Get Access' : 'Buy Now'}</span>
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% Virus-Free & Safe Download Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent-cyan" />
                <span>Automated M-Pesa & PressoPay Webhook Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* Screenshots Lightbox Section */}
        {game.screenshots && game.screenshots.length > 0 && (
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-glass-border">
            <ScreenshotGallery screenshots={game.screenshots} />
          </div>
        )}

        {/* Description & System Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Description */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-glass-border space-y-3">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Product Overview & Details
            </h3>
            <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {game.description || 'Full high-performance digital product ready for immediate download after automated mobile checkout verification.'}
            </p>
          </div>

          {/* System Requirements */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-glass-border space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-5 h-5 text-accent-cyan" />
              <span>System Requirements (PC)</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">OS:</span>
                <span className="font-semibold">{game.system_req_minimum?.os || 'Windows 10 / 11 64-Bit'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Processor:</span>
                <span className="font-semibold">{game.system_req_minimum?.cpu || 'Intel Core i5-4460'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Memory:</span>
                <span className="font-semibold">{game.system_req_minimum?.ram || '8 GB RAM'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Graphics:</span>
                <span className="font-semibold">{game.system_req_minimum?.gpu || 'NVIDIA GTX 960'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Storage:</span>
                <span className="font-semibold">{game.system_req_minimum?.storage || '10 GB available space'}</span>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Checkout Modal */}
      {game && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          game={{
            id: game.id,
            title: game.title,
            price: game.price,
            cover_image: game.cover_image,
            category: game.category,
            access_duration: game.access_duration || game.license_duration,
          }}
          onSuccess={() => {
            refreshAccess();
          }}
        />
      )}
    </>
  );
}
