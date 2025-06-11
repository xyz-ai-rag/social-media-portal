"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { format, subMonths, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useDateRange } from '@/context/DateRangeContext';
import { setEndOfDay, setStartOfDay } from '@/utils/timeUtils';
import GroupedBarChart from '@/components/dashboard/GroupedBarChart/GroupedBarChart';
import PlatformRingChart from '../PlatformRingChart';
import PostTypeRingChart from '../PostTypeRingChart';
import PostFormatPieChart from '../PostFormatPieChart';
import TopicsMentionedChart from './TopicsMentionedChart';
import NegativeTopicsBubbleChart from './NegativeTopicsBubbleChart';
interface BusinessReportingProps {
  clientId: string;
  businessId: string;
}

export default function BusinessReporting({ clientId, businessId }: BusinessReportingProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [earliestDate, setEarliestDate] = useState<string>("2024-06-01");
  const [latestDate, setLatestDate] = useState<string>("2025-06-01");
  const { clientDetails } = useAuth();

  const businessName = useMemo(
    () => clientDetails?.businesses.find((biz) => biz.business_id === businessId)?.business_name || "",
    [clientDetails, businessId]
  );

  // Fetch date range when component mounts
  useEffect(() => {
    const fetchDateRange = async () => {
      try {
        const response = await fetch(`/api/charts/dateRange?business_id=${businessId}`);
        const data = await response.json();
        if (data.earliest_date && data.latest_date) {
          setEarliestDate(data.earliest_date);
          setLatestDate(data.latest_date);
        }
      } catch (error) {
        console.error('Error fetching date range:', error);
      }
    };
    fetchDateRange();
  }, [businessId]);

  const { dateRange } = useDateRange();

  const startDate = useMemo(
    () => setStartOfDay(dateRange.startDate),
    [dateRange.startDate]
  );
  const endDate = useMemo(
    () => setEndOfDay(dateRange.endDate),
    [dateRange.endDate]
  );

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[34px] font-bold text-[#5D5FEF]">Business Reporting: {businessName}</h1>
        </div>
        <DateRangePicker page="business-reporting" businessId={businessId} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

        {/* Line chart showing posts per day */}
        <div className="md:col-span-3 w-full min-h-[340px] flex items-stretch">
          <GroupedBarChart
            clientId={clientId}
            businessId={businessId}
          />
        </div>

        {/* Platform distribution */}
        <div className="md:col-span-1 w-full min-h-[340px] flex items-stretch">
          <PlatformRingChart
            level={"daily"}
            earliestDate={startDate}
            latestDate={endDate}
            allBusinessIds={businessId}
            clientId={clientId}
            businessId={businessId}
          />
        </div>

        <div className="md:col-span-1 min-h-64 flex items-stretch">
          <PostFormatPieChart
            clientId={clientId}
            businessId={businessId}
            earliestDate={startDate}
            latestDate={endDate}
            allBusinessIds={businessId}
            level={"daily"} />
        </div>


        {/* Post Type distribution */}
        <div className="md:col-span-1 w-full min-h-[340px] flex items-stretch">
          <PostTypeRingChart
            earliestDate={startDate}
            latestDate={endDate}
            allBusinessIds={businessId}
            clientId={clientId}
            businessId={businessId}
            level={"daily"}
          />
        </div>


        {/* Topics mentioned */}
        <div className="md:col-span-3 w-full flex items-stretch">
          <TopicsMentionedChart
            businessId={businessId}
          />
        </div>

        {/* Critical Feedback */}
        <div className="md:col-span-3 w-full min-h-[340px] flex items-stretch">
          <NegativeTopicsBubbleChart
            businessId={businessId}
            clientId={clientId}
            earliestDate={earliestDate}
            latestDate={latestDate}
            allBusinessIds={businessId}
          />
        </div>
      </div>


    </div>
  );
} 