'use client';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo
} from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { constructVercelURL } from '@/utils/generateURL';
import { v4 as uuidv4 } from 'uuid';

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
  id: string;
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
  sessionId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Persist sessionId across tabs
  const [sessionId, _setSessionId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('session_id') : null
  );
  const setSessionId = (id: string | null) => {
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('session_id', id);
      else localStorage.removeItem('session_id');
    }
    _setSessionId(id);
  };

  // fetch client details
  const fetchClientDetails = useCallback(async (email: string) => {
    try {
      const res = await fetch(
        constructVercelURL(`/api/client-details?email=${encodeURIComponent(email)}`)
      );
      if (res.ok) setClientDetails(await res.json());
    } catch (err) {
      console.error('fetchClientDetails Error:', err);
    }
  }, []);

  // register session
  const registerSession = useCallback(async (email: string) => {
    try {
      let browserId = localStorage.getItem('browser_id');
      if (!browserId) {
        browserId = uuidv4();
        localStorage.setItem('browser_id', browserId);
      }
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'register', browser_id: browserId })
      });
      const data = await res.json();
      if (res.ok && data.sessionId) {
        setSessionId(data.sessionId);
        return data.sessionId;
      }
    } catch (err) {
      console.error('registerSession Error:', err);
    }
    return null;
  }, []);

  // check active session
  const checkActiveSession = useCallback(async () => {
    if (!user?.email || !sessionId) return false;
    try {
      const browserId = localStorage.getItem('browser_id') || '';
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          action: 'check',
          sessionId,
          browser_id: browserId
        })
      });
      const data = await res.json();
      return res.ok && data.active;
    } catch (err) {
      console.error('checkActiveSession Error:', err);
      return false;
    }
  }, [user, sessionId]);

  // login
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const newId = await registerSession(email);
        if (!newId) {
          await supabase.auth.signOut();
          return { success: false, error: 'Session registration failed' };
        }
        await fetchClientDetails(email);
        setUser(data.user as User);
        return { success: true };
      } catch (err: any) {
        console.error('login Error:', err);
        return { success: false, error: err.message };
      }
    },
    [registerSession, fetchClientDetails]
  );

  // logout
  const logout = useCallback(async () => {
    try {
      if (user?.email) {
        await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, action: 'delete' })
        });
      }
      await supabase.auth.signOut();
    } catch (err) {
      console.error('logout Error:', err);
    } finally {
      setSessionId(null);
      setUser(null);
      setClientDetails(null);
      router.push('/auth/login');
    }
  }, [user, router]);

  // initial hydration (no auto-invalidation here)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && mounted) {
        setUser(session.user as User);
        const email = session.user.email;
        if (email) await fetchClientDetails(email);
      }
      if (mounted) setLoading(false);
    })();

    // listen for sign-outs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setClientDetails(null);
        setSessionId(null);
      }
    });

    // cross-tab logout
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'session_id' && e.newValue !== sessionId) logout();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, [sessionId, fetchClientDetails, logout]);

   // realtime invalidation
   useEffect(() => {
    if (!user?.id || !sessionId) return;
    // subscribe to Postgres changes on active_sessions
    const channel = supabase
      .channel(`session_watch_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'active_sessions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.session_id !== sessionId) {
            logout();
          }
        }
      );
    // initiate subscription (returns a promise we ignore)
    channel.subscribe();
    return () => {
      // remove the channel to unsubscribe
      supabase.removeChannel(channel);
    };
  }, [user, sessionId, logout]);

  // polling fallback
  useEffect(() => {
    if (!user || !sessionId) return;
    const iv = setInterval(async () => {
      if (!(await checkActiveSession())) await logout();
    }, 5000);
    return () => clearInterval(iv);
  }, [user, sessionId, checkActiveSession, logout]);

  // focus listener
  useEffect(() => {
    const onFocus = async () => {
      if (user && sessionId && !(await checkActiveSession())) await logout();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, sessionId, checkActiveSession, logout]);

  // route change listener
  useEffect(() => {
    if (pathname && user && sessionId) {
      checkActiveSession().then((active) => {
        if (!active) logout();
      });
    }
  }, [pathname, user, sessionId, checkActiveSession, logout]);

  const value = useMemo(
    () => ({ user, loading, clientDetails, login, logout, sessionId }),
    [user, loading, clientDetails, login, logout, sessionId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
