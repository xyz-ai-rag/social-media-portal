"use client"
export const dynamic = 'force-dynamic';

import { FC, useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { constructVercelURL } from "@/utils/generateURL";
import CirclePacking from './CirclePacking';
import TabSection from './TabSection';
import BarChart from './BarChart';
import WordCloud from './WordCloud';
import { useSearchParams, useRouter } from "next/navigation";
import { TopicAnalysisOverviewTierBanner } from "@/components/TierBanner";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { useDateRange } from "@/context/DateRangeContext";

interface AnalysisProps {
  clientId: string;
  businessId: string;
}

const TopicAnalysis: FC<AnalysisProps> = ({
  clientId,
  businessId,
}) => {
  const { clientDetails } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { dateRange } = useDateRange();
  const requestTracker = useRef(new Set());

  const [businessName, setBusinessName] = useState<string>("");
  const [businessType, setBusinessType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [topics, setTopics] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [visualizationMode, setVisualizationMode] = useState<'bubble' | 'wordcloud'>('bubble');
  const [displayLanguage, setDisplayLanguage] = useState<'en' | 'zh'>('en');
  
  // Initialize from URL params or default to 'all'
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    searchParams.get("platform") || 'all'
  );

  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;

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
      case "Merchant Partnership":
        return 4;
      default:
        return 0;
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
      case 4:
        return "Merchant Partnership";
      default:
        return "General";
    }
  };

  const getTopicLimit = (tabIndex: number) => {
    switch (tabIndex) {
      case 0:
        return Infinity;
      case 1:
        return 30;
      case 2:
      case 3:
        return 50;
      case 4:
        return 50;
      default:
        return Infinity;
    }
  };

  const [activeTab, setActiveTab] = useState(getActiveTab(searchParams.get("topic_type")) || 0);
  
  useEffect(() => {
    setActiveTab(getActiveTab(searchParams.get("topic_type")) || 0);
  }, [searchParams]);

  // Sync platform state with URL params
  useEffect(() => {
    const platformParam = searchParams.get("platform");
    if (platformParam && platformParam !== selectedPlatform) {
      setSelectedPlatform(platformParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (clientDetails && businessId) {
      const business = clientDetails.businesses.find(
        (b) => b.business_id === businessId
      );
      if (business) {
        setBusinessName(business.business_name);
        setBusinessType(business.business_type);
      }
    }
  }, [clientDetails, businessId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!clientDetails || !businessId) return;

        const requestKey = `${businessId}_${getTopicType(activeTab)}_${startDate}_${endDate}_${selectedPlatform}`;

        if (requestTracker.current.has(requestKey)) {
          return;
        }
        
        requestTracker.current.add(requestKey);
        setIsLoading(true);
        
        // Define the special business IDs that should be mapped
        const MAPPED_BUSINESS_IDS = [
          "6d5c4b3a-2e1f-09a8-b7c6-5d4e3f2a1b0c",
          "8d9e0f1a-2b3c-4e5f-6a7b-8c9d0e1f2a3b",
          "3b4c5d6e-7f8a-90b1-c2d3-e4f5a6b7c8d9"
        ];

        const EXAMPLE_BUSINESS_ID = "a7b6c5d4-e3f2-1a0b-9c8d-7e6f5a4b3c2d";

        // Map the businessId if it's one of the special ones
        const mappedBusinessId = MAPPED_BUSINESS_IDS.includes(businessId) 
          ? EXAMPLE_BUSINESS_ID 
          : businessId;

        const response = await fetch(
          constructVercelURL("/api/businesses/getBusinessTopicStats"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessId: mappedBusinessId,
              topicType: getTopicType(activeTab),
              startDate: startDate,
              endDate: endDate,
              preferredLanguage: displayLanguage,
              platform: selectedPlatform === 'all' ? undefined : selectedPlatform,
            }),
          }
        );
        
        
        if (!response.ok) {
          throw new Error("Failed to fetch post topics");
        }

        const data = await response.json();
        console.log("checking data",data)
        setTopics(data.topics);
        setTotal(data.total);

      } catch (error) {
        console.error("Error fetching topics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    return () => {
      requestTracker.current.clear();
    };
  }, [clientDetails, businessId, activeTab, startDate, endDate, displayLanguage, selectedPlatform]);

  // Handler to update platform and URL
  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    
    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    if (platform === 'all') {
      params.delete('platform');
    } else {
      params.set('platform', platform);
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const topicLimit = getTopicLimit(activeTab);
  const minCount = activeTab === 0 ? 2 : 0;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-[34px] font-bold text-[#5D5FEF] mb-4">
        {`Topic Analysis for ${businessName || "Business"}`}
      </h1>

      {/* Date and Platform Filters */}
      <div className="mb-4 flex gap-4 items-end justify-end">
        <div>
          <DateRangePicker
            page="topic-analysis"
            businessId={businessId}
          />
        </div>
        <div className="w-64">
          <label htmlFor="platform-filter" className="block text-sm font-medium text-gray-700 mb-2">
            {/* Platform */}
          </label>
          <select
            id="platform-filter"
            value={selectedPlatform}
            onChange={(e) => handlePlatformChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          >
            <option value="all">All Platforms</option>
            <option value="xhs">Rednote</option>
            <option value="wb">Weibo</option>
            <option value="dy">Douyin</option>
          </select>
        </div>
      </div>

      <TopicAnalysisOverviewTierBanner />
      
      <TabSection
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        businessType={businessType}
        visualizationMode={visualizationMode}
        setVisualizationMode={setVisualizationMode}
        displayLanguage={displayLanguage}
        setDisplayLanguage={setDisplayLanguage}
      />
      
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
        ) : (
          <div className="flex flex-col items-center p-2 w-full">
            {visualizationMode === 'wordcloud' ? (
              <WordCloud
                topics={topics}
                businessId={businessId}
                clientId={clientId}
                minCount={minCount}
                maxTopics={topicLimit}
                topicType={getTopicType(activeTab)}
                displayLanguage={displayLanguage}
              />
            ) : (
              <>
                <CirclePacking
                  topics={topics}
                  businessId={businessId}
                  clientId={clientId}
                  minCount={minCount}
                  maxTopics={topicLimit}
                  topicType={getTopicType(activeTab)}
                  displayLanguage={displayLanguage}
                />
                <BarChart 
                  topics={topics} 
                  businessId={businessId} 
                  clientId={clientId} 
                  minCount={minCount}
                  maxTopics={topicLimit}
                  topicType={getTopicType(activeTab)}
                  displayLanguage={displayLanguage}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicAnalysis;