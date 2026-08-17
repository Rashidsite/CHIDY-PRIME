'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Users, ShieldCheck, Search, Activity, Archive, UserCheck, RefreshCw, ShoppingBag, Banknote } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';

// Swahili/Tanzania phone number formatter (+255 789 123 456)
function formatPhone(phone: string) {
  if (!phone || phone === 'N/A') return 'N/A';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('255') && cleaned.length === 12) {
    return `+255 ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+255 ${cleaned.substring(1, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  }
  if (cleaned.length === 9) {
    return `+255 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  return phone;
}

// DateTime formatter: e.g. 12 Aug 2026, 04:30 PM
function formatDateTime(dateString: string) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = hours.toString().padStart(2, '0') + ':' + minutes + ' ' + ampm;

  return `${day} ${month} ${year}, ${strTime}`;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [runningCron, setRunningCron] = useState(false);

  const supabase = createClient();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel('admin_users_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_orders' }, () => fetchUsers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update role');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Role update failed');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'archived' ? 'active' : 'archived';
    const confirmMsg = newStatus === 'archived' 
      ? 'Je, una uhakika unataka kumweka mtumiaji huyu kwenye kumbukumbu (Archive)? Hatafutwa, lakini account itasimamishwa.'
      : 'Je, una uhakika unataka kumrudisha mtumiaji huyu kuwa hai (Activate)?';
      
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update status');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleRunArchivingCron = async () => {
    if (!confirm('Je, unataka kuendesha kazi ya ukaguzi wa akaundi zisizo hai (Inactive for 180 days) sasa hivi?')) return;
    setRunningCron(true);
    try {
      const res = await fetch('/api/cron/archive-inactive-users', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Kazi imekamilika! Akaunti ${data.archived_count} zilizokuwa inactive kwa miezi 6+ zimehifadhiwa (archived).`);
        fetchUsers();
      } else {
        throw new Error(data.error || 'Cron failed');
      }
    } catch (err: any) {
      alert(`Kazi imeshindwa: ${err.message}`);
    } finally {
      setRunningCron(false);
    }
  };

  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status !== 'archived').length;
    const archived = users.filter((u) => u.status === 'archived').length;
    return { total, active, archived };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter === 'active' && u.status === 'archived') return false;
      if (statusFilter === 'archived' && u.status !== 'archived') return false;

      const query = search.toLowerCase();
      const emailMatch = (u.email || '').toLowerCase().includes(query);
      const nameMatch = (u.full_name || '').toLowerCase().includes(query);
      const phoneMatch = (u.phone_number || '').toLowerCase().includes(query);
      
      return emailMatch || nameMatch || phoneMatch;
    });
  }, [users, statusFilter, search]);

  return (
    <div className="space-y-8 max-w-7xl">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 uppercase">
            <Users className="w-8 h-8 text-blue-500" />
            <span>User Accounts &amp; Customer Directory</span>
          </h1>
          <p className="text-sm font-semibold text-slate-300 mt-1">
            Orodha kamili ya wateja walionunua na watumiaji waliosajiliwa kwenye mfumo.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-blue-400" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Top Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Registered Users</span>
            <span className="text-2xl font-black text-white">{metrics.total}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Accounts</span>
            <span className="text-2xl font-black text-white">{metrics.active}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
            <Archive className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Archived Accounts</span>
            <span className="text-2xl font-black text-white">{metrics.archived}</span>
          </div>
        </div>
      </div>

      {/* Controls: Filters + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-950 border border-slate-800 w-fit">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Accounts ({metrics.total})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active ({metrics.active})
          </button>
          <button
            onClick={() => setStatusFilter('archived')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
              statusFilter === 'archived'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Archived ({metrics.archived})
          </button>
        </div>

        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Tafuta jina, namba ya simu, au email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-600 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </div>
      </div>

      {/* Users List Data Table */}
      {loading ? (
        <div className="text-slate-400 font-bold uppercase text-xs animate-pulse">Loading Registered Accounts...</div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-300 font-extrabold uppercase tracking-wider text-xs">
                  <th className="pb-3.5">Mteja / Jina</th>
                  <th className="pb-3.5">Namba ya Simu</th>
                  <th className="pb-3.5 text-center">Idadi ya Oda</th>
                  <th className="pb-3.5">Jumla ya Malipo</th>
                  <th className="pb-3.5">Tarehe ya Kujiunga</th>
                  <th className="pb-3.5">Role</th>
                  <th className="pb-3.5 text-center">Vitendo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 font-bold text-xs uppercase">
                      Hakuna wateja waliopatikana kwa sasa.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isArchived = u.status === 'archived';
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-4">
                          <p className="font-extrabold text-white text-sm max-w-[170px] truncate">{u.full_name || 'Mteja'}</p>
                          <p className="text-[11px] text-slate-500 font-mono truncate max-w-[170px]">{u.email}</p>
                        </td>
                        
                        <td className="py-4 font-mono font-bold text-blue-400 text-xs">{formatPhone(u.phone_number)}</td>
                        
                        <td className="py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300">
                            <ShoppingBag className="w-3 h-3 text-amber-400" />
                            <span>{u.orders_count || 1}</span>
                          </span>
                        </td>

                        <td className="py-4 font-black text-emerald-400 text-sm whitespace-nowrap">
                          {formatCurrency(u.total_spent || 0)}
                        </td>

                        <td className="py-4 text-slate-400 text-xs">{formatDateTime(u.created_at)}</td>
                        
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-full font-black uppercase text-[10px] tracking-wider border ${
                            u.role === 'admin'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}>
                            {u.role || 'user'}
                          </span>
                        </td>

                        <td className="py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleToggleRole(u.id, u.role)}
                              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-500 hover:text-blue-400 text-white font-extrabold text-[10px] uppercase flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                              title={`Badilisha kuwa ${u.role === 'admin' ? 'user' : 'admin'}`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                              <span>Role</span>
                            </button>

                            <button
                              onClick={() => handleToggleStatus(u.id, u.status)}
                              className={`px-3 py-1.5 rounded-lg border font-extrabold text-[10px] uppercase flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                                isArchived
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                  : 'bg-slate-950 hover:border-red-500 hover:text-red-400 text-white border-slate-800'
                              }`}
                              title={isArchived ? 'Activate' : 'Archive'}
                            >
                              {isArchived ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Activate</span>
                                </>
                              ) : (
                                <>
                                  <Archive className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Archive</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
