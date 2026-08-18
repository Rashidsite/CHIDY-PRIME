'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Lock, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { phoneToAuthEmail, normalizePhoneNumber } from '@/lib/auth-helper';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (name: string, phone: string) => void;
}

export default function RegisterModal({ isOpen, onClose, onSuccess }: RegisterModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('07');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; password?: string; general?: string }>({});

  const supabase = createClient();

  const validate = () => {
    const e: { name?: string; phone?: string; password?: string } = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Weka jina lako kamili';
    if (!phone.trim() || phone.trim().length < 8) e.phone = 'Weka namba sahihi ya simu';
    if (!password || password.length < 6) e.password = 'Nywila lazima iwe na angalau tarakimu 6';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      const authEmail = phoneToAuthEmail(phone);

      const { data, error: authErr } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            full_name: name,
            phone_number: normalizedPhone,
            role: 'user',
          },
        },
      });

      if (authErr) throw authErr;

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: name,
          phone_number: normalizedPhone,
          status: 'active',
          last_sign_in_at: new Date().toISOString(),
        });
      }

      // Dispatch Telegram registration alert
      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: normalizedPhone }),
      }).catch(() => {});

      onSuccess(name.trim(), normalizedPhone);
    } catch (err: any) {
      setErrors({ general: err.message || 'Usajili umeshindwa. Jaribu tena.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(16,185,129,0.4)]"
            style={{ background: '#000', border: '2px solid #10b981' }}
          >
            {/* Header */}
            <div className="relative px-6 pt-7 pb-5 text-center"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))' }}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.6)]">
                <span className="text-2xl">🎮</span>
              </div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Jisajili Na Namba Ya Simu!</h2>
              <p className="text-xs text-emerald-400 mt-1 font-bold">
                Bila haja ya Email — Weka Simu na Nywila
              </p>
            </div>

            {errors.general && (
              <div className="mx-6 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                ⚠️ {errors.general}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3.5">
              
              {/* Full Name */}
              <div>
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block mb-1">
                  Jina Lako Kamili (Username)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((er) => ({ ...er, name: undefined })); }}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-xs text-white placeholder-slate-500 font-bold focus:outline-none transition-all"
                    style={{
                      background: '#111',
                      border: errors.name ? '2px solid #ef4444' : '2px solid rgba(16,185,129,0.4)',
                    }}
                  />
                </div>
                {errors.name && <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.name}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block mb-1">
                  Namba ya Simu
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setErrors((er) => ({ ...er, phone: undefined })); }}
                    placeholder="0712345678"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-xs text-white placeholder-slate-500 font-bold focus:outline-none transition-all"
                    style={{
                      background: '#111',
                      border: errors.phone ? '2px solid #ef4444' : '2px solid rgba(16,185,129,0.4)',
                    }}
                  />
                </div>
                {errors.phone && <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.phone}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block mb-1">
                  Nywila (Password)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((er) => ({ ...er, password: undefined })); }}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-xs text-white placeholder-slate-500 font-bold focus:outline-none transition-all"
                    style={{
                      background: '#111',
                      border: errors.password ? '2px solid #ef4444' : '2px solid rgba(16,185,129,0.4)',
                    }}
                  />
                </div>
                {errors.password && <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.password}</p>}
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
                style={{
                  background: loading ? 'rgba(16,185,129,0.5)' : '#10b981',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(16,185,129,0.5)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Inajisajili...</span>
                  </>
                ) : (
                  <>
                    <span>JISAJILI SASA</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
