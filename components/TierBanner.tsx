"use client";

import React from 'react';
import { useTierBanner } from '@/context/BusinessTierContext';
import InfoBanner from '@/utils/InfoBanner';
import { 
  getBannerConfig, 
  BannerPageType, 
  renderBannerMessage,
  type BannerConfig 
} from '@/constants/bannerInfo';
import { format } from 'date-fns';

interface TierBannerProps {
  pageType: keyof typeof import('@/constants/bannerInfo').BANNER_MESSAGES | BannerPageType;
  className?: string;
  customConfig?: Partial<BannerConfig>;
  isModal?: boolean; // Add this prop to handle modal styling
}

export default function TierBanner({ 
  pageType,
  className = '',
  customConfig,
  isModal = false // Default to false for backward compatibility
}: TierBannerProps) {
  const { shouldShow, businessName, lastUpdated, loading } = useTierBanner();

  // Don't render anything if shouldn't show or still loading
  if (!shouldShow || loading) {
    return null;
  }

  // Get the banner configuration for this page type
  const bannerConfig = getBannerConfig(pageType as keyof typeof import('@/constants/bannerInfo').BANNER_MESSAGES);
  
  // Merge with any custom overrides
  const finalConfig = {
    ...bannerConfig,
    ...customConfig
  };

  // Format the last updated date if available
  const formattedLastUpdated = lastUpdated 
    ? format(new Date(lastUpdated), 'MMMM d, yyyy')
    : undefined;

  // Render the message (could be string or React node)
  const renderedMessage = renderBannerMessage(finalConfig, formattedLastUpdated);

  // Apply modal-specific styling
  const modalClasses = isModal 
    ? 'mb-4 text-left' // Reduced margin and force left alignment
    : 'mb-6';

  // Override icon for specific page types - use info icon but keep error styling for most pages
  const shouldUseInfoIcon = pageType !== 'DASHBOARD' && pageType !== 'TOPIC_ANALYSIS_OVERVIEW';
  
  // Override variant for specific page types - use error variant (red) for most pages
  // Dashboard keeps original variant, Topic Analysis Overview uses 'info' variant (blue)
  const shouldUseErrorVariant = pageType !== 'DASHBOARD' && pageType !== 'TOPIC_ANALYSIS_OVERVIEW';
  
  // Determine the effective variant with proper typing
  let effectiveVariant: 'info' | 'warning' | 'success' | 'error';
  if (pageType === 'TOPIC_ANALYSIS_OVERVIEW') {
    effectiveVariant = 'info'; // Force blue info variant for Topic Analysis Overview
  } else if (shouldUseErrorVariant) {
    effectiveVariant = 'error'; // Force red error variant for most other pages
  } else {
    effectiveVariant = finalConfig.variant as 'info' | 'warning' | 'success' | 'error'; // Keep original variant for Dashboard
  }
  
  // Add debugging
  console.log('TierBanner pageType:', pageType, 'shouldUseInfoIcon:', shouldUseInfoIcon, 'effectiveVariant:', effectiveVariant);
  
  return (
    <div className={`${modalClasses} ${className}`}>
      <InfoBanner
        variant={effectiveVariant}
        title={finalConfig.title}
        message={renderedMessage}
        isModal={isModal}
        forceInfoIcon={shouldUseInfoIcon} // Pass flag to force info icon
      />
    </div>
  );
}

// Specialized banner components for each page type
export function DashboardTierBanner(props?: { className?: string }) {
  return (
    <TierBanner
      pageType="DASHBOARD"
      className={props?.className}
    />
  );
}

export function TopicAnalysisOverviewTierBanner(props?: { className?: string }) {
  return (
    <TierBanner
      pageType="TOPIC_ANALYSIS_OVERVIEW"
      className={props?.className}
    />
  );
}

export function TopicAnalysisDrillDownTierBanner(props?: { className?: string }) {
  return (
    <TierBanner
      pageType="TOPIC_ANALYSIS_DRILL_DOWN"
      className={props?.className}
    />
  );
}

export function CompetitorsTierBanner(props?: { className?: string }) {
  return (
    <TierBanner
      pageType="COMPETITORS"
      className={props?.className}
    />
  );
}

export function BusinessPostsTierBanner(props?: { className?: string }) {
  return (
    <TierBanner
      pageType="BUSINESS_POSTS"
      className={props?.className}
    />
  );
}

export function BusinessPostsModalTierBanner(props?: { className?: string }) {
  return (
    <TierBanner
      pageType="BUSINESS_POSTS_MODAL"
      className={`mt-3 ${props?.className || ''}`} // Add top margin by default
      isModal={true} // Set modal flag to true
    />
  );
}

export function MonthlyKPIsTierBanner(props?: { className?: string }) {
  return (
    <TierBanner
      pageType="MONTHLY_KPIS"
      className={props?.className}
    />
  );
}

// Generic component that takes page type as prop
export function PageTierBanner({ 
  pageType, 
  className,
  isModal = false 
}: { 
  pageType: BannerPageType; 
  className?: string; 
  isModal?: boolean;
}) {
  return (
    <TierBanner
      pageType={pageType}
      className={className}
      isModal={isModal}
    />
  );
}