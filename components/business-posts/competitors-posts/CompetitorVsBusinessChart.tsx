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
import { format } from "date-fns";

import { useAuth } from "@/context/AuthContext";
import { useDateRange } from "@/context/DateRangeContext";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";
import { constructVercelURL } from "@/utils/generateURL";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  LineChart,
  CanvasRenderer,
]);

// Define type for a daily count.
interface DailyCount {
  date: string; // e.g., '2025-04-01'
  count: number;
}

// Each business data returned from the API.
interface BusinessLineData {
  business_id: string;
  business_name: string;
  daily_counts: DailyCount[];
}

// The API returns an object with two keys.
interface LineGraphData {
  current: BusinessLineData;
  similar: BusinessLineData[];
}

interface CompetitorVsBusinessChartProps {
  businessId: string; // Current business id
  competitorId: string; // Selected competitor id
  competitorName: string; // Competitor name for display
}

export default function CompetitorVsBusinessChart({ 
  businessId, 
  competitorId, 
  competitorName 
}: CompetitorVsBusinessChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<LineGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get global client details from AuthContext.
  const { clientDetails } = useAuth();
  // Get date range from DateRangeContext.
  const { dateRange } = useDateRange();

  // Process dates for API query.
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

  // Get current business name
  const currentBusinessName = useMemo(() => {
    if (!clientDetails?.businesses) return "Your Business";
    const currentBiz = clientDetails.businesses.find(
      (biz) => biz.business_id === businessId
    );
    return currentBiz?.business_name || "Your Business";
  }, [clientDetails, businessId]);

  // Fetch data from the API route.
  useEffect(() => {
    let isCurrent = true; // Flag to control whether the request is still valid

    async function fetchLineData() {
      if (!competitorId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true); // Set loading state when the request is made

      try {
        // Use the competitor as the "similar business" to compare against current business
        const url = `/api/charts/line-graph?business_id=${encodeURIComponent(
          businessId
        )}&similar_business_ids=${encodeURIComponent(
          competitorId
        )}&start_date=${encodeURIComponent(
          startDateProcessed
        )}&end_date=${encodeURIComponent(endDateProcessed)}`;

        const res = await fetch(constructVercelURL(url));
        const data: LineGraphData = await res.json();

        // Only update state if this is the current request
        if (isCurrent) {
          setGraphData(data);
        }
      } catch (err) {
        if (isCurrent) {
          console.error("Error fetching competitor vs business chart data:", err);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchLineData();

    // Cleanup function: Mark the previous request as invalid when a new one is made
    return () => {
      isCurrent = false;
    };
  }, [businessId, competitorId, startDateProcessed, endDateProcessed]);

  // Build and initialize the chart using ECharts.
  useEffect(() => {
    if (isLoading || !chartRef.current || !graphData) return;

    const chart = echarts.init(chartRef.current);

    // Merge all dates from the current and competitor series.
    const allDatesSet = new Set<string>();
    [graphData.current, ...graphData.similar].forEach((biz) => {
      biz.daily_counts.forEach((dc) => allDatesSet.add(dc.date));
    });
    const sortedDates = Array.from(allDatesSet).sort(); // Ascending order

    // Build series for each business.
    const buildSeriesForBiz = (biz: BusinessLineData, isCurrentBusiness: boolean = false) => {
      const dateMap = new Map<string, number>();
      biz.daily_counts.forEach((dc) => dateMap.set(dc.date, dc.count));
      const seriesData = sortedDates.map((date) => dateMap.get(date) || 0);
      
      return {
        name: isCurrentBusiness ? currentBusinessName : competitorName,
        type: "line",
        data: seriesData,
        smooth: false,
        showSymbol: false,
        lineStyle: { 
          width: 3,
          color: isCurrentBusiness ? "#5D5FEF" : "#10B981" // Different colors for business vs competitor
        },
        itemStyle: {
          color: isCurrentBusiness ? "#5D5FEF" : "#10B981"
        }
      };
    };

    // Create series list with current business and competitor
    const seriesList = [
      buildSeriesForBiz(graphData.current, true), // Current business
      ...graphData.similar.map((biz) => buildSeriesForBiz(biz, false)) // Competitor(s)
    ];

    const option = {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        }
      },
      legend: {
        bottom: 0,
        left: 0,
        itemWidth: 12,
        itemHeight: 12,
        icon: "rect",
        textStyle: {
          fontSize: 12
        }
      },
      grid: {
        top: "8%",
        left: "3%",
        right: "4%",
        bottom: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: sortedDates,
        axisLabel: {
          formatter: (value: string) => value.slice(5), // Displays MM-DD
        },
        boundaryGap: false
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed" } },
      },
      series: seriesList,
    };

    chart.setOption(option);
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
  }, [isLoading, graphData, currentBusinessName, competitorName]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-80 flex items-center justify-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  if (!graphData || !competitorId) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-80 flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <p>Select a competitor to view comparison chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">
          Your Business vs {competitorName}
        </h2>
      </div>
      <div className="text-sm text-gray-600 mb-4">
        Posts from {formattedStart} to {formattedEnd}
      </div>
      <div className="h-72">
        <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}