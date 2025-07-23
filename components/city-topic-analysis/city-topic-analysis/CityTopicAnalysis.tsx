"use client"
export const dynamic = 'force-dynamic';

import { FC, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { constructVercelURL } from "@/utils/generateURL";
import CirclePacking from './CirclePacking';
import TabSection from './TabSection';
import BarChart from './BarChart';
import { useSearchParams } from "next/navigation";
import { TopicAnalysisOverviewTierBanner } from "@/components/TierBanner";
import GroupedBarChart from './GroupedBarChart/GroupedBarChart';
import CitySpecificAnalysis from './Tabs/Tab2/CityAnalysis';
import Overview from './Tabs/Tab1/CityOverview';
import CityCriticisms from './Tabs/Tab3/CityCriticisms';
import CityCompliments from './Tabs/Tab4/CityCompliments';
interface AnalysisProps {
  clientId: string;
  businessId: string;
}

const CityTopicAnalysis: FC<AnalysisProps> = ({
  clientId,
  businessId,
}) => {
  // Get auth context to access similar businesses
  const { clientDetails } = useAuth();
  const searchParams = useSearchParams();

  // Add a ref to track API requests
  const requestTracker = useRef(new Set());

  // business name state
  const [businessName, setBusinessName] = useState<string>("");
  const [city, setCity] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);

  // topics state
  const [topics, setTopics] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [complimentTopics, setComplimentTopics] = useState<any[]>([]);
  const [criticismTopics, setCriticismTopics] = useState<any[]>([]);

  const [drillDownTopic, setDrillDownTopic] = useState<string | null>(null);


  // Map tab index to topic type
  const getActiveTab = (topicType: string | null) => {
    switch (topicType) {
      case "General":
        return 0;
      case "Specific":
        return 1;
      case "Criticism":
        return 2;
      case "Competitor":
        return 3;
    }
  };

  const getTopicType = (tabIndex: number) => {
    switch (tabIndex) {
      case 0:
        return "General";
      case 1:
        return "Specific";
      case 2:
        return "Criticism";
      case 3:
        return "Competitor";
      default:
        return "General";
    }
  };

  // Topic limits based on category
  const getTopicLimit = (tabIndex: number) => {
    switch (tabIndex) {
      case 0: // General
        return Infinity; // No limit for General
      case 1: // Specific
        return 30; // Maximum 30 topics
      case 2: // Criticism
      case 3: // Competitor
        return 50; // Maximum 50 topics
      default:
        return Infinity;
    }
  };

  // Add state for active tab
  const [activeTab, setActiveTabState] = useState(getActiveTab(searchParams.get("topic_type")) || 0);
  
  // Custom setActiveTab function with logging
  const setActiveTab = (tab: number) => {
    console.log('[CityTopicAnalysis] Tab change requested:', { from: activeTab, to: tab });
    setActiveTabState(tab);
  };
  
  // Debug: Log component re-renders
  console.log('[CityTopicAnalysis] Component rendered with:', {
    clientId,
    businessId,
    activeTab,
    hasClientDetails: !!clientDetails,
    clientDetailsLength: clientDetails?.businesses?.length,
    searchParams: searchParams.toString()
  });
  
  useEffect(() => {
    const newActiveTab = getActiveTab(searchParams.get("topic_type")) || 0;
    if (newActiveTab !== activeTab) {
      setActiveTabState(newActiveTab);
    }
  }, [searchParams]);

  // Update business name when business ID changes
  useEffect(() => {
    if (clientDetails && businessId && clientDetails.businesses?.length > 0) {
      const business = clientDetails.businesses.find(
        (b) => b.business_id === businessId
      );
      if (business) {
        setBusinessName(business.business_name);
      }
    }
  }, [clientDetails, businessId]);

  // Fetch topic data - just add request tracking
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!clientDetails || !businessId) return;
        
        // Create a cache key based on the current request parameters
        const requestKey = `${businessId}_${getTopicType(activeTab)}`;
        
        // Skip duplicate requests in the same render cycle
        if (requestTracker.current.has(requestKey)) {
          console.log('Skipping duplicate request:', requestKey);
          return;
        }
        
        // Add to request tracker
        requestTracker.current.add(requestKey);
        setIsLoading(true);
        
        // Fetch city topic data
        const response = await fetch(
          constructVercelURL(`/api/city-topics/getByBusiness?businessId=${businessId}`)
        );
        if (!response.ok) {
          throw new Error('Failed to fetch city topics');
        }
        const data = await response.json();
        setCity(data.business?.business_city || "");
        setTopics(data.topics);
        setTotal(data.total);
      } catch (error) {
        console.error("Error fetching city topics:", error);
        setCity("");
        setTopics([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch if we have all required data and they're stable
    if (clientDetails && businessId && clientDetails.businesses?.length > 0) {
      fetchData();
    }
    
    return () => {
      requestTracker.current.clear();
    };
    // eslint-disable-next-line
  }, [clientDetails, businessId, activeTab]);

  // 只在 City Overview tab 下请求两个 topic_type
  useEffect(() => {
    if (activeTab !== 0) return;
    
    const fetchTopics = async (topicType: string, setter: (topics: any[]) => void) => {
      try {
        const response = await fetch(
          constructVercelURL(`/api/city-topics/getByBusiness?businessId=${businessId}&topic_type=${topicType}`)
        );
        const data = await response.json();
        setter(data.topics || []);
      } catch (error) {
        console.error(`Error fetching ${topicType} topics:`, error);
        setter([]);
      }
    };
    
    // Only fetch if we have all required data and they're stable
    if (clientDetails && businessId && clientDetails.businesses?.length > 0) {
      fetchTopics("Compliment", setComplimentTopics);
      fetchTopics("Criticism", setCriticismTopics);
    }
    
    return () => {
      requestTracker.current.clear();
    };
    // eslint-disable-next-line
  }, [clientDetails, businessId, activeTab]);

  // Get the minimum count and maximum number of topics based on active tab
  const topicLimit = getTopicLimit(activeTab);
  const minCount = activeTab === 0 ? 2 : 0; // Keep minimum count = 2 for General, otherwise allow count = 1

  return (
    <div className="container mx-auto px-4">

      <h1 className="text-[34px] font-bold text-[#5D5FEF] mb-4">
        {`Analysis for ${city || "City"}`}
      </h1>

      {/* Tier-aware banner - positioned under title for better alignment */}
      <TopicAnalysisOverviewTierBanner />
      {/* Tab Section */}
      <TabSection
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      {/* Charts */}
      <div className="flex justify-center items-center min-h-[400px] w-full min-w-0">
        {isLoading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
            <span className="text-gray-400">Loading...</span>
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center">
            <div className="flex justify-center mb-6">
              <p className="text-gray-500">Total Count: {total}</p>
            </div>

            <p className="text-gray-500">No posts with these topics found</p>
          </div>

        ) : activeTab === 0 ? (
          <Overview
            complimentTopics={complimentTopics}
            criticismTopics={criticismTopics}
            businessId={businessId}
            clientId={clientId}
            minCount={minCount}
            topicLimit={topicLimit}
          />
        ) : activeTab === 1 ? (
          <CitySpecificAnalysis clientId={clientId} businessId={businessId} />
        ) : activeTab === 2 ? (
          <CityCriticisms
            businessId={businessId}
            clientId={clientId}
          />
        ) : activeTab === 3 ? (
          <CityCompliments
            businessId={businessId}
            clientId={clientId}
          />
        ) : activeTab === 4 ? (
          <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
            <h2 className="text-2xl font-bold mb-4">Other Cities</h2>
            <p className="text-gray-500">nothing here</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CityTopicAnalysis;
