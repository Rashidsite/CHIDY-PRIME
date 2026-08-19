'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  role: string | null;
  status: string | null;
  created_at?: string;
  last_sign_in_at?: string;
}

export type UserProfile = Profile;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  phone?: string;
  isLoggedIn?: boolean;
  signOut: () => Promise<void>;
  logout?: () => void;
  refreshProfile: () => Promise<void>;
  syncPhoneAuth: (name: string, phone: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  phone: '',
  isLoggedIn: false,
  signOut: async () => {},
  logout: () => {},
  refreshProfile: async () => {},
  syncPhoneAuth: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadLocalProfile = useCallback(() => {
    try {
      const saved = localStorage.getItem('cpcg_registered');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone || parsed.name) {
          const userPhone = parsed.phone || '0700000000';
          const userName = parsed.name || `User-${userPhone}`;
          setProfile((prev) => prev || {
            id: `user_${userPhone}`,
            full_name: userName,
            phone_number: userPhone,
            role: 'user',
            status: 'active',
          });
        }
      }
    } catch (e) {}
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setProfile(data);
      } else {
        loadLocalProfile();
      }
    } catch (err) {
      loadLocalProfile();
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    } else {
      loadLocalProfile();
    }
  };

  const syncPhoneAuth = useCallback((name: string, phone: string) => {
    const cleanPhone = phone.trim();
    const cleanName = name.trim() || `User-${cleanPhone}`;
    
    try {
      localStorage.setItem('cpcg_registered', JSON.stringify({ name: cleanName, phone: cleanPhone }));
      localStorage.setItem('cpcg_user_phone', cleanPhone);
      localStorage.setItem('cpcg_user_name', cleanName);
    } catch (e) {}

    setProfile({
      id: `user_${cleanPhone}`,
      full_name: cleanName,
      phone_number: cleanPhone,
      role: 'user',
      status: 'active',
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cpcg_auth_change'));
    }
  }, []);

  useEffect(() => {
    // Initial Session & Local Storage Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        fetchProfile(session.user.id);
      } else {
        loadLocalProfile();
      }
      setLoading(false);
    });

    // Realtime Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user?.id) {
        await fetchProfile(currentSession.user.id);
      } else {
        loadLocalProfile();
      }
      setLoading(false);
    });

    // Custom Event Listener for instant sync without reload
    const handleAuthChangeEvent = () => {
      loadLocalProfile();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('cpcg_auth_change', handleAuthChangeEvent);
    }

    return () => {
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('cpcg_auth_change', handleAuthChangeEvent);
      }
    };
  }, [supabase, loadLocalProfile]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}

    try {
      localStorage.removeItem('cpcg_registered');
      localStorage.removeItem('cpcg_user_phone');
      localStorage.removeItem('cpcg_user_name');
      localStorage.removeItem('cpcg_user_registered');
      localStorage.removeItem('cpcg_unlocked_games');
      localStorage.removeItem('cpcg_active_order_id');
      localStorage.removeItem('cpcg_active_game_id');
      sessionStorage.clear();
    } catch (e) {}

    setUser(null);
    setProfile(null);
    setSession(null);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cpcg_auth_change'));
      window.dispatchEvent(new CustomEvent('cpcg_logout_reset'));
    }

    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        phone: profile?.phone_number || '',
        isLoggedIn: !!profile || !!user,
        signOut,
        logout: signOut,
        refreshProfile,
        syncPhoneAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
