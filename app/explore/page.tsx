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
    const syncUserVault = async () => {
      try {
        const savedReg = localStorage.getItem('cpcg_registered');
        const userPhone = localStorage.getItem('cpcg_user_phone') || (savedReg ? JSON.parse(savedReg).phone : null);

        if (!userPhone) {
          setUnlockedGameIds(new Set());
          localStorage.removeItem('cpcg_unlocked_games');
          return;
        }

        const digits = userPhone.replace(/\D/g, '');
        const clean = digits.startsWith('0') ? '255' + digits.slice(1) : (digits.startsWith('255') ? digits : '255' + digits);
        const local = clean.startsWith('255') ? '0' + clean.slice(3) : clean;

        const newUnlocked = new Set<string>();

        // Query payment_orders for verified completed orders
        try {
          const { data: legacyData } = await supabase
            .from('payment_orders')
            .select('post_id')
            .or(`phone_number.eq.${clean},phone_number.eq.${local}`)
            .in('status', ['approved', 'completed', 'paid']);

          if (legacyData && legacyData.length > 0) {
            legacyData.forEach((d: any) => {
              if (d.post_id) newUnlocked.add(String(d.post_id));
            });
          }
        } catch {}

        // Query orders table fallback
        try {
          const { data: ordersData } = await supabase
            .from('orders')
            .select('game_id, product_id')
            .or(`visitor_phone.eq.${clean},visitor_phone.eq.${local},phone_number.eq.${clean},phone_number.eq.${local}`)
            .in('status', ['approved', 'completed', 'paid']);

          if (ordersData && ordersData.length > 0) {
            ordersData.forEach((o: any) => {
              if (o.game_id) newUnlocked.add(String(o.game_id));
              if (o.product_id) newUnlocked.add(String(o.product_id));
            });
          }
        } catch {}

        setUnlockedGameIds(newUnlocked);
        localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(newUnlocked)));
      } catch {
        setUnlockedGameIds(new Set());
      }
    };

    syncUserVault();

    const handleLogout = () => {
      setUnlockedGameIds(new Set());
      localStorage.removeItem('cpcg_unlocked_games');
    };

    window.addEventListener('cpcg_auth_change', syncUserVault);
    window.addEventListener('cpcg_logout_reset', handleLogout);

    return () => {
      window.removeEventListener('cpcg_auth_change', syncUserVault);
      window.removeEventListener('cpcg_logout_reset', handleLogout);
    };
  }, [supabase]);

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

        const formattedGames: GameProduct[] = curatedList.map((p) => {
          let dur = p.plan_duration || p.access_duration || p.license_duration || p.duration;
          if (!dur && p.duration_days !== undefined && p.duration_days !== null) {
            if (p.duration_days === 2) dur = '2 Hours';
            else if (p.duration_days === 1 || p.duration_days === 24) dur = '24 Hours';
            else if (p.duration_days === 7) dur = '7 Days';
            else if (p.duration_days === 30) dur = '30 Days';
            else if (p.duration_days === 0) dur = 'Lifetime';
            else dur = `${p.duration_days} Days`;
          }

          return {
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
            access_duration: dur || 'Lifetime',
            license_duration: dur || 'Lifetime',
            plan_duration: dur || 'Lifetime',
          };
        });

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadLiveGames();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
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
      const isFree = Number(checkoutGame.price) === 0;
      const isOrderApproved =
        isFree ||
        order?.is_completed === true ||
        order?.unlocked === true ||
        ['completed', 'approved', 'paid', 'success'].includes(String(order?.status || '').toLowerCase());

      if (isOrderApproved) {
        setUnlockedGameIds((prev) => {
          const next = new Set(prev);
          next.add(checkoutGame.id);
          try {
            localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(next)));
          } catch {}
          return next;
        });
      }
    }
    setShowCelebration(true);
  };

  return (
    <>
      <BackgroundOverlay />
      {/* Hide hamburger (☰) button strictly on this GAMES MPYA view — scoped override only */}
      <style>{`
        .games-mpya-nav [aria-label="Open mobile navigation drawer"] { display: none !important; }
      `}</style>
      <div className="games-mpya-nav">
        <Navbar games={games} />
      </div>

      <main className="main-storefront-wrapper relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
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
