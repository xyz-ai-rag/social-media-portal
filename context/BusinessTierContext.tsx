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
  updateBusinessTier: (businessId: string) => Promise<void>;
}

const BusinessTierContext = createContext<BusinessTierContextType | undefined>(undefined);

interface BusinessTierProviderProps {
  children: ReactNode;
  businessId?: string; // Optional - can be passed from page level
}

export function BusinessTierProvider({ children, businessId }: BusinessTierProviderProps) {
  const { clientDetails } = useAuth();
  const [currentBusinessTier, setCurrentBusinessTier] = useState<BusinessTierInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch business tier information
  const fetchBusinessTier = async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/businesses/getBusinessTier?businessId=${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error('Failed to fetch business tier');
      
      const data = await response.json();
      
      setCurrentBusinessTier({
        businessId: data.business_id,
        businessName: data.business_name,
        isFreeTier: data.is_free_tier || false,
        lastUpdated: data.last_updated || null
      });
    } catch (error) {
      console.error('Error fetching business tier:', error);
      // Fallback to free tier if API fails (safer default)
      const fallbackName = clientDetails?.businesses?.find(
        b => b.business_id === id
      )?.business_name || 'Unknown Business';
      
      setCurrentBusinessTier({
        businessId: id,
        businessName: fallbackName,
        isFreeTier: true
      });
    } finally {
      setLoading(false);
    }
  };

  // Update business tier (can be called from components)
  const updateBusinessTier = async (id: string) => {
    await fetchBusinessTier(id);
  };

  // Fetch tier info when businessId changes
  useEffect(() => {
    if (businessId) {
      fetchBusinessTier(businessId);
    }
  }, [businessId, clientDetails]);

  // Computed values
  const isFreeTier = currentBusinessTier?.isFreeTier ?? true; // Default to free tier for safety
  const shouldShowBanner = isFreeTier && currentBusinessTier !== null;

  const value = useMemo(() => ({
    currentBusinessTier,
    isFreeTier,
    shouldShowBanner,
    loading,
    updateBusinessTier
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

// Hook for easy banner integration in components
export function useTierBanner() {
  const { shouldShowBanner, currentBusinessTier, loading } = useBusinessTier();
  
  return {
    shouldShow: shouldShowBanner,
    businessName: currentBusinessTier?.businessName,
    lastUpdated: currentBusinessTier?.lastUpdated, // Add lastUpdated
    loading
  };
}