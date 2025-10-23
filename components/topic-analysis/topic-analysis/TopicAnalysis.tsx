"use client"
export const dynamic = 'force-dynamic';

import { FC, useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { constructVercelURL } from "@/utils/generateURL";
import CirclePacking from './CirclePacking';
import TabSection from './TabSection';
import BarChart from './BarChart';
import WordCloud from './WordCloud';
import RadarChartView from './RadarChartView';
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
  const [similarBusinesses, setSimilarBusinesses] = useState<Array<{ business_id: string; business_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topics, setTopics] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  
  // Default to 'radar' for credit cards, 'bubble' for others
  const [visualizationMode, setVisualizationMode] = useState<'bubble' | 'wordcloud' | 'radar'>('bubble');
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

  // Set business details and similar businesses
  useEffect(() => {
    const fetchSimilarBusinesses = async () => {
      if (clientDetails && businessId) {
        const business = clientDetails.businesses.find(
          (b) => b.business_id === businessId
        );
        
        if (business) {
          setBusinessName(business.business_name);
          setBusinessType(business.business_type);
          
          // Set default visualization mode for credit cards
          if (business.business_type === 'Credit card' && visualizationMode === 'bubble') {
            setVisualizationMode('radar');
          }
          
          // Fetch similar business names using the batch API
          if (business.similar_businesses && Array.isArray(business.similar_businesses) && business.similar_businesses.length > 0) {
            try {
              const response = await fetch(
                constructVercelURL("/api/businesses/getBusinessName/batch"),
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    businessIds: business.similar_businesses,
                  }),
                }
              );

              if (!response.ok) {
                throw new Error("Failed to fetch similar businesses");
              }

              const data = await response.json();

              // Map the response and sort alphabetically
              const similarBizList = data.businesses
                .map((biz: any) => ({
                  business_id: biz.business_id,
                  business_name: biz.business_name,
                }))
                .sort((a: any, b: any) => a.business_name.localeCompare(b.business_name));

              setSimilarBusinesses(similarBizList);
            } catch (error) {
              console.error('Error fetching similar businesses:', error);
              setSimilarBusinesses([]);
            }
          } else {
            setSimilarBusinesses([]);
          }
        }
      }
    };

    fetchSimilarBusinesses();
  }, [clientDetails, businessId, visualizationMode]);

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

        const response = await fetch(
          constructVercelURL("/api/businesses/getBusinessTopicStats"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessId: businessId,
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

  // Determine if we should show radar charts
  const showRadarCharts = businessType === 'Credit card' && activeTab === 0 && visualizationMode === 'radar';

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
      
      <div className="flex justify-center items-center min-h-[400px] w-full min-w-0 overflow-visible">
        {showRadarCharts ? (
          // Show Radar Charts for Credit Cards on Overview tab
          <div className="w-full overflow-visible">
            <RadarChartView
              businessId={businessId}
              businessName={businessName}
              similarBusinesses={similarBusinesses}
              startDate={startDate}
              endDate={endDate}
              language={displayLanguage}
              platform={selectedPlatform === 'all' ? undefined : selectedPlatform}
            />
          </div>
        ) : isLoading ? (
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