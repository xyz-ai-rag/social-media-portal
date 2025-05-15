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

// Define log area types to add type safety
type LogArea = 'redirect' | 'session' | 'auth' | 'path' | 'general';

// Define the debug mode configuration interface
interface DebugModeConfig {
  enabled: boolean;
  redirect: boolean;
  session: boolean;
  auth: boolean;
  path: boolean;
  general: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Debug config - set to true to enable debug logs, false to disable
const DEBUG_MODE: DebugModeConfig = {
  enabled: true,     // Master switch for all debug logs
  redirect: true,    // Logs related to redirects
  session: true,     // Logs related to session management
  auth: true,        // Logs related to authentication
  path: true,        // Logs related to path/URL changes
  general: true,     // General logs that don't fit in other categories
}

// Add a timestamp logger function that respects the debug config
const debugLog = (area: LogArea, message: string): void => {
  if (!DEBUG_MODE.enabled) return;
  
  // Check if this specific area is enabled
  if (!DEBUG_MODE[area]) return;
  
  // Add a prefix based on the area
  const prefix = area === 'redirect' ? '🔄 [REDIRECT]' : 
                area === 'session' ? '🔑 [SESSION]' : 
                area === 'auth' ? '👤 [AUTH]' : 
                area === 'path' ? '🔍 [PATH]' : 
                '📝 [DEBUG]';
  
  console.log(`${prefix} [${new Date().toISOString()}] ${message}`);
};

// Type definition for window extensions
declare global {
  interface Window {
    toggleAuthDebug: (enable?: boolean) => DebugModeConfig;
    configAuthDebug: (config: Partial<DebugModeConfig>) => DebugModeConfig;
  }
}

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
  const previousPathname = useRef(''); // Track previous path for debugging
  
  // Log current path for debugging
  useEffect(() => {
    if (pathname !== previousPathname.current) {
      debugLog('path', `Path changed from "${previousPathname.current}" to "${pathname}"`);
      previousPathname.current = pathname || '';
    }
  }, [pathname]);
  
  // ADDED: Save current path when it's a meaningful page
  useEffect(() => {
    if (user && 
        pathname && 
        !pathname.startsWith('/auth/') && 
        pathname !== '/' &&
        pathname !== '/login') {
      debugLog('path', `Saving path to localStorage: "${pathname}"`);
      localStorage.setItem('lastVisitedPath', pathname);
    }
  }, [pathname, user]);

  // Clean up session interval
  const cleanupSessionInterval = useCallback(() => {
    if (sessionIntervalRef.current) {
      debugLog('session', 'Stopping session polling');
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
      pollingActive.current = false;
    }
  }, []);
  
  // Clean up token refresh interval
  const cleanupTokenRefreshInterval = useCallback(() => {
    if (tokenRefreshIntervalRef.current) {
      debugLog('session', 'Stopping token refresh interval');
      clearInterval(tokenRefreshIntervalRef.current);
      tokenRefreshIntervalRef.current = null;
    }
  }, []);

  // Clean up all intervals
  const cleanupAllIntervals = useCallback(() => {
    debugLog('session', 'Cleaning up all intervals');
    cleanupSessionInterval();
    cleanupTokenRefreshInterval();
  }, [cleanupSessionInterval, cleanupTokenRefreshInterval]);

  // Check if we're in a password reset flow
  const isResetPasswordFlow = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const isReset = pathname === '/auth/reset-password' || 
                   localStorage.getItem('is_password_reset_flow') === 'true';
    
