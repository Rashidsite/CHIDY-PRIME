'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import NewGamesFeed from '@/components/NewGamesFeed';
import CheckoutModal from '@/components/CheckoutModal';
import CelebrationPopup from '@/components/CelebrationPopup';
import BackgroundOverlay from '@/components/BackgroundOverlay';
import { GameProduct } from '@/components/GameCard';

const INITIAL_FALLBACK_GAMES: GameProduct[] = [
  {
    id: 'g1',
    title: 'Maleo Bus Mod Shabiby TZ',
    description: 'Basi la Shabiby lenye taa za LED, sound ya Turbo na muonekano wa Kitanzania 🇹🇿',
    cover_image: 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
    price: 3000,
    rating: 5.0,
    category: 'Maleo Bus Mods TZ',
    tags: ['Maleo', 'Shabiby', 'Tanzania'],
    status: 'published',
    access_duration: 'Lifetime',
  },
  {
    id: 'g2',
    title: 'GTA V Tanzania Edition + Modpack',
    description: 'GTA 5 ikiwa na daladala, mitaa ya Dar es Salaam, na sauti za Kiswahili 🎮',
    cover_image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop',
    price: 5000,
    rating: 4.9,
    category: 'World Games',
    tags: ['GTA V', 'PC Games', 'Tanzania Mod'],
    status: 'published',
    access_duration: 'Lifetime',
  },
  {
    id: 'g3',
    title: 'Tanzania Truck & Bus Simulator 2024',
    description: 'Endesha malori ya Scania na Actros kwenye barabara za mikoani Tanzania ⚡',
    cover_image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop',
    price: 2500,
    rating: 4.8,
    category: 'TZ Simulators',
    tags: ['Simulator', 'Truck', 'Tanzania'],
    status: 'published',
    access_duration: 'Lifetime',
  },
];

export default function ExplorePage() {
  const [games, setGames] = useState<GameProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutGame, setCheckoutGame] = useState<GameProduct | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [unlockedGameIds, setUnlockedGameIds] = useState<Set<string>>(new Set());

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cpcg_unlocked_games');
      if (saved) {
        setUnlockedGameIds(new Set(JSON.parse(saved)));
      }
    } catch {}
  }, []);

  const loadLiveGames = async () => {
    try {
      // 1. Fetch curated_new_games_feed from site_settings
      let curatedSet = new Set<string>();
      try {
        const { data: sData } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'curated_new_games_feed')
          .maybeSingle();
        if (Array.isArray(sData?.value)) {
          curatedSet = new Set(sData.value);
        }
      } catch {}

      // 2. Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsData) {
        const liveList = postsData.filter((p) => {
          const status = String(p.status || '').toLowerCase();
          return status !== 'draft' && status !== 'archived' && status !== 'hidden' && p.is_active !== false;
        });

        // Strict Admin Curation: check site_settings list or is_new_feed boolean
        const curatedList = liveList.filter((p) => curatedSet.has(p.id) || p.is_new_feed === true);

        const formattedGames: GameProduct[] = curatedList.map((p) => ({
          id: p.id,
          title: p.title || 'Untitled Game',
          description: p.description || '',
          cover_image: p.image_url || p.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
          price: Number(p.price || 0),
          rating: Number(p.rating || 4.9),
          category: p.category || 'Maleo Bus Mods TZ',
          tags: ['Chidy Prime Mod', 'Tanzania'],
          status: p.status || 'published',
          is_new_feed: true,
          download_url: (Array.isArray(p.links) && p.links[0]?.url) || p.download_url,
          access_duration: p.access_duration || p.license_duration || 'Lifetime',
        }));

        setGames(formattedGames);
      }
    } catch (err) {
      console.error('Failed to load explore games:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveGames();

    const channel = supabase
      .channel('explore-live-games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        loadLiveGames();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        loadLiveGames();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleBuyNow = (game: GameProduct) => {
    setCheckoutGame(game);
  };

  const handleCheckoutSuccess = (order: any) => {
    if (checkoutGame) {
      setUnlockedGameIds((prev) => {
        const next = new Set(prev);
        next.add(checkoutGame.id);
        try {
          localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });
    }
    setShowCelebration(true);
  };

  return (
    <>
      <BackgroundOverlay />
      <Navbar games={games} />

      <main className="main-storefront-wrapper relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-36">
        <NewGamesFeed
          games={games}
          onBuyNow={handleBuyNow}
          unlockedGameIds={unlockedGameIds}
        />
      </main>

      {checkoutGame && (
        <CheckoutModal
          isOpen={!!checkoutGame}
          onClose={() => setCheckoutGame(null)}
          game={checkoutGame}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      <CelebrationPopup
        isVisible={showCelebration}
        userName="Mteja Mkuu"
      />
    </>
  );
}
