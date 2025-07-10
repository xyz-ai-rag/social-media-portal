"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { format, parseISO } from "date-fns";
import { calculateSMPI, getSMPILabel, getSMPIColor } from "@/utils/smpi";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  LineChart,
  CanvasRenderer,
]);

interface MonthlyKPIData {
  [monthKey: string]: {
    total: number;
    criticism: number;
    sentiments: {
      highly_positive: number;
      positive: number;
      neutral: number;
      negative: number;
      highly_negative: number;
    };
  };
}

interface TotalData {
  totalPosts: number;
  criticism: number;
  highly_positive: number;
  positive: number;
  neutral: number;
  negative: number;
  highly_negative: number;
  countMonths: number;
}

interface BusinessSMPIData {
  business_id: string;
  business_name: string;
  monthlyData: MonthlyKPIData;
  totalData: TotalData;
}

interface HistoricalSMPIResponse {
  businesses: BusinessSMPIData[];
}

interface HistoricalSMPIProps {
  clientId: string;
  businessId?: string; // Optional single business ID
  allBusinessIds?: string; // Optional comma-separated business IDs
  level?: 'client' | 'business';
  selectedMonth: string; // Current month being viewed
}

// Helper function to prepare SMPI calculation inputs
function toSMPIInputs(monthData: any, totalData: any) {
  return {
    M: monthData?.total ?? 0,
    HP: monthData?.sentiments?.highly_positive ?? 0,
    P: monthData?.sentiments?.positive ?? 0,
    Neg: monthData?.sentiments?.negative ?? 0,
    HN: monthData?.sentiments?.highly_negative ?? 0,
    Crit: monthData?.criticism ?? 0,
    avg_M: (totalData?.totalPosts / totalData?.countMonths) || 0,
    avg_HP: (totalData?.highly_positive / totalData?.countMonths) || 0,
    avg_P: (totalData?.positive / totalData?.countMonths) || 0,
    avg_Neg: (totalData?.negative / totalData?.countMonths) || 0,
    avg_HN: (totalData?.highly_negative / totalData?.countMonths) || 0,
    avg_Crit: (totalData?.criticism / totalData?.countMonths) || 0,
  };
}

