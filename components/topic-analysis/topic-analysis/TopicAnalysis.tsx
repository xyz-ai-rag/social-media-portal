"use client"
import { FC, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { constructVercelURL } from "@/utils/generateURL";
import CirclePacking from './CirclePacking';
import TabSection from './TabSection';
import BarChart from './BarChart';
import { useSearchParams } from "next/navigation";
interface AnalysisProps {
  clientId: string;
  businessId: string;
}

const TopicAnalysis: FC<AnalysisProps> = ({
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

  const [isLoading, setIsLoading] = useState(true);

  // topics state
  const [topics, setTopics] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);

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

        // Fetch competitor details using the batch API
        const response = await fetch(
          constructVercelURL("/api/businesses/getBusinessTopicStats"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessId: businessId,
              topicType: getTopicType(activeTab),
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
        // Don't set an error message for users to see
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Clear request tracker when component unmounts
    return () => {
      requestTracker.current.clear();
    };
  }, [clientDetails, businessId, activeTab]);

  // Get the minimum count and maximum number of topics based on active tab
  const topicLimit = getTopicLimit(activeTab);
  const minCount = activeTab === 0 ? 2 : 0; // Keep minimum count = 2 for General, otherwise allow count = 1

  return (
    <div className="container mx-auto px-4">

      <h1 className="text-[34px] font-bold text-[#5D5FEF] mb-4">
        {`Analysis for ${businessName || "Business"}`}
      </h1>

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
        ) : (
          <div className="flex flex-col items-center p-2 w-full">
            <CirclePacking
              topics={topics}
              businessId={businessId}
              clientId={clientId}
              minCount={minCount}
              maxTopics={topicLimit}
              topicType={getTopicType(activeTab)}
            />
            <BarChart 
              topics={topics} 
              businessId={businessId} 
              clientId={clientId} 
              minCount={minCount}
              maxTopics={topicLimit}
              topicType={getTopicType(activeTab)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicAnalysis; 