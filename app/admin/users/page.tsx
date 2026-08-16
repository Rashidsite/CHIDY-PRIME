'use client';

import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, UserCheck, Search, ShieldAlert } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const supabase = createClient();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (data) setUsers(data);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      fetchUsers();
    } catch (err) {
      alert('Role update failed');
    }
  };

  const filtered = users.filter((u) =>
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-accent-purple" />
            <span>User Accounts & RBAC Permissions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage registered accounts and toggle role permissions between User and Admin.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Filter users by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
      </div>

      <div className="p-6 rounded-3xl bg-glass-card border border-glass-border backdrop-blur-glass overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">User Email</th>
                <th className="pb-3">Full Name</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Joined Date</th>
                <th className="pb-3">RBAC Role Switcher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 font-bold text-white">{u.email}</td>
                  <td className="py-3 font-semibold text-slate-300">{u.full_name || 'N/A'}</td>
                  <td className="py-3">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      u.role === 'admin'
                        ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td className="py-3 text-slate-400">{formatDate(u.created_at)}</td>
                  <td className="py-3">
                    <button
                      onClick={() => handleToggleRole(u.id, u.role)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-brand-600 transition-colors font-bold text-[11px] flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-accent-cyan" />
                      <span>Switch to {u.role === 'admin' ? 'User' : 'Admin'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
