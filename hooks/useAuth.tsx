import type { Session } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { pullRemoteRides, syncPendingRides } from '@/services/rides';

const GUEST_KEY = 'guest';
const NOT_CONFIGURED = 'Accounts are off: add your Supabase keys to .env (see README).';

interface AuthContextValue {
  ready: boolean;
  session: Session | null;
  isGuest: boolean;
  /** false when no Supabase keys are set; the app is then local-only. */
  configured: boolean;
  setGuest: (guest: boolean) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [isGuest, setIsGuest] = useState(() => Storage.getItemSync(GUEST_KEY) === '1');

  useEffect(() => {
    if (!supabase) return;
    // Fires INITIAL_SESSION right away. Only set state here: Supabase calls inside this callback can deadlock.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    pullRemoteRides()
      .then(syncPendingRides)
      .catch(() => {}); // offline: rides stay queued and sync on the next start
  }, [userId]);

  const setGuest = (guest: boolean) => {
    if (guest) Storage.setItemSync(GUEST_KEY, '1');
    else Storage.removeItemSync(GUEST_KEY);
    setIsGuest(guest);
  };

  const value: AuthContextValue = {
    ready,
    session,
    isGuest,
    configured: supabase != null,
    setGuest,
    async signIn(email, password) {
      if (!supabase) return NOT_CONFIGURED;
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (!error) setGuest(false);
      return error?.message ?? null;
    },
    async signUp(email, password) {
      if (!supabase) return { error: NOT_CONFIGURED, needsConfirmation: false };
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (!error && data.session) setGuest(false);
      return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
    },
    async signOut() {
      await supabase?.auth.signOut();
      setGuest(false);
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
