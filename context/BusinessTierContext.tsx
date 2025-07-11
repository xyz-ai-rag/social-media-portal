"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

interface BusinessTierInfo {
  businessId: string;
  businessName: string;
  isFreeTier: boolean;
  lastUpdated?: string;
  cacheTimestamp?: number;
}

interface BusinessTierContextType {
  currentBusinessTier: BusinessTierInfo | null;
  isFreeTier: boolean;
  shouldShowBanner: boolean;
  loading: boolean;
  refreshTier: () => Promise<void>;
  clearCache: () => void;
}

const BusinessTierContext = createContext<BusinessTierContextType | undefined>(undefined);

const CACHE_KEY_PREFIX = 'business_tier_';
const CACHE_EXPIRY_MS = 3 * 1000; // Only 3 seconds cache expiry!
// This means: 
// - Normal navigation = smooth localStorage (no flashing)
// - Database changes = visible within 3 seconds

// Helper to detect if this is a genuine page refresh vs navigation
const isPageRefresh = (): boolean => {
  // Check if this is a page refresh using performance navigation timing
  if (typeof window !== 'undefined' && window.performance) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navigation?.type === 'reload';
  }
  
  // Fallback: Check if the page was loaded recently (likely a refresh)
  return false;
};

// Store session-level flag to track if we've already loaded fresh data
const SESSION_FRESH_LOADED_KEY = 'tier_fresh_loaded_';

