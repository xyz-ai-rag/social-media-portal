// constants/bannerInfo.tsx
import React from 'react';

export interface BannerConfig {
  variant: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  message: string | ((lastUpdated?: string) => React.ReactNode);
  isDynamic?: boolean; // Flag to indicate if message needs dynamic data
}

// Helper function to create dynamic message with bold text (no italics)
const createDynamicMessage = (
  firstPart: string,
  lastUpdatedPrefix: string = "Last update was ",
  upgradePart: string = "Upgrade to get daily updates to your data."
) => {
  return (lastUpdated?: string) => (
    <>
      {parseMarkdownBold(firstPart)}{" "}
      {lastUpdatedPrefix}
      {lastUpdated || "May 5, 2025"}. {upgradePart}
    </>
  );
};

// Helper function to parse **text** into <strong>text</strong>
const parseMarkdownBold = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*.*?\*\*)/);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Remove the ** and wrap in <strong>
          const boldText = part.slice(2, -2);
          return <strong key={index}>{boldText}</strong>;
        }
        return part;
      })}
    </>
  );
};

export const BANNER_MESSAGES = {
  // Dashboard page banner
  DASHBOARD: {
    variant: 'info' as const,
    title: undefined,
    message: createDynamicMessage(
      "Data below is updated **once a week** for the Free tier."
    ),
    isDynamic: true
  },

  // Topic Analysis Overview page
  TOPIC_ANALYSIS_OVERVIEW: {
    variant: 'info' as const,
    title: undefined,
    message: createDynamicMessage(
      "Data below is updated **once a week** for the Free tier."
    ),
    isDynamic: true
  },

  // Topic Analysis Drill Down page (individual topic)
  TOPIC_ANALYSIS_DRILL_DOWN: {
    variant: 'error' as const,
    title: undefined,
    message: "The data displayed below is **sample data**. Full topic analysis is not available in the Free tier. Upgrade to view all translated posts for each topic.",
    isDynamic: false
  },

  // Competitors page
  COMPETITORS: {
    variant: 'error' as const,
    title: undefined,
    message: "The data displayed below is **sample data**. Competitor comparison and analysis are not available in the Free tier. Upgrade to select and view competitor data.",
    isDynamic: false
  },

  // All Business Posts page
  BUSINESS_POSTS: {
    variant: 'error' as const,
    title: undefined,
    message: "The data displayed below is **sample data**. Post translations, sentiment analysis and critical feedback are not available in the Free tier. Upgrade to view all translated posts for this business.",
    isDynamic: false
  },

  // Business Posts Modal (when viewing individual post details)
  BUSINESS_POSTS_MODAL: {
    variant: 'error' as const,
    title: undefined,
    message: "The data displayed below is **sample data**. Post translations are not available in the Free tier. Upgrade to view all translated posts for this business.",
    isDynamic: false
  },

  // Monthly KPIs page
  MONTHLY_KPIS: {
    variant: 'error' as const,
    title: undefined,
    message: "The data displayed below is **sample data**. Monthly KPIs are not available in the Free tier. Upgrade to view full monthly and historical KPIs for this business.",
    isDynamic: false
  }
} as const;

// Helper function to get banner config by page type
export const getBannerConfig = (pageType: keyof typeof BANNER_MESSAGES): BannerConfig => {
  return BANNER_MESSAGES[pageType];
};

// Page type enum for better type safety
export enum BannerPageType {
  DASHBOARD = 'DASHBOARD',
  TOPIC_ANALYSIS_OVERVIEW = 'TOPIC_ANALYSIS_OVERVIEW',
  TOPIC_ANALYSIS_DRILL_DOWN = 'TOPIC_ANALYSIS_DRILL_DOWN',
  COMPETITORS = 'COMPETITORS',
  BUSINESS_POSTS = 'BUSINESS_POSTS',
  BUSINESS_POSTS_MODAL = 'BUSINESS_POSTS_MODAL',
  MONTHLY_KPIS = 'MONTHLY_KPIS'
}

// Alternative usage with enum
export const getBannerConfigByEnum = (pageType: BannerPageType): BannerConfig => {
  return BANNER_MESSAGES[pageType];
};

// Updated helper function to render message with dynamic data and bold parsing
export const renderBannerMessage = (
  config: BannerConfig,
  lastUpdated?: string
): React.ReactNode => {
  if (config.isDynamic && typeof config.message === 'function') {
    // For dynamic messages (Dashboard and Topic Analysis Overview)
    const dynamicMessage = config.message(lastUpdated);
    
    // Since our createDynamicMessage function returns JSX with string content,
    // and we need to parse ** in the first part, let's handle it differently
    // We'll modify createDynamicMessage to handle bold parsing internally
    return dynamicMessage;
  } else if (typeof config.message === 'string' && config.message.includes('**')) {
    // For static messages with ** bold formatting
    return parseMarkdownBold(config.message);
  }
  
  return config.message as string;
};