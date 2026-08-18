'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UserProfile {
  id?: string;
  full_name?: string;
  phone_number?: string;
  role?: string;
  status?: string;
}

interface AuthContextType {
  profile: UserProfile | null;
  phone: string;
  isLoggedIn: boolean;
  syncPhoneAuth: (name: string, phone: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  phone: '',
  isLoggedIn: false,
  syncPhoneAuth: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    try {
      const storedPhone = localStorage.getItem('cpcg_user_phone') || '';
      const storedName = localStorage.getItem('cpcg_user_name') || '';
      if (storedPhone) {
        setPhone(storedPhone);
        setProfile({
          full_name: storedName || `User-${storedPhone}`,
          phone_number: storedPhone,
          role: 'user',
        });
      }
    } catch {}

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setProfile(data);
              if (data.phone_number) setPhone(data.phone_number);
            }
          });
      }
    });
  }, [supabase]);

  const syncPhoneAuth = (name: string, cleanPhone: string) => {
    setPhone(cleanPhone);
    setProfile({
      full_name: name,
      phone_number: cleanPhone,
      role: 'user',
    });
    try {
      localStorage.setItem('cpcg_user_phone', cleanPhone);
      localStorage.setItem('cpcg_user_name', name);
    } catch {}
  };

  const logout = () => {
    setProfile(null);
    setPhone('');
    try {
      localStorage.removeItem('cpcg_user_phone');
      localStorage.removeItem('cpcg_user_name');
    } catch {}
    supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        phone,
        isLoggedIn: !!(phone || profile?.id),
        syncPhoneAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
