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
import DateRangePicker from "./DateRangePicker";
import CitySpecificAnalysis from './Tabs/Tab2/CityAnalysis';
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
  const [activeTab, setActiveTab] = useState(getActiveTab(searchParams.get("topic_type")) || 0);
  useEffect(() => {
    setActiveTab(getActiveTab(searchParams.get("topic_type")) || 0);
  }, [searchParams]);

  // Update business name when business ID changes
  useEffect(() => {
    if (clientDetails && businessId) {
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
    if (clientDetails && businessId) {
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
      const response = await fetch(
        constructVercelURL(`/api/city-topics/getByBusiness?businessId=${businessId}&topic_type=${topicType}`)
      );
      const data = await response.json();
      setter(data.topics || []);
    };
    if (clientDetails && businessId) {
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
          <div className="flex flex-row gap-8 w-full">
            <div className="flex-1 flex flex-col items-center">
              <h2 className="text-lg font-bold mb-2">Compliments</h2>
              <div className="w-full h-[600px] flex justify-center items-center">
                <CirclePacking
                  topics={complimentTopics}
                  businessId={businessId}
                  clientId={clientId}
                  minCount={minCount}
                  maxTopics={topicLimit}
                  topicType="Compliment"
                />
              </div>
              <div className="h-6" />
              <div className="w-full">
                <BarChart
                  topics={complimentTopics}
                  businessId={businessId}
                  clientId={clientId}
                  minCount={minCount}
                  maxTopics={topicLimit}
                  topicType="Compliment"
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <h2 className="text-lg font-bold mb-2">Criticisms</h2>
              <div className="w-full h-[600px] flex justify-center items-center">
                <CirclePacking
                  topics={criticismTopics}
                  businessId={businessId}
                  clientId={clientId}
                  minCount={minCount}
                  maxTopics={topicLimit}
                  topicType="Criticism"
                />
              </div>
              <div className="h-6" />
              <div className="w-full">
                <BarChart
                  topics={criticismTopics}
                  businessId={businessId}
                  clientId={clientId}
                  minCount={minCount}
                  maxTopics={topicLimit}
                  topicType="Criticism"
                />
              </div>
            </div>
          </div>
        ) : activeTab === 1 ? (
          <CitySpecificAnalysis clientId={clientId} businessId={businessId} />
        ) : activeTab === 2 ? (
          <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
            <h2 className="text-2xl font-bold mb-4">Criticisms</h2>
            <p className="text-gray-500">敬请期待，或在此处添加你的自定义图表组件！</p>
          </div>
        ) : activeTab === 3 ? (
          <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
            <h2 className="text-2xl font-bold mb-4">Competitor</h2>
            <p className="text-gray-500">敬请期待，或在此处添加你的自定义图表组件！</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
            <h2 className="text-2xl font-bold mb-4">其它</h2>
            <p className="text-gray-500">敬请期待，或在此处添加你的自定义图表组件！</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CityTopicAnalysis;

function CityGeneralBubble({ businessId, clientId }: { businessId: string; clientId: string }) {
  const [bubbleData, setBubbleData] = useState<any[]>([]);
  useEffect(() => {
    async function fetchData() {
      const url = `/api/city-topics/getCityTopicSMPI?businessId=${businessId}&type=City_General`;
      const response = await fetch(url);
      const { topics } = await response.json();
      const totalCount = topics.reduce((sum: number, t: any) => sum + t.M, 0);
      setBubbleData(topics.map((item: any) => ({
        topic: item.topic,
        count: item.M,
        percentage: totalCount ? item.M / totalCount : 0
      })));
    }
    fetchData();
  }, [businessId]);
  if (!bubbleData.length) return null;
  return (
    <>
      <div className="w-full h-[600px] flex justify-center items-center">
        <CirclePacking
          topics={bubbleData}
          businessId={businessId}
          clientId={clientId}
          minCount={1}
          maxTopics={30}
          topicType="City_General"
        />
      </div>
      <div className="h-16" />
      <div className="w-full">
        <BarChart
          topics={bubbleData}
          businessId={businessId}
          clientId={clientId}
          minCount={1}
          maxTopics={30}
          topicType="City_General"
        />
      </div>
    </>
  );
} 