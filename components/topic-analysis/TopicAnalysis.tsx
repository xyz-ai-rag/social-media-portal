"use client"
import { FC, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { constructVercelURL } from "@/utils/generateURL";
import CirclePacking from './CirclePacking';
import TabSection from './TabSection';
import BarChart from './BarChart';
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

  // Add state for active tab
  const [activeTab, setActiveTab] = useState(0);

  // business name state
  const [businessName, setBusinessName] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);

  // topics state
  const [topics, setTopics] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);

  // Map tab index to topic type
  const getTopicType = (tabIndex: number) => {
    switch (tabIndex) {
      case 0:
        return "General";
      case 1:
        return "Specific";
      case 2:
        return "Criticism";
      default:
        return "Competitor";
    }
  };

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

  // Fetch topic data
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!clientDetails || !businessId) return;

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
        console.error("Error fetching competitors:", error);
        // Don't set an error message for users to see
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientDetails, businessId, activeTab]);


  return (
    <>
      <h1 className="text-[34px] font-bold text-[#5D5FEF] mb-4">
        {`Analysis for ${businessName || "Business"}`}
      </h1>

      {/* Tab Section */}
      <TabSection
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="flex justify-center">
        <p className="text-gray-500">Total Count: {total}</p>
      </div>

      {/* Charts */}
      <div className="flex justify-center items-center min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
            <span className="text-gray-400">Loading...</span>
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" className="mb-2 text-gray-300">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-gray-500">No data available</p>
          </div>
        ) : (
          <div className="flex flex-col items-center p-2 w-full">
            <CirclePacking
              topics={topics}
              businessId={businessId}
              clientId={clientId}
              limit={2}
            />
            <BarChart topics={topics} businessId={businessId} clientId={clientId} limit={2} />
          </div>
        )}
      </div>
      、
    </>
  );
};

export default TopicAnalysis;
