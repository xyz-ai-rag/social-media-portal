"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useDateRange } from '@/context/DateRangeContext';
import { useBusinessTier } from '@/context/BusinessTierContext';
import { setStartOfDay, setEndOfDay } from '@/utils/timeUtils';
import { constructVercelURL } from '@/utils/generateURL';
import CompetitorComparisonBarChart from './CompetitorComparisonBarChart';

interface CompetitorComparisonStatsProps {
  businessId: string;
  competitorId: string;
  competitorName: string;
}

interface PostsData {
  total: number;
  criticism: number;
  sentiments: {
    neutral: number;
    highly_positive: number;
    positive: number;
    highly_negative: number;
    negative: number;
  };
}

export default function CompetitorComparisonStats({ 
  businessId, 
  competitorId, 
  competitorName 
}: CompetitorComparisonStatsProps) {
  const [businessData, setBusinessData] = useState<PostsData | null>(null);
  const [competitorData, setCompetitorData] = useState<PostsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { clientDetails } = useAuth();
  const { isFreeTier } = useBusinessTier();
  const { dateRange } = useDateRange();

  // Get business name - use sample name for free tier
  const businessName = useMemo(() => {
    if (isFreeTier) {
      return "Sample Business"; // Use generic sample name for free tier
    }
    
    if (!clientDetails?.businesses) return "Your Business";
    const currentBiz = clientDetails.businesses.find(
      (biz) => biz.business_id === businessId
    );
    return currentBiz?.business_name || "Your Business";
  }, [clientDetails, businessId, isFreeTier]);

  // Process dates for API query
  const startDateProcessed = useMemo(
    () => setStartOfDay(dateRange.startDate),
    [dateRange.startDate]
  );
  const endDateProcessed = useMemo(
    () => setEndOfDay(dateRange.endDate),
    [dateRange.endDate]
  );
  
  const formattedStart = useMemo(
    () => format(new Date(dateRange.startDate), "MMM d yyyy"),
    [dateRange.startDate]
  );
  const formattedEnd = useMemo(
    () => format(new Date(dateRange.endDate), "MMM d yyyy"),
    [dateRange.endDate]
  );

  // Fetch posts data for both business and competitor
  useEffect(() => {
    const fetchComparisonData = async () => {
      if (!businessId || !competitorId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch data for both business and competitor
        const [businessResponse, competitorResponse] = await Promise.all([
          fetch(constructVercelURL(`/api/client-reporting/posts-count?businessId=${businessId}&level=business&startDate=${encodeURIComponent(startDateProcessed)}&endDate=${encodeURIComponent(endDateProcessed)}`)),
          fetch(constructVercelURL(`/api/client-reporting/posts-count?businessId=${competitorId}&level=business&startDate=${encodeURIComponent(startDateProcessed)}&endDate=${encodeURIComponent(endDateProcessed)}`))
        ]);

        if (!businessResponse.ok || !competitorResponse.ok) {
          throw new Error('Failed to fetch comparison data');
        }

        const [businessResult, competitorResult] = await Promise.all([
          businessResponse.json(),
          competitorResponse.json()
        ]);

        // Extract total data from the API response
        const businessTotals = businessResult.totals || {};
        const competitorTotals = competitorResult.totals || {};

        setBusinessData({
          total: businessTotals.totalPosts || 0,
          criticism: businessTotals.criticism || 0,
          sentiments: {
            neutral: businessTotals.neutral || 0,
            highly_positive: businessTotals.highly_positive || 0,
            positive: businessTotals.positive || 0,
            highly_negative: businessTotals.highly_negative || 0,
            negative: businessTotals.negative || 0
          }
        });

        setCompetitorData({
          total: competitorTotals.totalPosts || 0,
          criticism: competitorTotals.criticism || 0,
          sentiments: {
            neutral: competitorTotals.neutral || 0,
            highly_positive: competitorTotals.highly_positive || 0,
            positive: competitorTotals.positive || 0,
            highly_negative: competitorTotals.highly_negative || 0,
            negative: competitorTotals.negative || 0
          }
        });

      } catch (error) {
        console.error('Error fetching comparison data:', error);
        setError('Failed to load comparison data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchComparisonData();
  }, [businessId, competitorId, startDateProcessed, endDateProcessed]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-center h-64">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!businessData || !competitorData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center text-gray-500">
          <p>No data available for comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date range */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Performance Comparison
        </h2>
        <p className="text-sm text-gray-600">
          Data from {formattedStart} to {formattedEnd}
        </p>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#5D5FEF] rounded"></div>
            <span className="text-sm font-medium">{businessName}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#10B981] rounded"></div>
            <span className="text-sm font-medium">{competitorName}</span>
          </div>
        </div>
      </div>

      {/* Comparison Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Row 1 */}
        <CompetitorComparisonBarChart
          title="Total Posts"
          businessName={businessName}
          competitorName={competitorName}
          businessData={businessData.total}
          competitorData={competitorData.total}
        />
        
        <CompetitorComparisonBarChart
          title="Total Criticism"
          businessName={businessName}
          competitorName={competitorName}
          businessData={businessData.criticism}
          competitorData={competitorData.criticism}
        />
        
        <CompetitorComparisonBarChart
          title="Neutral Posts"
          businessName={businessName}
          competitorName={competitorName}
          businessData={businessData.sentiments.neutral}
          competitorData={competitorData.sentiments.neutral}
        />

        {/* Row 2 */}
        <CompetitorComparisonBarChart
          title="Highly Positive Posts"
          businessName={businessName}
          competitorName={competitorName}
          businessData={businessData.sentiments.highly_positive}
          competitorData={competitorData.sentiments.highly_positive}
        />
        
        <CompetitorComparisonBarChart
          title="Positive Posts"
          businessName={businessName}
          competitorName={competitorName}
          businessData={businessData.sentiments.positive}
          competitorData={competitorData.sentiments.positive}
        />
        
        <div className="min-h-64"></div> {/* Empty space like in Monthly KPIs */}

        {/* Row 3 */}
        <CompetitorComparisonBarChart
          title="Highly Negative Posts"
          businessName={businessName}
          competitorName={competitorName}
          businessData={businessData.sentiments.highly_negative}
          competitorData={competitorData.sentiments.highly_negative}
        />
        
        <CompetitorComparisonBarChart
          title="Negative Posts"
          businessName={businessName}
          competitorName={competitorName}
          businessData={businessData.sentiments.negative}
          competitorData={competitorData.sentiments.negative}
        />
      </div>
    </div>
  );
}