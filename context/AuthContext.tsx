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
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname(); // Added to check current path
  const [user, setUser] = useState<User | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if we're in a password reset flow
  const isResetPasswordFlow = () => {
    if (typeof window === 'undefined') return false;
    return (
      pathname === '/auth/reset-password' || 
      localStorage.getItem('is_password_reset_flow') === 'true'
    );
  };

  // 1) Supabase auth listener + fetch clientDetails
  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        console.log('[Auth] onAuthStateChange event:', _event, 'path:', pathname);
        
        // Special handling for password reset flow
        const inResetFlow = isResetPasswordFlow();
        if (inResetFlow) {
          console.log('[Auth] In password reset flow, special handling');
          
          // During password reset, we need the session but don't want redirects
          // or other normal auth flow behaviors
          
          if (_event === 'SIGNED_OUT' && pathname === '/auth/reset-password') {
            console.log('[Auth] Ignoring SIGNED_OUT during reset flow');
            // Don't clear user state during password reset when we get a SIGNED_OUT
            setLoading(false);
            return;
          }
        }
        
        if (session?.user?.email) {
          const u = session.user;
          setUser({ id: u.id, email: u.email!, user_metadata: u.user_metadata as any });
          try {
            console.log('[Auth] fetching clientDetails for', u.email);
            const resp = await fetch(
              constructVercelURL(`/api/client-details?email=${encodeURIComponent(u.email!)}`)
            );
            const json = await resp.json();
            console.log('[Auth] clientDetails response:', resp.status, json);
            if (resp.ok) setClientDetails(json);
            
            // Don't redirect during password reset flow
            if (_event === 'SIGNED_IN' && !inResetFlow) {
              if (json?.id && json.businesses?.length) {
                console.log('[Auth] Auto-redirecting to businesses after sign in');
                router.replace('/businesses');
              }
            } else if (inResetFlow) {
              console.log('[Auth] On reset password page, skipping redirect');
            }
          } catch (err) {
            console.error('[Auth] fetchClientDetails error', err);
          }
        } else {
          console.log('[Auth] no session, clearing user & details');
          
          // Don't clear user during password reset if we're on the reset page
          if (!inResetFlow) {
            setUser(null);
            setClientDetails(null);
            
            // Only redirect to login if not already on an auth page
            if (_event === 'SIGNED_OUT' && !pathname.startsWith('/auth/')) {
              router.replace('/auth/login');
            }
          } else {
            console.log('[Auth] In reset flow, not clearing user state');
          }
        }
        setLoading(false);
      }
    );

    // bootstrap initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] getSession:', session, 'path:', pathname);
      
      const inResetFlow = isResetPasswordFlow();
      
      if (session?.user?.email) {
        const u = session.user;
        setUser({ id: u.id, email: u.email!, user_metadata: u.user_metadata as any });
        
        // Skip auto-redirect if on reset password page
        if (inResetFlow) {
          console.log('[Auth] On reset password page, skipping redirect');
          setLoading(false);
          return;
        }
        
        fetch(
          constructVercelURL(`/api/client-details?email=${encodeURIComponent(u.email!)}`)
        )
          .then((r) => r.json())
          .then((d) => {
            console.log('[Auth] initial clientDetails:', d);
            setClientDetails(d);
            
            // Only redirect if not on reset password page
            if (d?.id && d.businesses?.length && !inResetFlow) {
              router.replace('/businesses');
            }
          })
          .catch((e) => console.error('[Auth] initial fetchClientDetails error', e));
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  // 2) Poll /api/session every 10s and log what happens
  useEffect(() => {
    if (!user) return;

    // Skip session polling for reset password flow
    if (isResetPasswordFlow()) {
      console.log('[SessionCheck] skipping polling on reset password page');
      return;
    }
    
    console.log('[SessionCheck] starting polling every 10s');

    const iv = setInterval(async () => {
      console.log('[SessionCheck] → calling /api/session?action=check');
      try {
        const resp = await fetch('/api/session', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check' }),
        });
        console.log('[SessionCheck] ← status', resp.status);
        if (!resp.ok) throw new Error(`status ${resp.status}`);

        const { active } = await resp.json();
        console.log('[SessionCheck] active =', active);

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
    }, 10_000);

    return () => {
      console.log('[SessionCheck] stopping polling');
      clearInterval(iv);
    };
  }, [user, router, pathname]);

  // 3) login() + register + redirect
  const login = useCallback(
    async (email: string, password: string) => {
      console.log('[Auth] login called for', email);
      const { error: signError } = await supabase.auth.signInWithPassword({ 
        email, 
        password
      });
      
      if (signError) {
        console.error('[Auth] signIn error', signError);
        return { success: false, error: signError.message };
      }

      console.log('[Auth] calling /api/session?action=register');
      await fetch('/api/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'register' }),
      });

      console.log('[Auth] fetching clientDetails post-login');
      let details: ClientDetails | null = null;
      try {
        const resp = await fetch(
          constructVercelURL(`/api/client-details?email=${encodeURIComponent(email)}`)
        );
        details = await resp.json();
        console.log('[Auth] clientDetails post-login:', details);
        setClientDetails(details);
      } catch (e) {
        console.error('[Auth] post-login clientDetails error', e);
      }

      // Skip redirect if on password reset page
      if (isResetPasswordFlow()) {
        console.log('[Auth] In reset password flow, skipping redirect after login');
        return { success: true };
      }

      if (details?.id && details.businesses?.length) {
        console.log('[Auth] redirecting to businesses');
        router.replace('/businesses');
      } else {
        console.warn('[Auth] no businesses found, fallback to /auth/login');
        router.replace('/auth/login');
      }

      return { success: true };
    },
    [router, pathname]
  );

  // 4) logout()
  const logout = useCallback(async () => {
    console.log('[Auth] logout called');
    
    // Clear reset flow flags if they exist
    if (typeof window !== 'undefined') {
      localStorage.removeItem('is_password_reset_flow');
      localStorage.removeItem('supabase_reset_token');
      localStorage.removeItem('supabase_reset_refresh_token');
    }
    
    if (user?.email) {
      console.log('[Auth] calling /api/session?action=delete');
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