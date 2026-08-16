import type { Metadata } from 'next';
import './globals.css';
import React from 'react';
import Link from 'next/link';
import { Gamepad2, ShieldCheck, Zap, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'chidyprime — Premier Digital Game Store & Bus Mods',
  description: 'Production-grade digital game store featuring PC games, Maleo Bus Mods TZ, instant automated mobile payments, and time-sensitive direct downloads.',
  keywords: ['chidyprime', 'bus simulator indonesia', 'maleo bus mod tz', 'pc games', 'digital game store', 'tanzania mods'],
  openGraph: {
    title: 'chidyprime — Premier Digital Game Store',
    description: 'Instant automated mobile payment delivery for digital games and simulator mods.',
    url: 'https://chidyprime.com',
    siteName: 'chidyprime',
    images: [
      {
        url: 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
        width: 1200,
        height: 630,
        alt: 'chidyprime Digital Game Store',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen flex flex-col justify-between bg-background text-foreground antialiased selection:bg-brand-500 selection:text-white">
        
        {/* Main Content Viewport */}
        <div className="relative z-10 flex-1">
          {children}
        </div>

        {/* Global Store Footer */}
        <footer className="relative z-10 border-t border-glass-border bg-slate-950/80 backdrop-blur-md mt-16 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Column 1: Brand Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-glow">
                  <Gamepad2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white tracking-tight">
                  chidy<span className="text-accent-cyan">prime</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ultra-fast mobile-first digital game store delivering verified activation keys and instant download links.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Store Navigation</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><Link href="/" className="hover:text-white transition-colors">Catalog Overview</Link></li>
                <li><Link href="/#catalog" className="hover:text-white transition-colors">Maleo Bus Mods TZ</Link></li>
                <li><Link href="/orders" className="hover:text-white transition-colors">Digital Order History</Link></li>
                <li><Link href="/auth/login" className="hover:text-white transition-colors">Account Login</Link></li>
              </ul>
            </div>

            {/* Column 3: Payment & Security */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Automated Payments</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-accent-cyan" /> M-Pesa STK Push</li>
                <li className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-accent-purple" /> PressoPay Gateway</li>
                <li className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> HarakaPay Checkout</li>
                <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> SSL Encrypted Checkout</li>
              </ul>
            </div>

            {/* Column 4: Copyright */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Legal & Support</h4>
              <p className="text-xs text-slate-400">
                &copy; {new Date().getFullYear()} chidyprime. All Rights Reserved.
              </p>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-2">
                <span>Crafted for gamers with</span>
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              </div>
            </div>

          </div>
        </footer>
      </body>
    </html>
  );
}
