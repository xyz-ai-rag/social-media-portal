'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use refs for stable references across renders
  const hasRedirected = useRef(false);
  const isInitialLoad = useRef(true); // Track initial page load vs refresh
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingActive = useRef(false);
  const componentMounted = useRef(true);
  
  // ADDED: Save current path when it's a meaningful page
  useEffect(() => {
    if (user && 
        pathname && 
        !pathname.startsWith('/auth/') && 
        pathname !== '/' &&
        pathname !== '/login') {
      // console.log('[Auth] Saving path:', pathname);
      localStorage.setItem('lastVisitedPath', pathname);
    }
  }, [pathname, user]);

  // Clean up session interval
  const cleanupSessionInterval = useCallback(() => {
    if (sessionIntervalRef.current) {
      // console.log('[SessionCheck] stopping polling');
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
      pollingActive.current = false;
    }
  }, []);
  
  // Clean up token refresh interval
  const cleanupTokenRefreshInterval = useCallback(() => {
    if (tokenRefreshIntervalRef.current) {
      // console.log('[TokenRefresh] stopping refresh interval');
      clearInterval(tokenRefreshIntervalRef.current);
      tokenRefreshIntervalRef.current = null;
    }
  }, []);

  // Clean up all intervals
  const cleanupAllIntervals = useCallback(() => {
    cleanupSessionInterval();
    cleanupTokenRefreshInterval();
  }, [cleanupSessionInterval, cleanupTokenRefreshInterval]);

  // Check if we're in a password reset flow
  const isResetPasswordFlow = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return (
      pathname === '/auth/reset-password' || 
      localStorage.getItem('is_password_reset_flow') === 'true'
    );
  }, [pathname]);

  // Check if we're already on a business-related page
  const isBusinessPage = useCallback(() => {
    if (!pathname) return false;
    return /^\/business(es)?($|\/|\/[^\/]+)/.test(pathname);
  }, [pathname]);

  // Check if we're on a specific business dashboard page (not the listing)
  const isSpecificBusinessPage = useCallback(() => {
    if (!pathname) return false;
    return /^\/business(es)?\/[^\/]+/.test(pathname);
  }, [pathname]);

  // Function to refresh Supabase token to prevent expiration
  const setupTokenRefresh = useCallback(() => {
    // Clean up existing interval first
    cleanupTokenRefreshInterval();
    
    // console.log('[TokenRefresh] starting token refresh every 30 minutes');
    
    // Set interval to refresh token every 30 minutes (safely before the typical 1 hour expiry)
    tokenRefreshIntervalRef.current = setInterval(async () => {
      try {
        if (!componentMounted.current) {
          cleanupTokenRefreshInterval();
          return;
        }
        
        // console.log('[TokenRefresh] refreshing Supabase token');
        
        // Refresh the session
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('[TokenRefresh] error refreshing token:', error);
          // If can't refresh, try to get current session
          const { data: sessionData } = await supabase.auth.getSession();
          
          // If no valid session, log out
          if (!sessionData.session) {
            console.warn('[TokenRefresh] no valid session, logging out');
            cleanupAllIntervals();
            setUser(null);
            setClientDetails(null);
            router.replace('/auth/login');
          }
        } else if (data.session) {
          // console.log('[TokenRefresh] token refreshed successfully');
        }
      } catch (err) {
        console.error('[TokenRefresh] unexpected error:', err);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }, [cleanupTokenRefreshInterval, cleanupAllIntervals, router]);

  // Function to set up session polling
  const setupSessionPolling = useCallback((email: string) => {
    // Skip if already polling or in reset flow
    if (pollingActive.current || isResetPasswordFlow()) {
      if (isResetPasswordFlow()) {
        // console.log('[SessionCheck] skipping polling on reset password page');
      }
      return;
    }
    
    // Clean up any existing interval first
    cleanupSessionInterval();
    
    // console.log('[SessionCheck] starting polling every 10s');
    pollingActive.current = true;
    
    // Create new interval
    sessionIntervalRef.current = setInterval(async () => {
      if (!componentMounted.current) {
        cleanupSessionInterval();
        return;
      }
      
      try {
        // console.log('[SessionCheck] → calling /api/session?action=check');
        const resp = await fetch('/api/session', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'check',
            email: email 
          }),
        });
        
        if (!resp.ok) {
          throw new Error(`status ${resp.status}`);
        }

        const { active } = await resp.json();
        // console.log('[SessionCheck] active =', active);

        if (!active && componentMounted.current) {
          console.warn('[SessionCheck] session is INACTIVE → logging out');
          cleanupAllIntervals();
          await supabase.auth.signOut();
          setUser(null);
          setClientDetails(null);
          router.replace('/auth/login');
        }
      } catch (err) {
        console.error('[SessionCheck] error during check:', err);
        
        // Don't force logout on API errors, as that might be temporary
        // Instead, we'll let the token refresh mechanism handle potential Supabase issues
      }
    }, 10_000);
  }, [router, isResetPasswordFlow, cleanupSessionInterval, cleanupAllIntervals]);

  // Decide when to redirect
  const shouldRedirectToBusiness = useCallback((clientDetailsData: ClientDetails) => {
    // ADDED: First check for a saved path
    if (typeof window !== 'undefined') {
      const lastPath = localStorage.getItem('lastVisitedPath');
      if (lastPath) {
        // console.log('[Auth] Found saved path:', lastPath);
        return false; // Will handle redirect separately
      }
    }
    
    // Only redirect to businesses page if:
    // 1. Initial app load (not a page refresh)
    // 2. Not already on any business-related page
    // 3. Not a password reset flow
    // 4. Has client details with businesses
    // 5. Not already redirected in this session
    
    if (isInitialLoad.current && 
        !isBusinessPage() && 
        !isResetPasswordFlow() && 
        clientDetailsData?.id && 
        clientDetailsData.businesses?.length && 
        !hasRedirected.current) {
      
      // console.log('[Auth] Redirecting to businesses page on initial load');
      hasRedirected.current = true;
      isInitialLoad.current = false;
      return true;
    }
    
    // Otherwise, stay on current page
    return false;
  }, [isBusinessPage, isResetPasswordFlow]);

  // Supabase auth listener + fetch clientDetails
  useEffect(() => {
    componentMounted.current = true;
    
    // Check if this is a page refresh (vs initial app load)
    if (typeof window !== 'undefined' && window.performance) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0 && (navEntries[0] as any).type === 'reload') {
        // console.log('[Auth] Page was refreshed, not initial load');
        isInitialLoad.current = false;
      }
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!componentMounted.current) return;
        // console.log('[Auth] onAuthStateChange event:', _event, 'path:', pathname);
        
        // Special handling for password reset flow
        const inResetFlow = isResetPasswordFlow();
        if (inResetFlow) {
          // console.log('[Auth] In password reset flow, special handling');
          
          if (_event === 'SIGNED_OUT' && pathname === '/auth/reset-password') {
            // console.log('[Auth] Ignoring SIGNED_OUT during reset flow');
            setLoading(false);
            return;
          }
        }
        
        if (session?.user?.email) {
          const u = session.user;
          setUser({ id: u.id, email: u.email!, user_metadata: u.user_metadata as any });
          
          // Start token refresh mechanism for logged in user
          if (!inResetFlow) {
            setupTokenRefresh();
            setupSessionPolling(u.email!);
          }
          
          try {
            // console.log('[Auth] fetching clientDetails for', u.email);
            const resp = await fetch(
              constructVercelURL(`/api/client-details?email=${encodeURIComponent(u.email!)}`)
            );
            const json = await resp.json();
            // console.log('[Auth] clientDetails response:', resp.status);
            if (resp.ok) setClientDetails(json);
            
            // Handle redirections - only for explicit SIGNED_IN event
            if (_event === 'SIGNED_IN') {
              if (!inResetFlow && !isBusinessPage() && !hasRedirected.current) {
                if (json?.id && json.businesses?.length) {
                  // console.log('[Auth] Auto-redirecting to businesses after sign in');
                  hasRedirected.current = true;
                  router.replace('/businesses');
                }
              } else if (inResetFlow) {
                // console.log('[Auth] On reset password page, skipping redirect');
              } else if (isBusinessPage()) {
                // console.log('[Auth] Already on a business page, skipping redirect');
              }
            } else {
              // console.log('[Auth] Not a SIGNED_IN event, skipping redirect check');
            }
          } catch (err) {
            console.error('[Auth] fetchClientDetails error', err);
          }
        } else {
          // Clean up all intervals when no user
          cleanupAllIntervals();
          
          // console.log('[Auth] no session, clearing user & details');
          
          // Don't clear user during password reset if we're on the reset page
          if (!inResetFlow) {
            setUser(null);
            setClientDetails(null);
            
            // Only redirect to login if not already on an auth page
            if (_event === 'SIGNED_OUT' && !pathname.startsWith('/auth/')) {
              router.replace('/auth/login');
            }
          } else {
            // console.log('[Auth] In reset flow, not clearing user state');
          }
        }
        setLoading(false);
      }
    );

    // Bootstrap initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // console.log('[Auth] getSession:', session ? 'Session found' : 'No session', 'path:', pathname);
      
      const inResetFlow = isResetPasswordFlow();
      
      if (session?.user?.email) {
        const u = session.user;
        setUser({ id: u.id, email: u.email!, user_metadata: u.user_metadata as any });
        
        // Setup session polling and token refresh for initial session
        if (!inResetFlow) {
          setupTokenRefresh();
          setupSessionPolling(u.email!);
        }
        
        // Skip auto-redirect if on reset password page
        if (inResetFlow) {
          // console.log('[Auth] On reset password page, skipping redirect');
          setLoading(false);
          return;
        }
        
        fetch(constructVercelURL(`/api/client-details?email=${encodeURIComponent(u.email!)}`))
          .then((r) => r.json())
          .then((d) => {
            // console.log('[Auth] initial clientDetails received');
            setClientDetails(d);
            
            // MODIFIED: Check for saved path before default redirect
            const lastPath = localStorage.getItem('lastVisitedPath');
            const isInitialPageLoad = pathname === '/' || pathname === '/auth/login' || pathname === '/login';
            
            if (lastPath && isInitialPageLoad) {
              // console.log('[Auth] Restoring path from localStorage:', lastPath);
              hasRedirected.current = true;
              isInitialLoad.current = false;
              router.replace(lastPath);
            }
            // Only redirect if it's the initial app load, not a page refresh
            else if (shouldRedirectToBusiness(d)) {
              router.replace('/businesses');
            } else {
              // console.log('[Auth] Staying on current page - either refresh or already on business page');
              // On page refresh, we want to stay on the current page
              isInitialLoad.current = false;
            }
          })
          .catch((e) => console.error('[Auth] initial fetchClientDetails error', e));
      }
      setLoading(false);
    });

    // Cleanup function
    return () => {
      componentMounted.current = false;
      subscription.unsubscribe();
      cleanupAllIntervals();
    };
  }, [pathname, router, isBusinessPage, isResetPasswordFlow, setupSessionPolling, setupTokenRefresh, cleanupAllIntervals, shouldRedirectToBusiness]);

  // Login function
  const login = useCallback(
    async (email: string, password: string) => {
      // console.log('[Auth] login called for', email);
      const { error: signError } = await supabase.auth.signInWithPassword({ 
        email, 
        password
      });
      
      if (signError) {
        console.error('[Auth] signIn error', signError);
        return { success: false, error: signError.message };
      }

      // console.log('[Auth] calling /api/session?action=register');
      try {
        await fetch('/api/session', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, action: 'register' }),
        });
      } catch (err) {
        console.error('[Auth] Failed to register session:', err);
      }

      // console.log('[Auth] fetching clientDetails post-login');
      let details: ClientDetails | null = null;
      try {
        const resp = await fetch(
          constructVercelURL(`/api/client-details?email=${encodeURIComponent(email)}`)
        );
        details = await resp.json();
        // console.log('[Auth] clientDetails post-login received');
        setClientDetails(details);
      } catch (e) {
        console.error('[Auth] post-login clientDetails error', e);
      }

      // Skip redirect if on password reset page
      if (isResetPasswordFlow()) {
        // console.log('[Auth] In reset password flow, skipping redirect after login');
        return { success: true };
      }

      // Set has redirected to prevent further redirects
      hasRedirected.current = true;
      
      // MODIFIED: Check for saved path on login
      const lastPath = localStorage.getItem('lastVisitedPath');
      if (lastPath) {
        // console.log('[Auth] Restoring path after login:', lastPath);
        router.replace(lastPath);
      } else if (details?.id && details.businesses?.length) {
        // console.log('[Auth] redirecting to businesses');
        router.replace('/businesses');
      } else {
        console.warn('[Auth] no businesses found, fallback to /auth/login');
        router.replace('/auth/login');
      }

      return { success: true };
    },
    [router, isResetPasswordFlow]
  );

  // Logout function
  const logout = useCallback(async () => {
    // console.log('[Auth] logout called');
    
    // Reset tracking flags
    hasRedirected.current = false;
    isInitialLoad.current = true; // Reset for next login
    
    // Stop all intervals
    cleanupAllIntervals();
    
    // Clear reset flow flags if they exist
    if (typeof window !== 'undefined') {
      localStorage.removeItem('is_password_reset_flow');
      localStorage.removeItem('supabase_reset_token');
      localStorage.removeItem('supabase_reset_refresh_token');
      // IMPORTANT: Don't clear lastVisitedPath to allow restoring after login
    }
    
    if (user?.email) {
      // console.log('[Auth] calling /api/session?action=delete');
      try {
        await fetch('/api/session', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, action: 'delete' }),
        });
      } catch (err) {
        console.error('[Auth] Error deleting session:', err);
      }
    }
    
    // Clear state before signing out to avoid race conditions
    setUser(null);
    setClientDetails(null);
    
    await supabase.auth.signOut();
    router.replace('/auth/login');
  }, [user, router, cleanupAllIntervals]);

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