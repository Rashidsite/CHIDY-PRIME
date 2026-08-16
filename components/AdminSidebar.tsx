'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Gamepad2, 
  ShoppingBag, 
  Users, 
  Settings, 
  Store, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/admin/dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
    { href: '/admin/games', label: 'Game Catalog (CRUD)', icon: Gamepad2 },
    { href: '/admin/orders', label: 'Orders & Transactions', icon: ShoppingBag },
    { href: '/admin/users', label: 'Users & Roles', icon: Users },
    { href: '/admin/settings', label: 'Store Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div className="space-y-6">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-purple to-brand-600 flex items-center justify-center shadow-glow">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">chidyprime</h2>
            <span className="text-[11px] font-semibold text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full border border-accent-purple/20">
              Admin Portal
            </span>
          </div>
        </div>

        {/* Links */}
        <nav className="space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-brand-600 text-white shadow-glow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Return to Storefront */}
      <div className="pt-4 border-t border-slate-800">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 hover:text-white transition-all"
        >
          <Store className="w-4 h-4 text-accent-cyan" />
          <span>Back to Storefront</span>
        </Link>
      </div>
    </aside>
  );
}
