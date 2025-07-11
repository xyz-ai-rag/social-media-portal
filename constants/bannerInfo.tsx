// constants/bannerInfo.tsx
import React from 'react';

export interface BannerConfig {
  variant: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  message: string | ((lastUpdated?: string) => React.ReactNode);
  isDynamic?: boolean; // Flag to indicate if message needs dynamic data
}

// Helper function to create dynamic message with bold text and upgrade link
const createDynamicMessage = (
  firstPart: string,
  lastUpdatedPrefix: string = "Last update was ",
  upgradePart: string = "Upgrade to get daily updates to your data."
) => {
  return (lastUpdated?: string) => (
    <>
      {parseMarkdownBold(firstPart)}{" "}
      {lastUpdatedPrefix}
      {lastUpdated || "May 5, 2025"}.{" "}
      <a 
        href="https://www.hyprdata.ai/upgrade" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline font-medium"
      >
        {upgradePart}
      </a>
    </>
  );
};

// Helper function to parse **text** into <strong>text</strong> and add upgrade links
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

// Helper function to add upgrade link to static messages
const addUpgradeLink = (text: string): React.ReactNode => {
  // Split the text at "Upgrade to" to make the upgrade sentence a link
  const upgradeIndex = text.lastIndexOf('Upgrade to');
  
  if (upgradeIndex === -1) {
    // No "Upgrade to" found, just parse bold text
    return parseMarkdownBold(text);
  }
  
  const beforeUpgrade = text.substring(0, upgradeIndex);
  const upgradeText = text.substring(upgradeIndex);
  
  return (
    <>
      {parseMarkdownBold(beforeUpgrade)}
      <a 
        href="https://www.hyprdata.ai/upgrade" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline font-medium"
      >
        {upgradeText}
      </a>
    </>
  );
};

export const BANNER_MESSAGES: Record<string, BannerConfig> = {
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
};

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

// Updated helper function to render message with dynamic data, bold parsing, and upgrade links
export const renderBannerMessage = (
  config: BannerConfig,
  lastUpdated?: string
): React.ReactNode => {
  if (config.isDynamic && typeof config.message === 'function') {
    // For dynamic messages (Dashboard and Topic Analysis Overview)
    // These already have upgrade links built-in via createDynamicMessage
    return config.message(lastUpdated);
  } 
  
  if (typeof config.message === 'string') {
    // For static messages, add upgrade links and parse bold formatting
    return addUpgradeLink(config.message);
  }
  
  // This should never happen based on our interface, but TypeScript needs it
  return null;
};