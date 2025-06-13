"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import BusinessSelector from '../BusinessSelector';
import LineGraph from "@/components/client-reporting/monthly-kpis/LineGraph";
import ComparisonBarChart from './ComparisonBarChart';
import SMPIProgressCircle from './SMPIProgressCircle';

interface MonthlyReportingProps {
  clientId: string;
  businessId: string;
}

export default function MonthlyReporting({ clientId, businessId }: MonthlyReportingProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [earliestDate, setEarliestDate] = useState<string>("2024-06-01");
  const [startDate, setStartDate] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const { clientDetails } = useAuth();
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [totalData, setTotalData] = useState<any>(null);

  const allBusinessIds = useMemo(
    () => clientDetails?.businesses?.map((biz) => biz.business_id).join(",") || "",
    [clientDetails]
  );

  const businessName = useMemo(
    () => clientDetails?.businesses?.find((biz) => biz.business_id === businessId)?.business_name || "",
    [clientDetails, businessId]
  );

  useEffect(() => {
    setStartDate(format(parseISO(selectedMonth + '-01'), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(parseISO(selectedMonth + '-01')), 'yyyy-MM-dd'));
  }, [selectedMonth]);

  useEffect(() => {
    const fetchDateRange = async () => {
      try {
        const response = await fetch(`/api/charts/dateRange?business_id=${businessId}`);
        const data = await response.json();
        if (data.earliest_date && data.latest_date) {
          setEarliestDate(data.earliest_date);

          // Set the selected month to the latest month
          const latestMonth = format(new Date(), 'yyyy-MM');
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

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        const url = `/api/client-reporting/posts-count?businessId=${businessId}`;
        const calculateResponse = await fetch(url, { method: 'GET' });

        if (!calculateResponse.ok) {
          throw new Error('Failed to calculate SMPI');
        }

        const calculatedData = await calculateResponse.json();
        console.log(`[MonthlyKPIS] Calculated data: ${JSON.stringify(calculatedData)}`);
        setMonthlyData(calculatedData.monthly);
        setTotalData(calculatedData.totals);
      } catch (error) {
        console.error('Error fetching monthly data:', error);
      }
    };
    fetchMonthlyData();
  }, [businessId]);

  // Generate month options for dropdown
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const thisMonthStr = format(now, 'yyyy-MM');
    let currentDate = parseISO(thisMonthStr + '-01');
    const startDateObj = parseISO(earliestDate);

    while (currentDate >= startDateObj) {
      const monthStr = format(currentDate, 'yyyy-MM');
      const monthLabel = format(currentDate, 'MMM yyyy');
      options.push({
        value: monthStr,
        label: monthLabel
      });
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
    }

    return options;
  }, [earliestDate]);

  const lastMonthStr = format(subMonths(parseISO(selectedMonth + '-01'), 1), 'yyyy-MM');
  const nowMonthStr = format(new Date(), 'yyyy-MM');
  const prevMonthStr = format(subMonths(new Date(), 1), 'yyyy-MM');
  const sMPIForMonth = selectedMonth === nowMonthStr ? prevMonthStr : selectedMonth;

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[34px] font-bold text-[#5D5FEF]">Monthly KPIs: {businessName}</h1>
          <h1 className="text-[24px] font-bold text-[#5D5FEF]">{format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <BusinessSelector 
            currentBusinessId={businessId}
            clientId={clientId}
            basePath="/monthly-kpis"
          />
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch min-h-[340px]">
        <div className="md:col-span-1 w-full h-full flex flex-col justify-center">
          <SMPIProgressCircle
            selectedMonth={sMPIForMonth}
            lastMonthStr={format(subMonths(parseISO(sMPIForMonth + '-01'), 1), 'yyyy-MM')}
            monthlyData={monthlyData}
            totalData={totalData}
          />
        </div>
        <div className="md:col-span-2 w-full h-full flex items-stretch">
          <LineGraph
            clientId={clientId}
            businessId={businessId}
            earliestDate={startDate}
            latestDate={endDate}
            allBusinessIds={allBusinessIds}
            level="daily"
          />
        </div>

        {/* Platform comparison charts */}
        {monthlyData && (
          <>
          {/* line 1 */}
            <div className="md:col-span-1 min-h-64 flex items-stretch">
              <ComparisonBarChart
                title="Total Posts vs Last Month vs Average"
                month={selectedMonth}
                thisMonthData={monthlyData[selectedMonth]?.total || 0}
                lastMonthData={monthlyData[lastMonthStr]?.total || 0}
                monthlyAvgData={(totalData?.totalPosts || 0)/(totalData?.countMonths || 1)}
              />
            </div>
            <div className="md:col-span-1 min-h-64 flex items-stretch">
              <ComparisonBarChart
                title="Total Criticism vs Last Month vs Average"
                month={selectedMonth}
                thisMonthData={monthlyData[selectedMonth]?.criticism || 0}
                lastMonthData={monthlyData[lastMonthStr]?.criticism || 0}
                monthlyAvgData={(totalData?.criticism || 0)/(totalData?.countMonths || 1)}
              />
            </div>
            <div className="md:col-span-1 min-h-64 flex items-stretch">
              <ComparisonBarChart
                title="Neutral vs Last Month vs Average"
                month={selectedMonth}
                thisMonthData={monthlyData[selectedMonth]?.sentiments?.neutral || 0}
                lastMonthData={monthlyData[lastMonthStr]?.sentiments?.neutral || 0}
                monthlyAvgData={(totalData?.neutral || 0)/(totalData?.countMonths || 1)}
              />
            </div>
            {/* line 2 */}
            <div className="md:col-span-1 min-h-64 flex items-stretch">
              <ComparisonBarChart
                title="Highly Positive Posts vs Last Month vs Average"
                month={selectedMonth}
                thisMonthData={monthlyData[selectedMonth]?.sentiments?.highly_positive || 0}
                lastMonthData={monthlyData[lastMonthStr]?.sentiments?.highly_positive || 0}
                monthlyAvgData={(totalData?.highly_positive || 0)/(totalData?.countMonths || 1)}
              />
            </div>
            <div className="md:col-span-1 min-h-64 flex items-stretch">
              <ComparisonBarChart
                title="Positive Posts vs Last Month vs Average"
                month={selectedMonth}
                thisMonthData={monthlyData[selectedMonth]?.sentiments?.positive || 0}
                lastMonthData={monthlyData[lastMonthStr]?.sentiments?.positive || 0}
                monthlyAvgData={(totalData?.positive || 0)/(totalData?.countMonths || 1)}
              />
            </div>
            <div className="md:col-span-1 min-h-64 flex items-stretch"></div>

            {/* line 3 */}
            <div className="md:col-span-1 min-h-64 flex items-stretch">
              <ComparisonBarChart
                title="Highly Negative Posts vs Last Month vs Average"
                month={selectedMonth}
                thisMonthData={monthlyData[selectedMonth]?.sentiments?.highly_negative || 0}
                lastMonthData={monthlyData[lastMonthStr]?.sentiments?.highly_negative || 0}
                monthlyAvgData={(totalData?.highly_negative || 0)/(totalData?.countMonths || 1)}
              />
            </div>
            <div className="md:col-span-1 min-h-64 flex items-stretch">
              <ComparisonBarChart
                title="Negative Posts vs Last Month vs Average"
                month={selectedMonth}
                thisMonthData={monthlyData[selectedMonth]?.sentiments?.negative || 0}
                lastMonthData={monthlyData[lastMonthStr]?.sentiments?.negative || 0}
                monthlyAvgData={(totalData?.negative || 0)/(totalData?.countMonths || 1)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}