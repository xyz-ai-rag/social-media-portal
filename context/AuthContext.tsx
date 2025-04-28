'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { constructVercelURL } from '@/utils/generateURL';

interface User {
  id: string;
  email: string;
  user_metadata?: { name?: string; avatar_url?: string };
}

interface Business {
  business_id: string;
  business_name: string;
  search_keywords: string[];
  business_city: string;
  business_type: string;
  similar_businesses: string[];
}

interface ClientDetails {
  id: string;                 // your clientId
  client_name: string;
  registered_email: string;
  businesses: Business[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  clientDetails: ClientDetails | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // 1) Supabase auth listener + fetch clientDetails
  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        // console.log('[Auth] onAuthStateChange event:', _event, session);
        if (session?.user?.email) {
          const u = session.user;
          setUser({ id: u.id, email: u.email!, user_metadata: u.user_metadata as any });
          try {
            // console.log('[Auth] fetching clientDetails for', u.email);
            const resp = await fetch(
              constructVercelURL(`/api/client-details?email=${encodeURIComponent(u.email!)}`)
            );
            const json = await resp.json();
            // console.log('[Auth] clientDetails response:', resp.status, json);
            if (resp.ok) setClientDetails(json);
          } catch (err) {
            console.error('[Auth] fetchClientDetails error', err);
          }
        } else {
          // console.log('[Auth] no session, clearing user & details');
          setUser(null);
          setClientDetails(null);
        }
        setLoading(false);
      }
    );

    // bootstrap initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // console.log('[Auth] getSession:', session);
      if (session?.user?.email) {
        const u = session.user;
        setUser({ id: u.id, email: u.email!, user_metadata: u.user_metadata as any });
        fetch(
          constructVercelURL(`/api/client-details?email=${encodeURIComponent(u.email!)}`)
        )
          .then((r) => r.json())
          .then((d) => {
            // console.log('[Auth] initial clientDetails:', d);
            setClientDetails(d);
          })
          .catch((e) => console.error('[Auth] initial fetchClientDetails error', e));
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2) Poll /api/session every 5s and log what happens
  useEffect(() => {
    if (!user) return;
    // console.log('[SessionCheck] starting polling every 5s');

    const iv = setInterval(async () => {
      // console.log('[SessionCheck] → calling /api/session?action=check');
      try {
        const resp = await fetch('/api/session', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check' }),
        });
        // console.log('[SessionCheck] ← status', resp.status);
        if (!resp.ok) throw new Error(`status ${resp.status}`);

        const { active } = await resp.json();
        // console.log('[SessionCheck] active =', active);

        if (!active) {
          console.warn('[SessionCheck] session is INACTIVE → logging out');
          await supabase.auth.signOut();
          router.replace('/auth/login');
        }
      } catch (err) {
        console.error('[SessionCheck] error during check', err);
        console.warn('[SessionCheck] forcing sign-out due to error');
        await supabase.auth.signOut();
        router.replace('/auth/login');
      }
    }, 5_000);

    return () => {
      // console.log('[SessionCheck] stopping polling');
      clearInterval(iv);
    };
  }, [user, router]);

  // 3) login() + register + redirect
  const login = useCallback(
    async (email: string, password: string) => {
      // console.log('[Auth] login called for', email);
      const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError) {
        console.error('[Auth] signIn error', signError);
        return { success: false, error: signError.message };
      }

      // console.log('[Auth] calling /api/session?action=register');
      await fetch('/api/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'register' }),
      });

      // console.log('[Auth] fetching clientDetails post-login');
      let details: ClientDetails | null = null;
      try {
        const resp = await fetch(
          constructVercelURL(`/api/client-details?email=${encodeURIComponent(email)}`)
        );
        details = await resp.json();
        // console.log('[Auth] clientDetails post-login:', details);
        setClientDetails(details);
      } catch (e) {
        console.error('[Auth] post-login clientDetails error', e);
      }

      if (details?.id && details.businesses?.length) {
        // const biz = details.businesses[0].business_id;
        // console.log('[Auth] redirecting to first business:');
        router.replace('/businesses');
      } else {
        console.warn('[Auth] no businesses found, fallback to /auth/login');
        router.replace('/auth/login');
      }

      return { success: true };
    },
    [router]
  );

  // 4) logout()
  const logout = useCallback(async () => {
    // console.log('[Auth] logout called');
    if (user?.email) {
      // console.log('[Auth] calling /api/session?action=delete');
      await fetch('/api/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, action: 'delete' }),
      });
    }
    await supabase.auth.signOut();
    router.replace('/auth/login');
  }, [user, router]);

  const value = useMemo(
    () => ({ user, loading, clientDetails, login, logout }),
    [user, loading, clientDetails, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
