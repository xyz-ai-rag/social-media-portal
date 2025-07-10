"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isSameMonth } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import BusinessSelector from '../BusinessSelector';
import HistoricalSMPI from "@/components/client-reporting/monthly-kpis/HistoricalSMPI";
import ComparisonBarChart from './ComparisonBarChart';
import SMPIProgressCircle from './SMPIProgressCircle';
import { MonthlyKPIsTierBanner } from '@/components/TierBanner';

interface MonthlyReportingProps {
  clientId: string;
  businessId: string;
  level?: 'client' | 'business';
}

export default function MonthlyReporting({ clientId, businessId, level = 'client' }: MonthlyReportingProps) {
  // Get the last complete month as default (previous month)
  const lastCompleteMonth = useMemo(() => {
    return format(subMonths(new Date(), 1), 'yyyy-MM');
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(lastCompleteMonth);
  const [earliestDate, setEarliestDate] = useState<string>("2024-06-01");
  const [startDate, setStartDate] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedView, setSelectedView] = useState<'client' | 'business'>('client');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(businessId);
  const { clientDetails } = useAuth();
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [totalData, setTotalData] = useState<any>(null);

  const allBusinessIds = useMemo(
    () => clientDetails?.businesses?.map((biz) => biz.business_id).join(",") || "",
    [clientDetails]
  );

  const businessName = useMemo(
    () => clientDetails?.businesses?.find((biz) => biz.business_id === selectedBusinessId)?.business_name || "",
    [clientDetails, selectedBusinessId]
  );

  const clientName = useMemo(
    () => clientDetails?.client_name || "",
    [clientDetails]
  );

  // Determine title based on level and selected view
  const pageTitle = useMemo(() => {
    if (level === 'business') {
      return `Monthly KPIs: ${businessName}`;
    } else {
      if (selectedView === 'client') {
        return `Monthly KPIs: ${clientName} (All Businesses)`;
      } else {
        return `Monthly KPIs: ${businessName}`;
      }
    }
  }, [level, selectedView, businessName, clientName]);

  // Handle business selection within client context
  const handleBusinessChange = (newBusinessId: string) => {
    setSelectedBusinessId(newBusinessId);
  };

  useEffect(() => {
    setStartDate(format(parseISO(selectedMonth + '-01'), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(parseISO(selectedMonth + '-01')), 'yyyy-MM-dd'));
  }, [selectedMonth]);

  useEffect(() => {
    const fetchDateRange = async () => {
      try {
        const businessIdToUse = level === 'business' ? businessId : selectedBusinessId;
        const response = await fetch(`/api/charts/dateRange?business_id=${businessIdToUse}`);
        const data = await response.json();
        if (data.earliest_date && data.latest_date) {
          setEarliestDate(data.earliest_date);

          // Always set to last complete month, not current month
          setSelectedMonth(lastCompleteMonth);

          const [year, month] = lastCompleteMonth.split('-').map(Number);
          const date = new Date(year, month - 1);
          setStartDate(format(startOfMonth(date), 'yyyy-MM-dd'));
          setEndDate(format(endOfMonth(date), 'yyyy-MM-dd'));
        }
      } catch (error) {
        console.error('Error fetching date range:', error);
      }
    };
    fetchDateRange();
  }, [businessId, selectedBusinessId, level, lastCompleteMonth]);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        let url = `/api/client-reporting/posts-count?`;
        
        if (level === 'business') {
          url += `businessId=${businessId}&level=business`;
        } else {
          if (selectedView === 'client') {
            url += `businessIds=${allBusinessIds}&level=client`;
          } else {
            url += `businessId=${selectedBusinessId}&level=business`;
          }
        }

        console.log(`[MonthlyKPIS] Fetching data from: ${url}`);

        const calculateResponse = await fetch(url, { method: 'GET' });

        if (!calculateResponse.ok) {
          console.warn(`[MonthlyKPIS] API returned ${calculateResponse.status}, using empty data`);
          // Don't throw error, just use empty data
          setMonthlyData({});
          setTotalData({
            totalPosts: 0,
            criticism: 0,
            highly_positive: 0,
            positive: 0,
            neutral: 0,
            negative: 0,
            highly_negative: 0,
            countMonths: 1
          });
          return;
        }

        const calculatedData = await calculateResponse.json();
        console.log(`[MonthlyKPIS] Calculated data:`, calculatedData);
        
        // Ensure we have data structure even if empty
        setMonthlyData(calculatedData.monthly || {});
        setTotalData(calculatedData.totals || {
          totalPosts: 0,
          criticism: 0,
          highly_positive: 0,
          positive: 0,
          neutral: 0,
          negative: 0,
          highly_negative: 0,
          countMonths: 1
        });
      } catch (error) {
        console.error('Error fetching monthly data:', error);
        // Set default empty data structure
        setMonthlyData({});
        setTotalData({
          totalPosts: 0,
          criticism: 0,
          highly_positive: 0,
          positive: 0,
          neutral: 0,
          negative: 0,
          highly_negative: 0,
          countMonths: 1
        });
      }
    };
    fetchMonthlyData();
  }, [businessId, selectedBusinessId, allBusinessIds, level, selectedView]);

  // Generate month options for dropdown - exclude current month
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    
    // Start from last month, not current month
    let currentDate = subMonths(now, 1);
    const startDateObj = parseISO(earliestDate);

    while (currentDate >= startDateObj) {
      const monthStr = format(currentDate, 'yyyy-MM');
      const monthLabel = format(currentDate, 'MMM yyyy');
      
      // Only add complete months (not current month)
      if (monthStr !== currentMonth) {
        options.push({
          value: monthStr,
          label: monthLabel
        });
      }
      
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
    }

    return options;
  }, [earliestDate]);

  const lastMonthStr = format(subMonths(parseISO(selectedMonth + '-01'), 1), 'yyyy-MM');
  const sMPIForMonth = selectedMonth; // Use selected month directly since we're excluding current month

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[34px] font-bold text-[#5D5FEF]">{pageTitle}</h1>
          <h1 className="text-[24px] font-bold text-[#5D5FEF]">{format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}</h1>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {level === 'client' && (
            <>
              <select
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value as 'client' | 'business')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="client">Brand Level (All Businesses)</option>
                <option value="business">Business Level</option>
              </select>
              
              {selectedView === 'business' && (
                <select
                  value={selectedBusinessId}
                  onChange={(e) => handleBusinessChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {clientDetails?.businesses
                    ?.sort((a, b) => a.business_name.localeCompare(b.business_name))
                    .map((business) => (
                      <option key={business.business_id} value={business.business_id}>
                        {business.business_name}
                      </option>
                    ))}
                </select>
              )}
            </>
          )}
        
          {/* Month selector - only complete months */}
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
      <MonthlyKPIsTierBanner/>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch min-h-[340px]">
        <div className="md:col-span-1 w-full h-full flex flex-col justify-center">
          <SMPIProgressCircle
            selectedMonth={sMPIForMonth}
            lastMonthStr={lastMonthStr}
            monthlyData={monthlyData}
            totalData={totalData}
          />
        </div>
        <div className="md:col-span-2 w-full h-full flex items-stretch">
          <HistoricalSMPI
            clientId={clientId}
            businessId={
              level === 'business' ? businessId : 
              selectedView === 'business' ? selectedBusinessId : 
              undefined
            }
            allBusinessIds={
              level === 'client' && selectedView === 'client' ? allBusinessIds : undefined
            }
            level={level === 'business' ? 'business' : selectedView}
            selectedMonth={selectedMonth}
          />
        </div>

        {/* Platform comparison charts */}
        {monthlyData && (
          <>
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