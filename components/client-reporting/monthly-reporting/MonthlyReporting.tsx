import React, { useEffect, useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import LineGraph from "@/components/client-reporting/brand-overview/LineGraph";
import PostsMonthlyTable from '@/components/client-reporting/monthly-reporting/PostsMonthlyTable';
import ComparisonBarChart from './ComparisonBarChart';
import SMPIProgressCircle from './SMPIProgressCircle';

interface MonthlyReportingProps {
  clientId: string;
  businessId: string;
}

export default function MonthlyReporting({ clientId, businessId }: MonthlyReportingProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [earliestDate, setEarliestDate] = useState<string>("2024-06-01");
  const [latestDate, setLatestDate] = useState<string>("2025-06-01");
  const [startDate, setStartDate] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const { clientDetails } = useAuth();

  const allBusinessIds = useMemo(
    () => clientDetails?.businesses.map((biz) => biz.business_id).join(",") || "",
    [clientDetails]
  );

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
          const earliestDateObj = parseISO(data.earliest_date);
          const latestDateObj = parseISO(data.latest_date);

          setEarliestDate(data.earliest_date);
          setLatestDate(data.latest_date);

          // Set the selected month to the latest month
          const latestMonth = format(latestDateObj, 'yyyy-MM');
          setSelectedMonth(latestMonth);

          // Set the start and end dates for the selected month
          const [year, month] = latestMonth.split('-').map(Number);
          const date = new Date(year, month - 1);
          setStartDate(format(startOfMonth(date), 'yyyy-MM-dd'));
          setEndDate(format(endOfMonth(date), 'yyyy-MM-dd'));
        }
      } catch (error) {
        console.error('Error fetching date range:', error);
      }
    };
    fetchDateRange();
  }, [businessId]);

  // Generate month options for dropdown
  const monthOptions = useMemo(() => {
    const options = [];
    let currentDate = parseISO(latestDate);
    const startDateObj = parseISO(earliestDate);

    while (currentDate >= startDateObj) {
      const monthStr = format(currentDate, 'yyyy-MM');
      const monthLabel = format(currentDate, 'MMMM yyyy');
      options.push({
        value: monthStr,
        label: monthLabel
      });
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
    }

    return options;
  }, [earliestDate, latestDate]);

  // Update date range when month changes
  useEffect(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1);
    setStartDate(format(startOfMonth(date), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(date), 'yyyy-MM-dd'));
  }, [selectedMonth]);

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[34px] font-bold text-[#5D5FEF]">Monthly KPIs: {businessName}</h1>
          <h1 className="text-[24px] font-bold text-[#5D5FEF]">{format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}</h1>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="md:col-span-1 w-full min-h-[340px] flex items-stretch">
            {/* TODO: Replace 70 with actual SMPI calculation */}
            <SMPIProgressCircle value={70} />
        </div>
        {/* Line chart showing posts per day */}
        <div className="md:col-span-2 w-full min-h-[340px] flex items-stretch">
          <LineGraph
            clientId={clientId}
            businessId={businessId}
            earliestDate={startDate}
            latestDate={endDate}
            allBusinessIds={allBusinessIds}
            level="daily"
          />
        </div>

         {/* Hotel posts table */}
        {/* <div className="md:col-span-3">
          <PostsMonthlyTable
            clientId={clientId}
            businessId={businessId}
            month={selectedMonth}
            allBusinessIds={allBusinessIds}
          />
        </div>  */}

        {/* Platform comparison charts */}
        <div className="md:col-span-1 min-h-64 flex items-stretch">
          <ComparisonBarChart
            title="Total Posts vs Last Month vs Average"
            param="Total"
            month={selectedMonth}
            businessId={businessId}
          />
        </div>

        <div className="md:col-span-1 min-h-64 flex items-stretch">
          <ComparisonBarChart
            title="Total Criticism vs Last Month vs Average"
            param="Criticism"
            month={selectedMonth}
            businessId={businessId}
          />
        </div>

        <div className="md:col-span-1 min-h-64 flex items-stretch">
          <ComparisonBarChart
            title="Neutral Posts vs Last Month vs Average"
            param="Neutral"
            month={selectedMonth}
            businessId={businessId}
          />
        </div>

        <div className="md:col-span-1 min-h-64 flex items-stretch">
          <ComparisonBarChart
            title="Highly Positive Posts vs Last Month vs Average"
            param="Highly Positive"
            month={selectedMonth}
            businessId={businessId}
          />
        </div>

        <div className="md:col-span-1 min-h-64 flex items-stretch">
          <ComparisonBarChart
            title="Positive Posts vs Last Month vs Average"
            param="Positive"
            month={selectedMonth}
            businessId={businessId}
          />
        </div>
        <div className="md:col-span-1 min-h-64 flex items-stretch"></div>

        <div className="md:col-span-1 min-h-64 flex items-stretch">
          <ComparisonBarChart
            title="Highly Negative Posts vs Last Month vs Average"
            param="Highly Negative"
            month={selectedMonth}
            businessId={businessId}
          />
        </div>

        <div className="md:col-span-1 min-h-64 flex items-stretch">
          <ComparisonBarChart
            title="Negative Posts vs Last Month vs Average"
            param="Negative"
            month={selectedMonth}
            businessId={businessId}
          />
        </div>
      </div>
    </div>
  );
} 