export default function HistoricalSMPI({ 
  clientId, 
  businessId, 
  allBusinessIds, 
  level = 'client',
  selectedMonth
}: HistoricalSMPIProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [smpiData, setSMPIData] = useState<HistoricalSMPIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch SMPI data from the API
  useEffect(() => {
    let isCurrent = true;

    async function fetchSMPIData() {
      setIsLoading(true);

      try {
        // Build URL based on level and business selection
        let url = `/api/client-reporting/posts-count?`;
        
        if (level === 'business' && businessId) {
          // Business level - single business
          url += `businessId=${businessId}&level=business`;
        } else if (allBusinessIds) {
          // Client level - all businesses or specific business
          if (businessId) {
            url += `businessId=${businessId}&level=business`;
          } else {
            url += `businessIds=${allBusinessIds}&level=client`;
          }
        } else {
          throw new Error('No business ID(s) provided');
        }

        console.log(`[HistoricalSMPI] API URL: ${url}`);

        const response = await fetch(url);
        
        if (!response.ok) {
          console.warn(`[HistoricalSMPI] API returned ${response.status}, using empty data`);
          // Don't throw error, just use empty data
          if (isCurrent) {
            setSMPIData({ 
              businesses: [{
                business_id: businessId || 'empty',
                business_name: 'Current Business',
                monthlyData: {},
                totalData: {
                  totalPosts: 0,
                  criticism: 0,
                  highly_positive: 0,
                  positive: 0,
                  neutral: 0,
                  negative: 0,
                  highly_negative: 0,
                  countMonths: 1
                }
              }]
            });
          }
          return;
        }
        
        const data = await response.json();
        console.log(`[HistoricalSMPI] Raw data:`, data);

        // Transform the data into the expected format
        let transformedData: HistoricalSMPIResponse;

        if (level === 'business' || businessId) {
          // Single business data
          transformedData = {
            businesses: [{
              business_id: businessId || 'single',
              business_name: 'Current Business',
              monthlyData: data.monthly || {},
              totalData: data.totals || {
                totalPosts: 0,
                criticism: 0,
                highly_positive: 0,
                positive: 0,
                neutral: 0,
                negative: 0,
                highly_negative: 0,
                countMonths: 1
              }
            }]
          };
        } else {
          // Multiple businesses - we'll need to fetch individual business data
          // For now, create aggregated data
          transformedData = {
            businesses: [{
              business_id: 'aggregated',
              business_name: 'All Businesses',
              monthlyData: data.monthly || {},
              totalData: data.totals || {
                totalPosts: 0,
                criticism: 0,
                highly_positive: 0,
                positive: 0,
                neutral: 0,
                negative: 0,
                highly_negative: 0,
                countMonths: 1
              }
            }]
          };
        }

        if (isCurrent) {
          setSMPIData(transformedData);
          console.log(`[HistoricalSMPI] Data loaded for ${transformedData.businesses.length} businesses`);
        }
      } catch (err) {
        if (isCurrent) {
          console.error("Error fetching SMPI data:", err);
          setSMPIData({ 
            businesses: [{
              business_id: 'error',
              business_name: 'Current Business',
              monthlyData: {},
              totalData: {
                totalPosts: 0,
                criticism: 0,
                highly_positive: 0,
                positive: 0,
                neutral: 0,
                negative: 0,
                highly_negative: 0,
                countMonths: 1
              }
            }]
          });
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    if (clientId && (businessId || allBusinessIds)) {
      fetchSMPIData();
    }

    return () => {
      isCurrent = false;
    };
  }, [clientId, businessId, allBusinessIds, level]);

  // Build and initialize the chart
  useEffect(() => {
    if (isLoading || !chartRef.current || !smpiData || !smpiData.businesses.length) return;

    const chart = echarts.init(chartRef.current);

    // Get all unique months across all businesses and sort them
    const allMonthsSet = new Set<string>();
    smpiData.businesses.forEach((business) => {
      Object.keys(business.monthlyData || {}).forEach(month => allMonthsSet.add(month));
    });
    
    // Filter out current month and sort
    const currentMonth = format(new Date(), 'yyyy-MM');
    const filteredMonths = Array.from(allMonthsSet).filter(month => month !== currentMonth);
    const sortedMonths = filteredMonths.sort();

    // Generate color palette
    function generateColorPalette(n: number) {
      if (n === 1) return ['#5D5FEF']; // Use primary color for single line
      return Array.from({ length: n }, (_, i) => `hsl(${(i * 360) / n}, 60%, 60%)`);
    }
    const colorPalette = generateColorPalette(smpiData.businesses.length);

    // Build series for each business
    const buildSeriesForBusiness = (business: BusinessSMPIData) => {
      const smpiValues = sortedMonths.map(month => {
        const monthData = business.monthlyData[month];
        if (!monthData) return 0;
        
        const inputs = toSMPIInputs(monthData, business.totalData);
        return calculateSMPI(inputs);
      });

      return {
        name: business.business_name,
        type: "line",
        data: smpiValues,
        smooth: false, // Explicitly disable smoothing
        showSymbol: true,
        symbolSize: 6,
        lineStyle: { 
          width: 3,
          type: 'solid' // Ensure solid straight lines
        },
        emphasis: {
          focus: 'series'
        },
        connectNulls: false, // Don't connect null values
        step: false // Ensure no step lines
      };
    };

    const seriesList = smpiData.businesses.map(business => buildSeriesForBusiness(business));

    const option = {
      color: colorPalette,
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: {
          color: '#374151'
        },
        formatter: function(params: any) {
          const month = params[0].axisValue;
          const monthDate = parseISO(month + '-01');
          const formattedMonth = format(monthDate, 'MMM yyyy');
          
          let html = `<div style="font-weight: bold; margin-bottom: 8px;">${formattedMonth}</div>`;
          
          params.forEach((item: any) => {
            const smpiValue = item.value;
            const smpiLabel = getSMPILabel(smpiValue);
            const smpiColor = getSMPIColor(smpiValue);
            
            html += `<div style="margin-bottom: 4px;">
              <span style="display:inline-block;margin-right:8px;border-radius:50%;width:8px;height:8px;background:${item.color}"></span>
              ${item.seriesName}: <span style="font-weight: bold; color: ${smpiColor}">${smpiValue.toFixed(1)}</span>
              <span style="color: ${smpiColor}; margin-left: 4px;">(${smpiLabel})</span>
            </div>`;
          });
          
          return html;
        }
      },
      legend: {
        bottom: 0,
        left: 0,
        itemWidth: 12,
        itemHeight: 8,
        icon: "rect",
        textStyle: {
          fontSize: 12
        }
      },
      grid: {
        top: "8%",
        left: "3%",
        right: "4%",
        bottom: smpiData.businesses.length > 1 ? "20%" : "10%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: sortedMonths,
        axisLabel: {
          fontSize: 12,
          color: '#374151', // Darker color for better visibility
          formatter: (value: string) => {
            const date = parseISO(value + '-01');
            return format(date, 'MMM yy');
          },
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#6b7280', // Darker gray for better visibility
            width: 2
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: '#6b7280'
          }
        }
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        splitLine: { 
          lineStyle: { 
            type: "dashed",
            color: '#e5e7eb'
          } 
        },
        axisLabel: {
          fontSize: 12,
          color: '#374151', // Darker color for better visibility
          formatter: function(value: number) {
            return Math.round(value).toString();
          }
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#6b7280', // Darker gray for better visibility
            width: 2
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: '#6b7280'
          }
        }
      },
      series: seriesList
    };

    chart.setOption(option);

    // Highlight the current month
    if (selectedMonth && sortedMonths.includes(selectedMonth)) {
      const monthIndex = sortedMonths.indexOf(selectedMonth);
      chart.dispatchAction({
        type: 'highlight',
        dataIndex: monthIndex
      });
    }

    const resizeObserver = new window.ResizeObserver(() => {
      chart.resize();
    });
    
    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [isLoading, smpiData, selectedMonth]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center w-full">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  if (!smpiData || !smpiData.businesses || smpiData.businesses.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center w-full">
        <p className="text-gray-500">No SMPI data available</p>
      </div>
    );
  }

  const businessName = smpiData.businesses.length === 1 ? smpiData.businesses[0].business_name : '';
  const currentMonthDate = parseISO(selectedMonth + '-01');
  const formattedCurrentMonth = format(currentMonthDate, 'MMM yyyy');

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">
          Historical SMPI Trend
        </h2>
      </div>
      <div className="text-sm text-gray-600 mb-4">
        Social Media Performance Index over time
        {businessName && ` for ${businessName}`}
      </div>
      
      {/* SMPI Legend */}
      <div className="text-xs text-gray-500 mb-4 flex flex-wrap gap-4">
        <span className="flex items-center">
          <span className="w-3 h-3 bg-red-400 rounded-full mr-1"></span>
          0-25: Poor
        </span>
        <span className="flex items-center">
          <span className="w-3 h-3 bg-orange-400 rounded-full mr-1"></span>
          25-50: Below Average
        </span>
        <span className="flex items-center">
          <span className="w-3 h-3 bg-yellow-400 rounded-full mr-1"></span>
          50-75: Good
        </span>
        <span className="flex items-center">
          <span className="w-3 h-3 bg-green-400 rounded-full mr-1"></span>
          75-100: Excellent
        </span>
      </div>

      <div className="h-80">
        <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}