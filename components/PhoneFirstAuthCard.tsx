'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Gamepad2, 
  Phone, 
  Lock, 
  User, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { phoneToAuthEmail, normalizePhoneNumber } from '@/lib/auth-helper';

interface PhoneFirstAuthCardProps {
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
  redirectTo?: string;
}

export default function PhoneFirstAuthCard({
  initialMode = 'login',
  onSuccess,
  redirectTo,
}: PhoneFirstAuthCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const input = phoneOrEmail.trim();
    if (!input) {
      setError('Tafadhali weka namba yako ya simu au email.');
      return;
    }
    if (!password || password.length < 4) {
      setError('Weka PIN au Password yako (angalau tarakimu 4 au 6).');
      return;
    }

    setLoading(true);

    try {
      const isEmail = input.includes('@');
      const authEmail = isEmail ? input : phoneToAuthEmail(input);
      const normalizedPhone = isEmail ? '' : normalizePhoneNumber(input);

      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (authErr) {
        // Provide friendly message if invalid credentials
        if (authErr.message?.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Namba ya simu au PIN/Password siyo sahihi. Ikiwa hauna akaunti, tafadhali bofya "Jisajili".');
        }
        throw authErr;
      }

      if (data?.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        const userPhone = profile?.phone_number || normalizedPhone || data.user.phone || '';
        const userName = profile?.full_name || data.user.user_metadata?.full_name || name || `Gamer-${userPhone.slice(-4)}`;

        // Sync local storage
        if (userPhone) {
          localStorage.setItem('cpcg_user_phone', userPhone);
        }
        localStorage.setItem('cpcg_user_name', userName);
        localStorage.setItem('cpcg_registered', JSON.stringify({ name: userName, phone: userPhone }));
        localStorage.setItem('cpcg_user_registered', 'true');

        // Populate unlocked games from approved orders
        if (userPhone) {
          try {
            const digits = userPhone.replace(/\D/g, '');
            const clean = digits.startsWith('0') ? '255' + digits.slice(1) : (digits.startsWith('255') ? digits : '255' + digits);
            const local = clean.startsWith('255') ? '0' + clean.slice(3) : clean;

            const { data: approvedOrders } = await supabase
              .from('payment_orders')
              .select('post_id')
              .or(`phone_number.eq.${clean},phone_number.eq.${local}`)
              .in('status', ['approved', 'completed', 'paid']);

            if (approvedOrders && approvedOrders.length > 0) {
              const unlockedIds = approvedOrders.map((o: any) => String(o.post_id)).filter(Boolean);
              localStorage.setItem('cpcg_unlocked_games', JSON.stringify(unlockedIds));
            } else {
              localStorage.removeItem('cpcg_unlocked_games');
            }
          } catch (e) {}
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cpcg_auth_change'));
        }

        setSuccessMsg('Umefanikiwa kuingia! Tunaelekea kwenye dashibodi...');

        if (onSuccess) {
          onSuccess();
        } else if (redirectTo) {
          router.push(redirectTo);
        } else if (profile?.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/orders');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Kuingia kumeshindwa. Tafadhali hakiki taarifa zako.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const inputName = name.trim();
    const inputPhone = phoneOrEmail.trim();

    if (!inputName || inputName.length < 2) {
      setError('Tafadhali weka jina lako kamili.');
      return;
    }
    if (!inputPhone || inputPhone.length < 9) {
      setError('Tafadhali weka namba sahihi ya simu (mfano 07XXXXXXXX au 06XXXXXXXX).');
      return;
    }
    if (!password || password.length < 6) {
      setError('PIN / Nywila lazima iwe na angalau herufi au tarakimu 6.');
      return;
    }

    setLoading(true);

    try {
      const isEmail = inputPhone.includes('@');
      const authEmail = isEmail ? inputPhone : phoneToAuthEmail(inputPhone);
      const normalizedPhone = isEmail ? '' : normalizePhoneNumber(inputPhone);

      const { data, error: authErr } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            full_name: inputName,
            phone_number: normalizedPhone,
            role: 'user',
          },
        },
      });

      if (authErr) {
        if (authErr.message?.toLowerCase().includes('already registered')) {
          throw new Error('Namba hii ya simu tayari imeshasajiliwa. Tafadhali bofya "Ingia (Login)".');
        }
        throw authErr;
      }

      if (data?.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: inputName,
          phone_number: normalizedPhone,
          status: 'active',
          last_sign_in_at: new Date().toISOString(),
        });

        // Store local state
        localStorage.setItem('cpcg_user_phone', normalizedPhone);
        localStorage.setItem('cpcg_user_name', inputName);
        localStorage.setItem('cpcg_registered', JSON.stringify({ name: inputName, phone: normalizedPhone }));
        localStorage.setItem('cpcg_user_registered', 'true');

        // Alert backend
        fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: inputName, phone: normalizedPhone }),
        }).catch(() => {});

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cpcg_auth_change'));
        }

        setSuccessMsg('Usajili umekamilika kikamilifu! Karibu CHIDYPRIME.');

        if (onSuccess) {
          onSuccess();
        } else if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.push('/front');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Usajili umeshindwa. Tafadhali jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl bg-[#0B111E]/95 border border-slate-800 backdrop-blur-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] overflow-hidden">
      
      {/* ── BRAND HEADER ── */}
      <div className="relative px-6 pt-7 pb-5 text-center border-b border-slate-800/80 bg-gradient-to-b from-blue-950/30 to-transparent">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-wider mb-3 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
          <Sparkles className="w-3 h-3 animate-pulse text-cyan-400" />
          <span>Karibu Gamer • CHIDYPRIME HQ</span>
        </div>

        <div className="flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <span className="text-xl font-black text-white tracking-tight uppercase block leading-none">
              chidy<span className="text-cyan-400">prime</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              x CHIDYGAMING
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-medium mt-3">
          {mode === 'login' 
            ? 'Ingia kwa Namba ya Simu au Email kupata games zako na downloads papo hapo.' 
            : 'Jisajili kwa Namba ya Simu — Hakuna haja ya kukumbuka barua pepe (Email)!'}
        </p>
      </div>

      {/* ── TABS SWITCHER ── */}
      <div className="grid grid-cols-2 p-1.5 m-5 mb-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-black uppercase tracking-wider">
        <button
          type="button"
          onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
          className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mode === 'login'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🔑 Ingia (Login)</span>
        </button>

        <button
          type="button"
          onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
          className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mode === 'register'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🎮 Jisajili (Register)</span>
        </button>
      </div>

      {/* ── FEEDBACK ALERTS ── */}
      {error && (
        <div className="mx-6 mb-3 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mx-6 mb-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── AUTH FORM ── */}
      <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="px-6 pb-6 space-y-4">
        
        {/* Register: Full Name */}
        {mode === 'register' && (
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
              Jina Lako (Username / Full Name)
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mfano: Chidy Master"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-bold"
                required
              />
              <User className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
            </div>
          </div>
        )}

        {/* Phone or Email */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
            {mode === 'login' ? 'Namba ya Simu au Email' : 'Namba ya Simu (M-Pesa / TigoPesa)'}
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-3 flex items-center gap-1.5 text-slate-400 pointer-events-none">
              <span className="text-sm">🇹🇿</span>
              <Phone className="w-4 h-4 text-cyan-400" />
            </div>
            <input
              type={mode === 'login' ? 'text' : 'tel'}
              value={phoneOrEmail}
              onChange={(e) => setPhoneOrEmail(e.target.value)}
              placeholder="07XXXXXXXX au 06XXXXXXXX"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-16 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-bold tracking-wide"
              required
            />
          </div>
        </div>

        {/* Password / PIN */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
            {mode === 'login' ? 'PIN au Nenosiri (Password)' : 'Weka PIN / Nywila ya Akaunti'}
          </label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'login' ? '••••••••' : 'Angalau tarakimu 6 (Mfano: 123456)'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-bold"
              required
            />
            <Lock className="w-4 h-4 text-blue-400 absolute left-3.5 top-3.5" />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 rounded-2xl text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50 ${
            mode === 'login'
              ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 shadow-[0_0_20px_rgba(37,99,235,0.4)]'
              : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Inathibitisha...</span>
            </>
          ) : mode === 'login' ? (
            <>
              <Zap className="w-4 h-4" />
              <span>⚡ Ingia Kwenye Akaunti</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <Gamepad2 className="w-4 h-4" />
              <span>🎮 Kamilisha Usajili Sasa</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Security badge */}
        <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Salama • Namba yako inatumika kukabidhi michezo pekee</span>
        </div>

      </form>
    </div>
  );
}