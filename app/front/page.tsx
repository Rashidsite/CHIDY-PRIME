'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import HeroSlideshow, { Slide } from '@/components/HeroSlideshow';
import GameCatalog from '@/components/GameCatalog';
import BackgroundOverlay from '@/components/BackgroundOverlay';
import { GameProduct } from '@/components/GameCard';
import { createClient } from '@/lib/supabase/client';

const CartDrawer = dynamic(() => import('@/components/CartDrawer'), { ssr: false });
const CheckoutModal = dynamic(() => import('@/components/CheckoutModal'), { ssr: false });
const RegisterModal = dynamic(() => import('@/components/RegisterModal'), { ssr: false });
const CelebrationPopup = dynamic(() => import('@/components/CelebrationPopup'), { ssr: false });

export default function FrontHubPage() {
  const supabase = useMemo(() => createClient(), []);
  const [games, setGames] = useState<GameProduct[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutGame, setCheckoutGame] = useState<GameProduct | null>(null);
  const [slideshowInterval, setSlideshowInterval] = useState<number>(5000);
  const [bgSettings, setBgSettings] = useState<{ enabled: boolean; image_url: string; opacity: number }>({
    enabled: true,
    image_url: '/game_controller_bg.jpg',
    opacity: 0.45,
  });
  const [unlockedGameIds, setUnlockedGameIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Registration states
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Load registration and unlocked games from localStorage & Supabase
  useEffect(() => {
    const syncUserAuthAndVault = async () => {
      try {
        const savedReg = localStorage.getItem('cpcg_registered');
        const userPhone = localStorage.getItem('cpcg_user_phone') || (savedReg ? JSON.parse(savedReg).phone : null);
        const localUnlocked = JSON.parse(localStorage.getItem('cpcg_unlocked_games') || '[]');

        if (Array.isArray(localUnlocked) && localUnlocked.length > 0) {
          setUnlockedGameIds((prev) => {
            const merged = new Set(prev);
            localUnlocked.forEach((id: string) => merged.add(id));
            return merged;
          });
        }

        if (!userPhone && !savedReg) {
          setIsRegistered(false);
          setRegisteredName('');
          return;
        }

        if (savedReg) {
          const parsed = JSON.parse(savedReg);
          setIsRegistered(true);
          setRegisteredName(parsed.name || '');
        }

        if (userPhone) {
          const digits = userPhone.replace(/\D/g, '');
          const clean = digits.startsWith('0') ? '255' + digits.slice(1) : (digits.startsWith('255') ? digits : '255' + digits);
          const local = clean.startsWith('255') ? '0' + clean.slice(3) : clean;

          const newUnlocked = new Set<string>(localUnlocked);

          try {
            const { data: purchases } = await supabase
              .from('user_purchases')
              .select('product_id, game_id')
              .or(`customer_phone.eq.${clean},customer_phone.eq.${local},phone_number.eq.${clean},phone_number.eq.${local}`)
              .eq('status', 'active');

            if (purchases && purchases.length > 0) {
              purchases.forEach((p: any) => {
                if (p.product_id) newUnlocked.add(p.product_id);
                if (p.game_id) newUnlocked.add(p.game_id);
              });
            }
          } catch {}

          try {
            const { data: ordersData } = await supabase
              .from('orders')
              .select('game_id, product_id')
              .or(`visitor_phone.eq.${clean},visitor_phone.eq.${local},phone_number.eq.${clean},phone_number.eq.${local}`)
              .in('status', ['approved', 'completed', 'paid']);

            if (ordersData && ordersData.length > 0) {
              ordersData.forEach((o: any) => {
                if (o.game_id) newUnlocked.add(o.game_id);
                if (o.product_id) newUnlocked.add(o.product_id);
              });
            }
          } catch {}

          try {
            const { data: legacyData } = await supabase
              .from('payment_orders')
              .select('post_id')
              .or(`phone_number.eq.${clean},phone_number.eq.${local}`)
              .in('status', ['approved', 'completed', 'paid']);

            if (legacyData && legacyData.length > 0) {
              legacyData.forEach((d: any) => {
                if (d.post_id) newUnlocked.add(d.post_id);
              });
            }
          } catch {}

          if (newUnlocked.size > 0) {
            setUnlockedGameIds(newUnlocked);
            localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(newUnlocked)));
          }
        }
      } catch (e) {}
    };

    syncUserAuthAndVault();

    const handleLogout = () => {
      setIsRegistered(false);
      setRegisteredName('');
      setUnlockedGameIds(new Set());
    };

    const handleOrderUnlockedEvent = (e: any) => {
      const targetId = e?.detail?.game_id || e?.detail?.productId || e?.detail?.product_id;
      if (targetId) {
        setUnlockedGameIds((prev) => {
          const next = new Set(prev);
          next.add(targetId);
          localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(next)));
          return next;
        });
      }
    };

    window.addEventListener('cpcg_auth_change', syncUserAuthAndVault);
    window.addEventListener('cpcg_logout_reset', handleLogout);
    window.addEventListener('cpcg_order_unlocked', handleOrderUnlockedEvent);

    return () => {
      window.removeEventListener('cpcg_auth_change', syncUserAuthAndVault);
      window.removeEventListener('cpcg_logout_reset', handleLogout);
      window.removeEventListener('cpcg_order_unlocked', handleOrderUnlockedEvent);
    };
  }, [supabase]);

  const handleCheckoutSuccess = (order: any) => {
    if (order?.game_id) {
      setUnlockedGameIds((prev) => {
        const next = new Set(prev);
        next.add(order.game_id);
        localStorage.setItem('cpcg_unlocked_games', JSON.stringify(Array.from(next)));
        return next;
      });
    }
  };

  const handleRegistrationSuccess = (name: string, phone: string) => {
    localStorage.setItem('cpcg_registered', JSON.stringify({ name, phone }));
    localStorage.setItem('cpcg_user_phone', phone);
    localStorage.setItem('cpcg_user_name', name);
    setIsRegistered(true);
    setRegisteredName(name);
    setShowRegisterModal(false);
    setShowCelebration(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cpcg_auth_change'));
    }
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const loadStorefrontData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      // 1. Primary: Fetch from high-speed cached /api/games endpoint
      let loadedGames: GameProduct[] = [];
      try {
        const res = await fetch('/api/games', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.games) && json.games.length > 0) {
            loadedGames = json.games;
          }
        }
      } catch (apiErr) {
        console.warn('/api/games fetch error, attempting direct supabase fallback:', apiErr);
      }

      // 2. Secondary Fallback: Direct Supabase query if /api/games returned empty
      if (loadedGames.length === 0) {
        let postsData: any[] | null = null;
        try {
          const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && data) postsData = data;
        } catch (e) {}

        if (postsData && postsData.length > 0) {
          postsData.forEach((p) => {
            if (p.status === 'draft' || p.status === 'archived') return;
            const dur = p.plan_duration || p.access_duration || p.license_duration || (p.duration_days ? `${p.duration_days} Days` : 'Lifetime');
            loadedGames.push({
              id: p.id,
              title: p.title || 'Untitled Game',
              description: p.description || '',
              cover_image: p.image_url || p.cover_image || 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
              price: Number(p.price || 0),
              rating: Number(p.rating || 4.9),
              category: p.category || 'PC Games',
              tags: ['Chidy Prime', 'Tanzania'],
              status: p.status || 'published',
              is_new_feed: Boolean(p.is_new_feed),
              download_url: (Array.isArray(p.links) && p.links[0]?.url) || p.download_url,
              links: p.links || [],
              access_duration: dur,
              license_duration: dur,
              plan_duration: dur,
            } as any);
          });
        }
      }

      if (loadedGames.length > 0) {
        setGames(loadedGames);
      }

      // Load CMS Hero Slides
      try {
        const res = await fetch('/api/admin/cms/slides');
        const data = await res.json();
        if (data.success && Array.isArray(data.slides) && data.slides.length > 0) {
          const activeSlides = data.slides.filter((s: any) => s.is_active !== false);
          if (activeSlides.length > 0) {
            setSlides(activeSlides);
          }
        }
      } catch (err) {
        console.error('Failed to load slides:', err);
      }

      // Load CMS Categories
      try {
        const { data: categoriesData, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_visible', true)
          .order('display_order', { ascending: true });
        if (!error && categoriesData && categoriesData.length > 0) {
          setCategories(categoriesData);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }

      // Load Store Background Settings
      try {
        const { data: settingsData, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('key', 'custom_background')
          .single();
        if (!error && settingsData?.value) {
          setBgSettings({
            enabled: settingsData.value.enabled ?? true,
            image_url: settingsData.value.image_url || '/game_controller_bg.jpg',
            opacity: settingsData.value.opacity ?? 0.45,
          });
        }
      } catch (err) {
        console.error('Failed to load custom background:', err);
      }

      // Load Slideshow Duration Settings
      try {
        const { data: slideshowData, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('key', 'slideshow_settings')
          .single();
        if (!error && slideshowData?.value?.interval) {
          setSlideshowInterval(Number(slideshowData.value.interval) * 1000);
        }
      } catch (e) {}

    } catch (err) {
      console.error('Failed to load store data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadStorefrontData(true);

    const postsSub = supabase
      .channel('storefront_posts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        loadStorefrontData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadStorefrontData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        loadStorefrontData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slides' }, () => {
        loadStorefrontData(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsSub);
    };
  }, [loadStorefrontData, supabase]);

  const handleBuyNow = (game: GameProduct) => {
    setCheckoutGame(game);
  };

  return (
    <>
      <BackgroundOverlay
        imageUrl={bgSettings.image_url}
        opacity={bgSettings.opacity}
        enabled={bgSettings.enabled}
      />

      <Navbar
        onSearchChange={(q) => setSearchQuery(q)}
        games={games}
      />

      <main className="main-storefront-wrapper relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 md:pt-8 md:pb-8 space-y-8 sm:space-y-10">
        {/* Style Tag to hide scrollbars cleanly */}
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>

        {/* Hero Slideshow Section */}
        {loading ? (
          <div className="w-full h-[340px] bg-slate-900 border border-slate-800 animate-pulse rounded-3xl" />
        ) : (
          <HeroSlideshow 
            slides={slides.length > 0 ? slides : undefined} 
            intervalMs={slideshowInterval}
          />
        )}

        {/* ── Main Storefront Games Catalog Feed ── */}
        <GameCatalog
          games={games}
          categories={categories}
          searchQuery={searchQuery}
          fixedCategory={null}
          onBuyNow={handleBuyNow}
          unlockedGameIds={unlockedGameIds}
          onBack={() => setSearchQuery('')}
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

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={handleRegistrationSuccess}
      />

      <CelebrationPopup
        isVisible={showCelebration}
        userName={registeredName}
      />
    </>
  );
}
