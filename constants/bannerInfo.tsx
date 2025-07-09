// constants/bannerInfo.tsx

export interface BannerConfig {
  variant: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  message: string | ((lastUpdated?: string) => React.ReactNode);
  isDynamic?: boolean; // Flag to indicate if message needs dynamic data
}

// Helper function to create italic text with dynamic date
const createDynamicMessage = (
  firstPart: string,
  lastUpdatedPrefix: string = "Last update time was ",
  upgradePart: string = "Upgrade to get live data, updated daily."
) => {
  return (lastUpdated?: string) => (
    <>
      {firstPart}{" "}
      <em>
        {lastUpdatedPrefix}
        {lastUpdated || "June 30, 2025"}. {upgradePart}
      </em>
    </>
  );
};

export const BANNER_MESSAGES = {
  // Dashboard page banner
  DASHBOARD: {
    variant: 'info' as const,
    title: undefined,
    message: createDynamicMessage(
      "Data is updated daily for paid tiers. Data is updated every three days for free tier."
    ),
    isDynamic: true
  },

  // Topic Analysis Overview page
  TOPIC_ANALYSIS_OVERVIEW: {
    variant: 'error' as const,
    title: undefined,
    message: createDynamicMessage(
      "Data is updated daily for paid tiers. Data is updated every 3-7 days for free tier."
    ),
    isDynamic: true
  },

  // Topic Analysis Drill Down page (individual topic)
  TOPIC_ANALYSIS_DRILL_DOWN: {
    variant: 'error' as const,
    title: undefined,
    message: "Note - the data displayed below is sample data. Upgrade to get full Topic Analysis posts for this business",
    isDynamic: false
  },

  // Competitors page
  COMPETITORS: {
    variant: 'error' as const,
    title: undefined,
    message: "Note - the data displayed below is sample data. Upgrade to view Competitor Analysis and Competitor Posts.",
    isDynamic: false
  },

  // All Business Posts page
  BUSINESS_POSTS: {
    variant: 'error' as const,
    title: undefined,
    message: "Note - the data displayed below is sample data. Upgrade to get translations, sentiment and relevance for all posts for this business.",
    isDynamic: false
  },

  // Business Posts Modal (when viewing individual post details)
  BUSINESS_POSTS_MODAL: {
    variant: 'error' as const,
    title: undefined,
    message: "Note - the data displayed below is sample data. Upgrade to get translations for all posts for your business.",
    isDynamic: false
  },

  // Monthly KPIs page
  MONTHLY_KPIS: {
    variant: 'error' as const,
    title: undefined,
    message: "Note - the data displayed below is sample data. Upgrade to get Monthly and Historical KPIs for this business.",
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

// Helper function to render message with dynamic data
export const renderBannerMessage = (
  config: BannerConfig,
  lastUpdated?: string
): React.ReactNode => {
  if (config.isDynamic && typeof config.message === 'function') {
    return config.message(lastUpdated);
  }
  return config.message as string;
};