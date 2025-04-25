import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";
import { constructVercelURL } from "@/utils/generateURL";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";

interface CompetitorStatsCardProps {
  competitorId: string;
  competitorName: string;
  businessId: string; // The user's own business ID
  startDate: string;  // Start date string from parent component
  endDate: string;    // End date string from parent component
}

interface PostStats {
  totalPosts: number;
  postsPerPlatform: {
    [key: string]: number;
  };
  avgPostsPerDay: number;
  topHashtags: {
    tag: string;
    count: number;
    percentage: number;
  }[];
  negativeFeedback: string[];
}

const CompetitorStatsCard: React.FC<CompetitorStatsCardProps> = ({
  competitorId,
  competitorName,
  businessId,
  startDate,
  endDate
}) => {
  const { clientDetails } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competitorStats, setCompetitorStats] = useState<PostStats | null>(null);
  const [ownBusinessStats, setOwnBusinessStats] = useState<PostStats | null>(null);

  // Use the businessId prop as the current business ID
  const currentBusinessId = businessId;

  // Process the start and end dates
  const startDateProcessed = setStartOfDay(startDate);
  const endDateProcessed = setEndOfDay(endDate);

  // Calculate number of days in the period
  const daysInPeriod = Math.ceil(
    (new Date(endDateProcessed).getTime() - new Date(startDateProcessed).getTime()) / 
    (1000 * 60 * 60 * 24)
  ) + 1; // Add 1 to include both start and end dates

  // Format date manually for display
  const formatDate = (date: string) => {
    const d = new Date(date);
    const month = d.toLocaleString("default", { month: "short" });
    const day = d.getDate();
    return `${month} ${day}`;
  };

  // Function to fetch post statistics for a business
  const fetchPostStats = async (businessId: string): Promise<PostStats> => {
    // Fetch post count and platform breakdown
    const postsResponse = await fetch(
      constructVercelURL(
        `/api/businesses/getBusinessPostStats?businessId=${businessId}&startDate=${startDateProcessed}&endDate=${endDateProcessed}`
      )
    );
    
    if (!postsResponse.ok) {
      throw new Error(`Failed to fetch post stats for business ${businessId}`);
    }
    
    const postsData = await postsResponse.json();
    
    // Fetch hashtags
    const hashtagsResponse = await fetch(
      constructVercelURL(
        `/api/charts/hashtags?business_id=${businessId}&start_date=${startDateProcessed}&end_date=${endDateProcessed}`
      )
    );
    
    if (!hashtagsResponse.ok) {
      throw new Error(`Failed to fetch hashtags for business ${businessId}`);
    }
    
    const hashtagsData = await hashtagsResponse.json();
    
    // Fetch negative feedback
    const feedbackResponse = await fetch(
      constructVercelURL(
        `/api/businesses/getNegativeFeedback?businessId=${businessId}&startDate=${startDateProcessed}&endDate=${endDateProcessed}`
      )
    );
    
    if (!feedbackResponse.ok) {
      throw new Error(`Failed to fetch negative feedback for business ${businessId}`);
    }
    
    const feedbackData = await feedbackResponse.json();
    
    // Calculate avg posts per day
    const avgPostsPerDay = postsData.totalPosts / daysInPeriod;
    
    return {
      totalPosts: postsData.totalPosts,
      postsPerPlatform: postsData.platformBreakdown,
      avgPostsPerDay,
      topHashtags: hashtagsData,
      negativeFeedback: feedbackData.feedbackSummaries || []
    };
  };

  // Fetch data for both businesses
  useEffect(() => {
    const fetchData = async () => {
      if (!competitorId || !currentBusinessId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [competitorData, ownBusinessData] = await Promise.all([
          fetchPostStats(competitorId),
          fetchPostStats(currentBusinessId)
        ]);

        setCompetitorStats(competitorData);
        setOwnBusinessStats(ownBusinessData);
      } catch (err) {
        console.error("Error fetching statistics:", err);
        setError("Failed to load comparison data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [competitorId, currentBusinessId, startDateProcessed, endDateProcessed]);

  // Calculate percentage difference
  const calculateDifference = (competitorValue: number, ownValue: number) => {
    if (ownValue === 0) return competitorValue > 0 ? 100 : 0;
    return ((competitorValue - ownValue) / ownValue) * 100;
  };

  // Format percentage difference with + or - sign
  const formatDifference = (diff: number) => {
    const formattedValue = Math.abs(Math.round(diff));
    return diff >= 0 ? `+${formattedValue}%` : `-${formattedValue}%`;
  };

  // Render difference indicator with arrow
  const renderDifference = (diff: number, higherIsBetter = true) => {
    const isPositive = diff >= 0;
    const color = (isPositive && higherIsBetter) || (!isPositive && !higherIsBetter)
      ? "text-green-600"
      : "text-red-600";
    
    return (
      <span className={`flex items-center ${color} ml-2 text-sm font-medium`}>
        {isPositive ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
        {formatDifference(diff)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-64">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  if (error || !competitorStats || !ownBusinessStats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-500">{error || "Failed to load data"}</div>
      </div>
    );
  }
  const platformMapping: Record<string, string> = {
    'wb': 'Weibo',
    'xhs': 'Rednote',
    'dy': 'Douyin'
  };
  // Get all platform keys from both businesses
  const allPlatforms = [...new Set([
    ...Object.keys(competitorStats.postsPerPlatform),
    ...Object.keys(ownBusinessStats.postsPerPlatform)
  ])];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* <h2 className="text-xl font-bold mb-4">Competitor Analysis: {competitorName}</h2> */}
      
      {/* Date Range Display */}
      {/* <div className="text-sm text-gray-600 mb-4">
        Data from {formatDate(startDate)} to {formatDate(endDate)}
      </div> */}
      
      {/* Total Posts Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Posts during period</h3>
        <div className="flex items-baseline">
          <div className="text-3xl font-bold">{competitorStats.totalPosts}</div>
          {renderDifference(
            calculateDifference(competitorStats.totalPosts, ownBusinessStats.totalPosts)
          )}
        </div>
      </div>
      
      {/* Platform Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Platform Breakdown</h3>
        <div className="space-y-2">
            {allPlatforms.map(platform => {
            const competitorCount = competitorStats.postsPerPlatform[platform] || 0;
            const ownCount = ownBusinessStats.postsPerPlatform[platform] || 0;
            const diff = calculateDifference(competitorCount, ownCount);
            
            // Get the display name from the mapping or use the original platform name
            const displayName = platformMapping[platform] || platform;
            
            return (
              <div key={platform} className="flex justify-between items-center">
                <span className="font-medium">{platform}</span>
                <div className="flex items-baseline">
                  <span>{competitorCount}</span>
                  {renderDifference(diff)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Average Posts Per Day */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Avg posts per day</h3>
        <div className="flex items-baseline">
          <div className="text-2xl font-bold">
            {competitorStats.avgPostsPerDay.toFixed(1)}
          </div>
          {renderDifference(
            calculateDifference(
              competitorStats.avgPostsPerDay, 
              ownBusinessStats.avgPostsPerDay
            )
          )}
        </div>
      </div>
      
      {/* Top Hashtags */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Top Hashtags</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <h4 className="font-medium text-sm mb-1">{competitorName}</h4>
            <ul className="text-sm space-y-1">
              {competitorStats.topHashtags.length > 0 ? (
                competitorStats.topHashtags.slice(0, 5).map((tag, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{tag.tag}</span>
                    <span className="text-gray-600">{tag.count}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">No hashtags found</li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-1">Your Business</h4>
            <ul className="text-sm space-y-1">
              {ownBusinessStats.topHashtags.length > 0 ? (
                ownBusinessStats.topHashtags.slice(0, 5).map((tag, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{tag.tag}</span>
                    <span className="text-gray-600">{tag.count}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">No hashtags found</li>
              )}
            </ul>
          </div>
        </div>
      </div>
      
      {/* Negative Feedback */}
      {competitorStats.negativeFeedback.length > 0 && (
        <div>
            <h3 className="text-lg font-semibold mb-2">Negative Feedback Points</h3>
            <ul className="space-y-2 text-sm">
            {competitorStats.negativeFeedback.slice(0, 5).map((feedback, idx) => (
                <li key={idx} className="bg-red-50 p-2 rounded border-l-2 border-red-400">
                {feedback}
                </li>
            ))}
            </ul>
            {competitorStats.negativeFeedback.length > 5 && (
            <div className="mt-2 text-xs text-gray-500 italic">
                Showing 5 of {competitorStats.negativeFeedback.length} negative feedback points. 
                Use the &ldquo;Has negative feedback&rdquo; filter above to see posts with criticism.
            </div>
            )}
        </div>
        )}
    </div>
  );
};

export default CompetitorStatsCard;