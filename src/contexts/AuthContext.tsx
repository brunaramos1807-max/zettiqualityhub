'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { createClient } from '../lib/supabase/client';

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Known admin emails — always allowed regardless of pre_registered_users table
const ADMIN_EMAILS = ['brunaramos1807@gmail.com', 'bruna.silva@zetti.tech', 'admin@zetti.com.br'];

// Check if an email is in the pre_registered_users whitelist
async function isEmailWhitelisted(supabase: any, email: string): Promise<boolean> {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();

  // Admin emails are always allowed
  if (ADMIN_EMAILS.includes(normalizedEmail)) return true;

  try {
    const { data, error } = await supabase
      .from('pre_registered_users')
      .select('id, is_active')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('[AUTH] Whitelist check error:', error.message);
      // On DB error, allow admin emails only (already handled above)
      return false;
    }

    return !!(data && data.is_active !== false);
  } catch (err) {
    console.error('[AUTH] Whitelist check exception:', err);
    return false;
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ full_name: string; role: string; avatar?: string } | null>(null);

  // Derive profile from auth user — no DB call needed for basic display
  const deriveProfile = (authUser: User | null) => {
    if (!authUser) { setUserProfile(null); return; }
    const email: string = authUser.email || '';
    const metaName: string = authUser.user_metadata?.full_name || '';
    const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'Admin' : 'Usuário';
    const displayName = metaName || email.split('@')[0] || 'Usuário';
    setUserProfile({ full_name: displayName, role });
  };

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      deriveProfile(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      // On sign-in, verify whitelist
      if (_event === 'SIGNED_IN' && session?.user) {
        const allowed = await isEmailWhitelisted(supabase, session.user.email || '');
        if (!allowed) {
          console.warn('[AUTH] Email not whitelisted, signing out:', session.user.email);
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          setUserProfile(null);
          return;
        }
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      deriveProfile(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Email/Password Sign Up
  const signUp = async (email: string, password: string, metadata = {}) => {
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: (metadata as any)?.fullName || '',
          avatar_url: (metadata as any)?.avatarUrl || ''
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
    return data;
  };

  // Email/Password Sign In
  const signIn = async (email: string, password: string) => {
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  // Sign Out
  const signOut = async () => {
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase client not available');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Get Current User
  const getCurrentUser = async () => {
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase client not available');
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  // Check if Email is Verified
  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  // Get User Profile from Database
  const getUserProfile = async () => {
    if (!user) return null;
    const supabase = createClient();
    if (!supabase) throw new Error('Supabase client not available');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    loading,
    userProfile,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
