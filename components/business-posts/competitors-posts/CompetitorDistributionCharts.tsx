"use client";

import React, { useEffect, useState } from 'react';
import { constructVercelURL } from "@/utils/generateURL";
import { useDateRange } from "@/context/DateRangeContext";
import { useBusinessTier } from '@/context/BusinessTierContext';

interface CompetitorDistributionChartsProps {
  businessId: string;
  competitorId: string;
  competitorName: string;
}

interface PostData {
  platform: string;
  dbPlatform: string;
  contentType: string;
  postCategory: string | null; // API can return null
}

interface DistributionData {
  platforms: Record<string, number>;
  contentTypes: Record<string, number>;
  postTypes: Record<string, number>;
  total: number;
  validPostTypesTotal?: number;
}

interface ChartData {
  business: DistributionData;
  competitor: DistributionData;
  businessName: string;
  competitorName: string;
}

const CompetitorDistributionCharts: React.FC<CompetitorDistributionChartsProps> = ({
  businessId,
  competitorId,
  competitorName
}) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<{
    type: 'business' | 'competitor';
    category: string;
    count: number;
    chartType: string;
    x: number;
    y: number;
  } | null>(null);
  const { dateRange } = useDateRange();
  const { isFreeTier } = useBusinessTier();

  const yesterday = React.useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
  }, []);

  // Process dates
  const startDate = dateRange.startDate.split("T")[0];
  const endDate = dateRange.endDate.split("T")[0];

  const fetchDistributionData = async (targetBusinessId: string): Promise<DistributionData> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("businessId", targetBusinessId);
      queryParams.append("startDate", startDate);
      queryParams.append("endDate", new Date(endDate) > new Date(yesterday) ? yesterday : endDate);
      queryParams.append("pageSize", "1000"); // Get enough data for analysis

      const response = await fetch(
        constructVercelURL(`/api/businesses/getBusinessPosts?${queryParams.toString()}`)
      );

      if (!response.ok) {
        throw new Error("Failed to fetch distribution data");
      }

      const data = await response.json();
      const posts: PostData[] = data.posts || [];

      // Initialize counters
      const platforms: Record<string, number> = { 'Rednote': 0, 'Weibo': 0, 'Douyin': 0 };
      const contentTypes: Record<string, number> = { 'Text': 0, 'Video': 0 };
      const postTypes: Record<string, number> = { 'Organic': 0, 'Commercial': 0, 'Own Post': 0 };

      // Helper function to normalize post category with case-insensitive matching
      const normalizePostCategory = (category: string): string => {
        const normalizedCategory = category.toLowerCase().trim();
        
        // Map variations to standard categories - check for exact matches first
        if (normalizedCategory === 'organic post' || normalizedCategory === 'organic') return 'Organic';
        if (normalizedCategory === 'commercial post' || normalizedCategory === 'commercial') return 'Commercial';
        if (normalizedCategory === 'own post') return 'Own Post';
        
        // Check for partial matches
        if (normalizedCategory.includes('commercial')) return 'Commercial';
        if (normalizedCategory.includes('own')) return 'Own Post';
        if (normalizedCategory.includes('organic')) return 'Organic';
        
        // Default to Organic for unrecognized categories
        return 'Organic';
      };

      // Count distributions
      posts.forEach(post => {
        // Platform distribution
        if (post.platform && platforms.hasOwnProperty(post.platform)) {
          platforms[post.platform]++;
        }

        // Content type distribution
        if (post.contentType && contentTypes.hasOwnProperty(post.contentType)) {
          contentTypes[post.contentType]++;
        }

        // Post type distribution - exclude null/undefined/empty categories
        if (post.postCategory && post.postCategory.trim() !== '') {
          const normalizedCategory = normalizePostCategory(post.postCategory);
          if (postTypes.hasOwnProperty(normalizedCategory)) {
            postTypes[normalizedCategory]++;
          }
        }
        // Skip posts with null/undefined/empty postCategory - they won't be counted
      });

      return {
        platforms,
        contentTypes,
        postTypes,
        total: posts.length
      };
    } catch (error) {
      console.error(`Error fetching distribution data for ${targetBusinessId}:`, error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!businessId || !competitorId) return;

      setLoading(true);
      setError(null);

      try {
        // For free tier, use sample business IDs
        const effectiveBusinessId = isFreeTier ? "a7b6c5d4-e3f2-1a0b-9c8d-7e6f5a4b3c2d" : businessId;
        
        const [businessData, competitorData] = await Promise.all([
          fetchDistributionData(effectiveBusinessId),
          fetchDistributionData(competitorId)
        ]);

        setChartData({
          business: businessData,
          competitor: competitorData,
          businessName: isFreeTier ? "Example Business" : "Your Business",
          competitorName: competitorName
        });
      } catch (err) {
        setError("Failed to load distribution data");
        console.error("Error fetching distribution data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [businessId, competitorId, competitorName, startDate, endDate, yesterday, isFreeTier]);

  const renderHorizontalStackedChart = (
    title: string,
    businessData: Record<string, number>,
    competitorData: Record<string, number>,
    businessTotal: number,
    competitorTotal: number
  ) => {
    const categories = Object.keys(businessData);
    
    // Calculate percentages
    const businessPercentages = categories.map(cat => 
      businessTotal > 0 ? (businessData[cat] / businessTotal) * 100 : 0
    );
    const competitorPercentages = categories.map(cat => 
      competitorTotal > 0 ? (competitorData[cat] / competitorTotal) * 100 : 0
    );

    // Color scheme for different categories
    const colors = ['#3B82F6', '#10B981', '#8B5CF6']; // Blue, Green, Purple

    return (
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 relative">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        
        {/* Business Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">{chartData?.businessName}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8 flex overflow-hidden shadow-inner">
            {categories.map((category, index) => {
              const percentage = businessPercentages[index];
              return percentage > 0 ? (
                <div
                  key={`business-${category}`}
                  className="h-full flex items-center justify-center text-white text-xs font-medium transition-all duration-300 hover:brightness-110 cursor-pointer"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: colors[index % colors.length]
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredSegment({
                      type: 'business',
                      category,
                      count: businessData[category],
                      chartType: title,
                      x: rect.left + rect.width / 2,
                      y: rect.top
                    });
                  }}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  {/* Always show percentage text */}
                  <span className="truncate px-1">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              ) : null;
            })}
          </div>
        </div>

        {/* Competitor Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">{chartData?.competitorName}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-8 flex overflow-hidden shadow-inner">
            {categories.map((category, index) => {
              const percentage = competitorPercentages[index];
              return percentage > 0 ? (
                <div
                  key={`competitor-${category}`}
                  className="h-full flex items-center justify-center text-white text-xs font-medium transition-all duration-300 hover:brightness-110 cursor-pointer"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: colors[index % colors.length]
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredSegment({
                      type: 'competitor',
                      category,
                      count: competitorData[category],
                      chartType: title,
                      x: rect.left + rect.width / 2,
                      y: rect.top
                    });
                  }}
                  onMouseLeave={() => setHoveredSegment(null)}
                >
                  {/* Always show percentage text */}
                  <span className="truncate px-1">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              ) : null;
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {categories.map((category, index) => (
            <div key={category} className="flex items-center">
              <div
                className="w-3 h-3 rounded mr-2"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-xs text-gray-600">
                {category}
              </span>
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {hoveredSegment && hoveredSegment.chartType === title && (
          <div 
            className="fixed bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none z-50 shadow-lg"
            style={{
              left: hoveredSegment.x,
              top: hoveredSegment.y - 60,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-medium">{hoveredSegment.category}</div>
            <div>{hoveredSegment.count} posts</div>
            <div className="text-gray-300">
              {hoveredSegment.type === 'business' ? chartData?.businessName : chartData?.competitorName}
            </div>
            {/* Arrow pointing down */}
            <div 
              className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
            ></div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!chartData) return null;

  return (
    <div className="space-y-6 mb-6">
      {/* Platform Distribution */}
      {renderHorizontalStackedChart(
        "Platform Distribution",
        chartData.business.platforms,
        chartData.competitor.platforms,
        chartData.business.total,
        chartData.competitor.total
      )}

      {/* Content Type Distribution */}
      {renderHorizontalStackedChart(
        "Content Type Distribution",
        chartData.business.contentTypes,
        chartData.competitor.contentTypes,
        chartData.business.total,
        chartData.competitor.total
      )}

      {      /* Post Type Distribution */}
      {renderHorizontalStackedChart(
        "Post Type Distribution",
        chartData.business.postTypes,
        chartData.competitor.postTypes,
        chartData.business.validPostTypesTotal || (chartData.business.postTypes['Organic'] + chartData.business.postTypes['Commercial'] + chartData.business.postTypes['Own Post']),
        chartData.competitor.validPostTypesTotal || (chartData.competitor.postTypes['Organic'] + chartData.competitor.postTypes['Commercial'] + chartData.competitor.postTypes['Own Post'])
      )}
    </div>
  );
};

export default CompetitorDistributionCharts;