    if (isReset) {
      debugLog('auth', 'In password reset flow');
    }
    return isReset;
  }, [pathname]);

  // Check if we're already on a business-related page - IMPROVED VERSION
  const isBusinessPage = useCallback(() => {
    if (!pathname) return false;
    
    // 1. Regular business page check (pages starting with /business or /businesses)
    if (/^\/business(es)?($|\/|\/[^\/]+)/.test(pathname)) {
      debugLog('path', `isBusinessPage: "${pathname}" matches business pattern`);
      return true;
    }
    
    // 2. Check for /:clientId/:businessId/* pattern with known business sections
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length >= 3) {
      // List of all known business section pages
      const businessSections = [
        'dashboard',
        'competitors',
        'posts',
        'topic-analysis'
      ];
      
      // Check if the third part of the path is a known business section
      if (businessSections.includes(pathParts[2])) {
        debugLog('path', `isBusinessPage: "${pathname}" matches clientId/businessId/section pattern for section "${pathParts[2]}"`);
        return true;
      }
      
      // Check for sub-pages of business sections (e.g., /:clientId/:businessId/topic-analysis/:topic)
      if (pathParts.length >= 4) {
        if (pathParts[2] === 'topic-analysis') {
          debugLog('path', `isBusinessPage: "${pathname}" matches topic-analysis sub-page pattern`);
          return true;
        }
        // Add other section sub-pages if needed in the future
      }
    }
    
    debugLog('path', `isBusinessPage: "${pathname}" is NOT a business page`);
    return false;
  }, [pathname]);

  // Check if we're on a specific business dashboard page (not the listing)
  const isSpecificBusinessPage = useCallback(() => {
    if (!pathname) return false;
    const result = /^\/business(es)?\/[^\/]+/.test(pathname);
    debugLog('path', `isSpecificBusinessPage check for "${pathname}": ${result}`);
    return result;
  }, [pathname]);

  // Function to refresh Supabase token to prevent expiration
  const setupTokenRefresh = useCallback(() => {
    // Clean up existing interval first
    cleanupTokenRefreshInterval();
    
    debugLog('session', 'Setting up token refresh interval (30 minutes)');
    
    // Set interval to refresh token every 30 minutes (safely before the typical 1 hour expiry)
    tokenRefreshIntervalRef.current = setInterval(async () => {
      try {
        if (!componentMounted.current) {
          cleanupTokenRefreshInterval();
          return;
        }
        
        debugLog('session', 'TokenRefresh event triggered');
        
        // Refresh the session
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('[TokenRefresh] error refreshing token:', error);
          // If can't refresh, try to get current session
          const { data: sessionData } = await supabase.auth.getSession();
          
          // If no valid session, log out
          if (!sessionData.session) {
            debugLog('session', 'No valid session found during token refresh, logging out');
            cleanupAllIntervals();
            setUser(null);
            setClientDetails(null);
            router.replace('/auth/login');
          }
        } else if (data.session) {
          debugLog('session', 'Token refresh successful');
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
        debugLog('session', 'Skipping session polling due to reset password flow');
      } else if (pollingActive.current) {
        debugLog('session', 'Session polling already active, skipping setup');
      }
      return;
    }
    
    // Clean up any existing interval first
    cleanupSessionInterval();
    
    debugLog('session', 'Starting session polling (10s intervals)');
    pollingActive.current = true;
    
    // Create new interval
    sessionIntervalRef.current = setInterval(async () => {
      if (!componentMounted.current) {
        cleanupSessionInterval();
        return;
      }
      
      try {
        debugLog('session', `Session check initiated (path: ${pathname})`);
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
        debugLog('session', `Session check result: active=${active}`);

        if (!active && componentMounted.current) {
          debugLog('redirect', 'Session is INACTIVE → logging out');
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
  }, [router, isResetPasswordFlow, cleanupSessionInterval, cleanupAllIntervals, pathname]);

  // Decide when to redirect
  const shouldRedirectToBusiness = useCallback((clientDetailsData: ClientDetails) => {
    debugLog('redirect', `shouldRedirectToBusiness check: path="${pathname}", initialLoad=${isInitialLoad.current}, hasRedirected=${hasRedirected.current}`);
    
    // ADDED: First check for a saved path
    if (typeof window !== 'undefined') {
      const lastPath = localStorage.getItem('lastVisitedPath');
      if (lastPath) {
        debugLog('redirect', `Found saved path in localStorage: "${lastPath}"`);
        return false; // Will handle redirect separately
      }
    }
    
    // Log the business page check result
    const businessPageCheck = isBusinessPage();
    debugLog('redirect', `Business page check: ${businessPageCheck}`);
    
    // Only redirect to businesses page if:
    // 1. Initial app load (not a page refresh)
    // 2. Not already on any business-related page
    // 3. Not a password reset flow
    // 4. Has client details with businesses
    // 5. Not already redirected in this session
    
    if (isInitialLoad.current && 
        !businessPageCheck && 
        !isResetPasswordFlow() && 
        clientDetailsData?.id && 
        clientDetailsData.businesses?.length && 
        !hasRedirected.current) {
      
      debugLog('redirect', 'REDIRECT TRIGGERED: Redirecting to businesses page on initial load');
      hasRedirected.current = true;
      isInitialLoad.current = false;
      return true;
    }
    
    // Otherwise, stay on current page
    return false;
  }, [isBusinessPage, isResetPasswordFlow, pathname]);

  // Supabase auth listener + fetch clientDetails
  useEffect(() => {
    componentMounted.current = true;
    
    // Check if this is a page refresh (vs initial app load)
    if (typeof window !== 'undefined' && window.performance) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0 && (navEntries[0] as any).type === 'reload') {
        debugLog('path', 'Page was refreshed, not initial load');
        isInitialLoad.current = false;
      } else {
        debugLog('path', 'Initial page load detected');
      }
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!componentMounted.current) return;
        debugLog('auth', `onAuthStateChange event: ${_event}, path: ${pathname}`);
        
        // Special handling for password reset flow
        const inResetFlow = isResetPasswordFlow();
        if (inResetFlow) {
          debugLog('auth', 'In password reset flow, special handling');
          
          if (_event === 'SIGNED_OUT' && pathname === '/auth/reset-password') {
            debugLog('auth', 'Ignoring SIGNED_OUT during reset flow');
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
            debugLog('auth', `Fetching clientDetails for ${u.email}`);
            const resp = await fetch(
              constructVercelURL(`/api/client-details?email=${encodeURIComponent(u.email!)}`)
            );
            const json = await resp.json();
            debugLog('auth', `clientDetails response: ${resp.status}`);
            if (resp.ok) setClientDetails(json);
            
            // Handle redirections - only for explicit SIGNED_IN event
            if (_event === 'SIGNED_IN') {
              debugLog('redirect', `SIGNED_IN event processing - inResetFlow=${inResetFlow}, isBusinessPage=${isBusinessPage()}, hasRedirected=${hasRedirected.current}`);
              
              if (!inResetFlow && !isBusinessPage() && !hasRedirected.current) {
                if (json?.id && json.businesses?.length) {
                  debugLog('redirect', 'REDIRECT TRIGGERED: Auto-redirecting to businesses after sign in');
                  hasRedirected.current = true;
                  router.replace('/businesses');
                }
              } else if (inResetFlow) {
                debugLog('redirect', 'On reset password page, skipping redirect');
              } else if (isBusinessPage()) {
                debugLog('redirect', 'Already on a business page, skipping redirect');
              }
            } else {
              debugLog('auth', `Not a SIGNED_IN event (${_event}), skipping redirect check`);
            }
          } catch (err) {
            console.error('[Auth] fetchClientDetails error', err);
          }
        } else {
          // Clean up all intervals when no user
          cleanupAllIntervals();
          
          debugLog('auth', 'No session, clearing user & details');
          
          // Don't clear user during password reset if we're on the reset page
          if (!inResetFlow) {
            setUser(null);
            setClientDetails(null);
            
            // Only redirect to login if not already on an auth page
            if (_event === 'SIGNED_OUT' && !pathname.startsWith('/auth/')) {
              debugLog('redirect', 'REDIRECT TRIGGERED: SIGNED_OUT, redirecting to login');
              router.replace('/auth/login');
            }
          } else {
            debugLog('auth', 'In reset flow, not clearing user state');
          }
        }
        setLoading(false);
      }
    );

    // Bootstrap initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      debugLog('auth', `getSession: ${session ? 'Session found' : 'No session'}, path: ${pathname}`);
      
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
          debugLog('redirect', 'On reset password page, skipping redirect');
          setLoading(false);
          return;
        }
        
        fetch(constructVercelURL(`/api/client-details?email=${encodeURIComponent(u.email!)}`))
          .then((r) => r.json())
          .then((d) => {
            debugLog('auth', 'Initial clientDetails received');
            setClientDetails(d);
            
            // MODIFIED: Check for saved path before default redirect
            const lastPath = localStorage.getItem('lastVisitedPath');
            const isInitialPageLoad = pathname === '/' || pathname === '/auth/login' || pathname === '/login';
            
            debugLog('redirect', `Redirect check: lastPath=${lastPath}, isInitialPageLoad=${isInitialPageLoad}, isBusinessPage=${isBusinessPage()}`);
            
            if (lastPath && isInitialPageLoad) {
              debugLog('redirect', `REDIRECT TRIGGERED: Restoring path from localStorage: "${lastPath}"`);
              hasRedirected.current = true;
              isInitialLoad.current = false;
              router.replace(lastPath);
            }
            // Only redirect if it's the initial app load, not a page refresh
            else if (shouldRedirectToBusiness(d)) {
              debugLog('redirect', 'REDIRECT TRIGGERED: shouldRedirectToBusiness returned true');
              router.replace('/businesses');
            } else {
              debugLog('redirect', 'Staying on current page - either refresh or already on business page');
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
      debugLog('auth', 'AuthProvider cleanup triggered');
      componentMounted.current = false;
      subscription.unsubscribe();
      cleanupAllIntervals();
    };
  }, [pathname, router, isBusinessPage, isResetPasswordFlow, setupSessionPolling, setupTokenRefresh, cleanupAllIntervals, shouldRedirectToBusiness]);

  // Login function
  const login = useCallback(
    async (email: string, password: string) => {
      debugLog('auth', `Login called for ${email}`);
      const { error: signError } = await supabase.auth.signInWithPassword({ 
        email, 
        password
      });
      
      if (signError) {
        console.error('[Auth] signIn error', signError);
        return { success: false, error: signError.message };
      }

      debugLog('auth', 'Calling /api/session?action=register');
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

      debugLog('auth', 'Fetching clientDetails post-login');
      let details: ClientDetails | null = null;
      try {
        const resp = await fetch(
          constructVercelURL(`/api/client-details?email=${encodeURIComponent(email)}`)
        );
        details = await resp.json();
        debugLog('auth', 'clientDetails post-login received');
        setClientDetails(details);
      } catch (e) {
        console.error('[Auth] post-login clientDetails error', e);
      }

      // Skip redirect if on password reset page
      if (isResetPasswordFlow()) {
        debugLog('redirect', 'In reset password flow, skipping redirect after login');
        return { success: true };
      }

      // Set has redirected to prevent further redirects
      hasRedirected.current = true;
      
      // MODIFIED: Check for saved path on login
      const lastPath = localStorage.getItem('lastVisitedPath');
      if (lastPath) {
        debugLog('redirect', `REDIRECT TRIGGERED: Restoring path after login: "${lastPath}"`);
        router.replace(lastPath);
      } else if (details?.id && details.businesses?.length) {
        debugLog('redirect', 'REDIRECT TRIGGERED: redirecting to businesses');
        router.replace('/businesses');
      } else {
        debugLog('redirect', 'REDIRECT TRIGGERED: no businesses found, fallback to /auth/login');
        router.replace('/auth/login');
      }

      return { success: true };
    },
    [router, isResetPasswordFlow]
  );

  // Logout function
  const logout = useCallback(async () => {
    debugLog('auth', 'Logout called');
    
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
      debugLog('auth', 'Calling /api/session?action=delete');
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

// Expose debug mode toggle for easy control
if (typeof window !== 'undefined') {
  window.toggleAuthDebug = (enable: boolean = true): DebugModeConfig => {
    DEBUG_MODE.enabled = enable;
    console.log(`Auth debug logs ${enable ? 'enabled' : 'disabled'}`);
    return {...DEBUG_MODE};
  };
  
  // Enable/disable specific areas
  window.configAuthDebug = (config: Partial<DebugModeConfig>): DebugModeConfig => {
    Object.assign(DEBUG_MODE, config);
    console.log('Auth debug config updated:', {...DEBUG_MODE});
    return {...DEBUG_MODE};
  };
}