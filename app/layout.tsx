import type { Metadata, Viewport } from 'next';
import './globals.css';
import React from 'react';
import { PWAProvider } from '@/components/PWAProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { CMSThemeProvider } from '@/components/CMSThemeProvider';
import ContentProtectionGuard from '@/components/ContentProtectionGuard';
import MobileBottomNav from '@/components/MobileBottomNav';
import StorefrontFooter from '@/components/StorefrontFooter';

export const metadata: Metadata = {
  metadataBase: new URL('https://chidyprimetz.com'),
  title: 'Chidy Prime TZ — CHIDYPRIME x CHIDYGAMING Digital Store & Mods',
  description: 'Duka rasmi la Chidy Prime & Chidy Gaming Tanzania. Pakua Maleo Bus Mods TZ (Shabiby, BM, Yutong), PC Games, PS2 Android Games na activation keys papo hapo.',
  keywords: [
    'chidy prime',
    'chidyprime',
    'chidygaming',
    'chidy prime tz',
    'chidyprimetz',
    'chidy prime feat chidygaming',
    'maleo bus mod tz',
    'bus simulator indonesia tanzania',
    'tanzania bus mods',
    'ps2 games kwenye simu',
    'pc games tanzania',
  ],
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://chidyprimetz.com',
  },
  openGraph: {
    title: 'Chidy Prime TZ — CHIDYPRIME x CHIDYGAMING Official Digital Store',
    description: 'Duka rasmi la Chidy Prime & Chidy Gaming Tanzania. Maleo Bus Mods TZ, PC & Mobile Games, automated mobile STK push.',
    url: 'https://chidyprimetz.com',
    siteName: 'Chidy Prime TZ',
    images: [
      {
        url: 'https://i.ibb.co/NgsBS6n3/1477df4acfe4.jpg',
        width: 1200,
        height: 630,
        alt: 'Chidy Prime TZ Digital Store',
      },
    ],
    locale: 'sw_TZ',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://dykkgqyrhgjtosifkpmn.supabase.co" />
        <link rel="dns-prefetch" href="https://dykkgqyrhgjtosifkpmn.supabase.co" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CHIDYPRIME" />
      </head>
      <body className="min-h-screen flex flex-col justify-between bg-black text-foreground antialiased selection:bg-emerald-500 selection:text-black pb-16 md:pb-0">
        <ContentProtectionGuard />
        <AuthProvider>
          <PWAProvider>
            <CMSThemeProvider>
              <div className="relative z-10 flex-1">
                {children}
              </div>
              <MobileBottomNav />
              <StorefrontFooter />
            </CMSThemeProvider>
          </PWAProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