const hasLoadedFreshInSession = (businessId: string): boolean => {
  try {
    const key = `${SESSION_FRESH_LOADED_KEY}${businessId}`;
    return sessionStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
};

const markFreshLoadedInSession = (businessId: string): void => {
  try {
    const key = `${SESSION_FRESH_LOADED_KEY}${businessId}`;
    sessionStorage.setItem(key, 'true');
  } catch {
    // Ignore errors
  }
};
const getBusinessTierFromStorage = (businessId: string): BusinessTierInfo | null => {
  try {
    const item = localStorage.getItem(`${CACHE_KEY_PREFIX}${businessId}`);
    if (!item) {
      // console.log('🔍 No cache found for business:', businessId);
      return null;
    }

    const parsed: BusinessTierInfo = JSON.parse(item);
    
    // Check if cache expired
    const now = Date.now();
    const cacheAge = now - (parsed.cacheTimestamp || 0);
    const cacheAgeSeconds = Math.round(cacheAge / 1000);
    
    // console.log(`🔍 Cache age: ${cacheAgeSeconds} seconds (expires after ${CACHE_EXPIRY_MS / 1000} seconds)`);
    // console.log('🔍 Cached tier info:', parsed);
    
    if (cacheAge > CACHE_EXPIRY_MS) {
      // console.log('🗑️ Cache expired, removing...');
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${businessId}`);
      return null;
    }

    // console.log('✅ Using cached data');
    return parsed;
  } catch (error) {
    console.error('❌ Error reading cache:', error);
    return null;
  }
};

// Helper to save to localStorage with timestamp
const setBusinessTierToStorage = (businessId: string, tierInfo: BusinessTierInfo): void => {
  try {
    const dataWithTimestamp = {
      ...tierInfo,
      cacheTimestamp: Date.now()
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${businessId}`, JSON.stringify(dataWithTimestamp));
    // console.log('💾 Saved to cache:', dataWithTimestamp);
  } catch (error) {
    console.error('❌ Error saving to cache:', error);
  }
};

// Helper to clear cache
const clearBusinessTierCache = (businessId: string): void => {
  try {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${businessId}`);
    // console.log('🗑️ Cleared cache for business:', businessId);
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
};

export function BusinessTierProvider({ children, businessId }: { children: ReactNode; businessId?: string }) {
  const { clientDetails } = useAuth();
  const [currentBusinessTier, setCurrentBusinessTier] = useState<BusinessTierInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Function to fetch from API
  const fetchTierFromAPI = async (forceRefresh = false): Promise<BusinessTierInfo | null> => {
    if (!businessId) return null;

    try {
      setLoading(true);
      // console.log(`🌐 Fetching from API... (forceRefresh: ${forceRefresh})`);
      
      // Add cache-busting parameter if force refresh
      const url = `/api/businesses/getBusinessTier?businessId=${encodeURIComponent(businessId)}${forceRefresh ? '&_t=' + Date.now() : ''}`;
      // console.log('🌐 API URL:', url);
      
      const response = await fetch(url, {
        // Add no-cache headers for force refresh
        ...(forceRefresh && {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      });
      
      if (!response.ok) {
        console.error('❌ API response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch');
      }
      
      const data = await response.json();
      // console.log('📥 API response data:', data);
      
      const tierInfo: BusinessTierInfo = {
        businessId: data.business_id,
        businessName: data.business_name,
        isFreeTier: data.is_free_tier || false,
        lastUpdated: data.last_updated || null
      };

      // console.log('✨ Processed tier info:', tierInfo);

      // Save to localStorage with timestamp
      setBusinessTierToStorage(businessId, tierInfo);
      setCurrentBusinessTier(tierInfo);
      
      return tierInfo;
    } catch (error) {
      console.error('❌ Error fetching business tier:', error);
      
      // Fallback to cached data or default
      const fallbackName = clientDetails?.businesses?.find(b => b.business_id === businessId)?.business_name || 'Unknown';
      const fallback: BusinessTierInfo = {
        businessId,
        businessName: fallbackName,
        isFreeTier: true // Default to free tier on error
      };
      // console.log('🔄 Using fallback:', fallback);
      setCurrentBusinessTier(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const refreshTier = async (): Promise<void> => {
    if (!businessId) return;
    
    // console.log('🔄 Manual refresh triggered');
    // Clear cache and fetch fresh data
    clearBusinessTierCache(businessId);
    await fetchTierFromAPI(true);
  };

  // Clear cache function
  const clearCache = (): void => {
    if (businessId) {
      clearBusinessTierCache(businessId);
      setCurrentBusinessTier(null);
    }
  };

  // Main initialization logic - BACK TO ORIGINAL SMOOTH BEHAVIOR
  useEffect(() => {
    if (!businessId) {
      // console.log('⚠️ No businessId provided');
      return;
    }

    // console.log('🚀 Initializing BusinessTierProvider for:', businessId);

    // ORIGINAL BEHAVIOR: Try localStorage first (smooth, no flashing)
    const cachedTier = getBusinessTierFromStorage(businessId);
    
    if (cachedTier) {
      // console.log('📦 Found cached data, using it immediately (no flash)');
      // Set immediately from cache - banner shows instantly, smoothly
      setCurrentBusinessTier(cachedTier);
      
      // No background refresh needed since cache expires in 3 seconds anyway
      return;
    }

    // console.log('📭 No cache found, fetching from API');
    // No cache available or cache expired (after 3 seconds), fetch from API
    fetchTierFromAPI(true);
  }, [businessId, clientDetails]);

  // Debug: Log state changes
  // useEffect(() => {
  //   console.log('🔔 Business tier state changed:', {
  //     currentBusinessTier,
  //     isFreeTier: currentBusinessTier?.isFreeTier ?? true,
  //     shouldShowBanner: (currentBusinessTier?.isFreeTier ?? true) && currentBusinessTier !== null
  //   });
  // }, [currentBusinessTier]);

  const isFreeTier = currentBusinessTier?.isFreeTier ?? true;
  const shouldShowBanner = isFreeTier && currentBusinessTier !== null;

  const value = useMemo(() => ({
    currentBusinessTier,
    isFreeTier,
    shouldShowBanner,
    loading,
    refreshTier,
    clearCache
  }), [currentBusinessTier, isFreeTier, shouldShowBanner, loading]);

  return (
    <BusinessTierContext.Provider value={value}>
      {children}
      {/* Debug panel for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-0 left-0 bg-black text-white text-xs p-2 max-w-sm z-50">
          <div><strong>Debug:</strong></div>
          <div>Business: {businessId}</div>
          <div>IsFreeTier: {isFreeTier ? 'Yes' : 'No'}</div>
          <div>ShowBanner: {shouldShowBanner ? 'Yes' : 'No'}</div>
          <div>Loading: {loading ? 'Yes' : 'No'}</div>
          <button 
            onClick={refreshTier}
            className="mt-1 bg-blue-600 px-2 py-1 rounded text-xs"
          >
            Force Refresh
          </button>
          <button 
            onClick={clearCache}
            className="mt-1 ml-1 bg-red-600 px-2 py-1 rounded text-xs"
          >
            Clear Cache
          </button>
        </div>
      )}
    </BusinessTierContext.Provider>
  );
}

export function useBusinessTier() {
  const context = useContext(BusinessTierContext);
  if (!context) {
    throw new Error('useBusinessTier must be used within a BusinessTierProvider');
  }
  return context;
}

export function useTierBanner() {
  const { shouldShowBanner, currentBusinessTier, loading } = useBusinessTier();
  
  return {
    shouldShow: shouldShowBanner,
    businessName: currentBusinessTier?.businessName,
    lastUpdated: currentBusinessTier?.lastUpdated,
    loading
  };
}

// Utility hook for manual cache management
export function useTierCacheManagement() {
  const { refreshTier, clearCache } = useBusinessTier();
  
  return {
    refreshTier,
    clearCache,
    // Utility to clear all business tier caches
    clearAllCache: () => {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(CACHE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
        // console.log('🗑️ Cleared all business tier caches');
      } catch (error) {
        console.error('❌ Error clearing all caches:', error);
      }
    }
  };
}