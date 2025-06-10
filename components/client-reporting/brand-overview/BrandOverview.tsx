import React, { useEffect, useState, useMemo } from 'react';
import LineGraph from "@/components/client-reporting/brand-overview/LineGraph";

import PlatformRingChart from '@/components/client-reporting/PlatformRingChart';
import PostFormatPieChart from '@/components/client-reporting/PostFormatPieChart';
import PostTypeChart from '@/components/client-reporting/PostTypeRingChart';
import HotelPostsTable from '@/components/client-reporting/brand-overview/HotelPostsTable';
import NegativeFeedbackBubbleChart from '@/components/client-reporting/brand-overview/NegativeFeedbackBubbleChart';
import NegativeFeedbackLineGraph from '@/components/client-reporting/brand-overview/NegativeFeedbackLineGraph';
import { useAuth } from '@/context/AuthContext';

interface BrandOverviewProps {
  clientId: string;
  businessId: string;
}

export default function BrandOverview({ clientId, businessId }: BrandOverviewProps) {

  const [earliestDate, setEarliestDate] = useState<string>("2024-06-01");
  const [latestDate, setLatestDate] = useState<string>("2025-06-01");
  const { clientDetails } = useAuth();
  const allBusinessIds = useMemo(
    () => clientDetails?.businesses.map((biz) => biz.business_id).join(",") || "",
    [clientDetails]
  );

  // Fetch date range when component mounts
  useEffect(() => {
    const fetchDateRange = async () => {
      if (!businessId) return;

      try {
        const response = await fetch(
          `/api/charts/dateRange`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch date range");
        }
        const data = await response.json();
        if (data.earliest_date && data.latest_date) {
          setEarliestDate(data.earliest_date);
          setLatestDate(data.latest_date);
        }
      } catch (error) {
        console.error("Error fetching date range:", error);
      }
    };

    fetchDateRange();
  } );
  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-[34px] font-bold text-[#5D5FEF]">
          Overview
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* line 1*/}
        <div className="md:col-span-3 w-full min-h-[340px] flex items-stretch">
          <LineGraph clientId={clientId} businessId={businessId} earliestDate={earliestDate} latestDate={latestDate} allBusinessIds={allBusinessIds} level={"monthly"} />
        </div>

        {/* line 2*/}
        <div className="md:col-span-1 min-h-64 flex items-stretch">
          <PlatformRingChart
            clientId={clientId}
            businessId={businessId}
            earliestDate={earliestDate}
            latestDate={latestDate}
            allBusinessIds={allBusinessIds}
            level={"monthly"} />
        </div>
        <div className="md:col-span-1 min-h-64 flex items-stretch">
          <PostFormatPieChart
            clientId={clientId}
            businessId={businessId}
            earliestDate={earliestDate}
            latestDate={latestDate}
            allBusinessIds={allBusinessIds}
            level={"monthly"} />
        </div>
        <div className="md:col-span-1 min-h-64 flex items-stretch">
          <PostTypeChart
            clientId={clientId}
            businessId={businessId}
            earliestDate={earliestDate}
            latestDate={latestDate}
            allBusinessIds={allBusinessIds}
            level={"monthly"} />
        </div>

        {/* line 3*/}
        <div className="md:col-span-1">
          <HotelPostsTable clientId={clientId} businessId={businessId} earliestDate={earliestDate} latestDate={latestDate} allBusinessIds={allBusinessIds} />
        </div>
        <div className="md:col-span-2">
          <NegativeFeedbackBubbleChart clientId={clientId} businessId={businessId} earliestDate={earliestDate} latestDate={latestDate} allBusinessIds={allBusinessIds} />
        </div>


        {/* line 4*/}
        <div className="md:col-span-3">
          <NegativeFeedbackLineGraph clientId={clientId} businessId={businessId} earliestDate={earliestDate} latestDate={latestDate} allBusinessIds={allBusinessIds} />
        </div>
      </div>
    </div>
  );
} 