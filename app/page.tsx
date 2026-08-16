'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import HeroSlideshow from '@/components/HeroSlideshow';
import GameCatalog from '@/components/GameCatalog';
import CartDrawer from '@/components/CartDrawer';
import CheckoutModal from '@/components/CheckoutModal';
import BackgroundOverlay from '@/components/BackgroundOverlay';
import { GameProduct } from '@/components/GameCard';
import { createClient } from '@/lib/supabase/client';

export default function StorefrontPage() {
  const [games, setGames] = useState<GameProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<GameProduct[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutGame, setCheckoutGame] = useState<GameProduct | null>(null);
  const [bgSettings, setBgSettings] = useState<{ enabled: boolean; image_url: string; opacity: number }>({
    enabled: false,
    image_url: '',
    opacity: 0.3,
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadStorefrontData() {
      setLoading(true);
      try {
        // 1. Fetch Games from `games` table or fallback `posts` table
        const { data: gamesData, error: gamesErr } = await supabase
          .from('games')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (gamesData && gamesData.length > 0) {
          setGames(gamesData);
        } else {
          // Fetch from existing `posts` table
          const { data: postsData } = await supabase
            .from('posts')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false });

          if (postsData) {
            const mappedPosts: GameProduct[] = postsData.map((p) => ({
              id: p.id,
              title: p.title,
              description: p.description,
              cover_image: p.image_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f',
              price: p.price || 0,
              rating: p.rating || 4.8,
              category: p.category || 'MALEO BUS MODE TZ',
              tags: ['Bus Mod', 'Tanzania', 'Realistic'],
              status: p.status,
            }));
            setGames(mappedPosts);
          }
        }

        // 2. Fetch Store Settings for Custom Background Overlay
        const { data: settingsData } = await supabase
          .from('store_settings')
          .select('*')
          .eq('key', 'custom_background')
          .single();

        if (settingsData?.value) {
          setBgSettings(settingsData.value);
        }
      } catch (err) {
        console.error('Failed to load store data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStorefrontData();

    // Load persisted cart from localStorage
    const savedCart = localStorage.getItem('chidyprime_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {}
    }
  }, [supabase]);

  const handleAddToCart = (game: GameProduct) => {
    if (!cart.some((item) => item.id === game.id)) {
      const updated = [...cart, game];
      setCart(updated);
      localStorage.setItem('chidyprime_cart', JSON.stringify(updated));
    }
    setCartOpen(true);
  };

  const handleRemoveFromCart = (id: string) => {
    const updated = cart.filter((item) => item.id !== id);
    setCart(updated);
    localStorage.setItem('chidyprime_cart', JSON.stringify(updated));
  };

  const handleClearCart = () => {
    setCart([]);
    localStorage.removeItem('chidyprime_cart');
  };

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
        cartCount={cart.length}
        onOpenCart={() => setCartOpen(true)}
        onSearchChange={(q) => setSearchQuery(q)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">
        {/* Dynamic Hero Section */}
        <HeroSlideshow />

        {/* Storefront Catalog Section */}
        <GameCatalog
          games={games}
          searchQuery={searchQuery}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      </main>

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onCheckout={() => {
          if (cart.length > 0) {
            setCheckoutGame(cart[0]);
            setCartOpen(false);
          }
        }}
      />

      {/* Checkout Modal */}
      {checkoutGame && (
        <CheckoutModal
          isOpen={!!checkoutGame}
          onClose={() => setCheckoutGame(null)}
          game={checkoutGame}
        />
      )}
    </>
  );
}
