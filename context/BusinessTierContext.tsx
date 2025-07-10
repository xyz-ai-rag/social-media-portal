"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

interface BusinessTierInfo {
  businessId: string;
  businessName: string;
  isFreeTier: boolean;
  lastUpdated?: string;
}

interface BusinessTierContextType {
  currentBusinessTier: BusinessTierInfo | null;
  isFreeTier: boolean;
  shouldShowBanner: boolean;
  loading: boolean;
}

const BusinessTierContext = createContext<BusinessTierContextType | undefined>(undefined);

const CACHE_KEY_PREFIX = 'business_tier_';

// Simple localStorage helper
const getBusinessTierFromStorage = (businessId: string): BusinessTierInfo | null => {
  try {
    const item = localStorage.getItem(`${CACHE_KEY_PREFIX}${businessId}`);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

export function BusinessTierProvider({ children, businessId }: { children: ReactNode; businessId?: string }) {
  const { clientDetails } = useAuth();
  const [currentBusinessTier, setCurrentBusinessTier] = useState<BusinessTierInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize immediately from localStorage - NO API call, NO async operations
  useEffect(() => {
    if (!businessId) return;

    // Try localStorage first (synchronous - no refreshing!)
    const cachedTier = getBusinessTierFromStorage(businessId);
    
    if (cachedTier) {
      // Set immediately from cache - banner shows instantly, no refresh
      setCurrentBusinessTier(cachedTier);
      return;
    }

    // Only if no localStorage data, then fetch from API
    const fetchTier = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/businesses/getBusinessTier?businessId=${encodeURIComponent(businessId)}`);
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        const tierInfo = {
          businessId: data.business_id,
          businessName: data.business_name,
          isFreeTier: data.is_free_tier || false,
          lastUpdated: data.last_updated || null
        };

        // Save to localStorage for next time
        localStorage.setItem(`${CACHE_KEY_PREFIX}${businessId}`, JSON.stringify(tierInfo));
        setCurrentBusinessTier(tierInfo);
      } catch (error) {
        // Fallback
        const fallbackName = clientDetails?.businesses?.find(b => b.business_id === businessId)?.business_name || 'Unknown';
        const fallback = {
          businessId,
          businessName: fallbackName,
          isFreeTier: true
        };
        setCurrentBusinessTier(fallback);
      } finally {
        setLoading(false);
      }
    };

    fetchTier();
  }, [businessId, clientDetails]);

  const isFreeTier = currentBusinessTier?.isFreeTier ?? true;
  const shouldShowBanner = isFreeTier && currentBusinessTier !== null;

  const value = useMemo(() => ({
    currentBusinessTier,
    isFreeTier,
    shouldShowBanner,
    loading
  }), [currentBusinessTier, isFreeTier, shouldShowBanner, loading]);

  return (
    <BusinessTierContext.Provider value={value}>
      {children}
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