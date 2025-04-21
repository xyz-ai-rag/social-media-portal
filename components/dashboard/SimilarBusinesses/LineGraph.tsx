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

interface LineGraphProps {
  clientId: string;
  businessId: string; // Selected business id from the URL.
}

export default function LineGraph({ clientId, businessId }: LineGraphProps) {
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
    () => format(new Date(dateRange.startDate), "d MMM"),
    [dateRange.startDate]
  );
  const formattedEnd = useMemo(
    () => format(new Date(dateRange.endDate), "d MMM"),
    [dateRange.endDate]
  );
  // Derive the similar business ids from clientDetails:
  const { similar_businesses } = useMemo(() => {
    if (!clientDetails || !clientDetails.businesses)
      return { similar_businesses: [] as string[] };
    // Find the currently selected business in clientDetails using businessId.
    const currentBiz = clientDetails.businesses.find(
      (biz) => biz.business_id === businessId
    );
    // If found, use its similar_businesses array; else, return empty.
    return { similar_businesses: currentBiz?.similar_businesses || [] };
  }, [clientDetails, businessId]);

  // Fetch data from the API route.
  useEffect(() => {
    let isCurrent = true; // Flag to control whether the request is still valid

    async function fetchLineData() {
      setIsLoading(true); // Set loading state when the request is made

      try {
        // Pass the current business id separately and the similar business ids as a comma-separated list.
        const similarBizParam = similar_businesses.join(",");
        const url = `/api/charts/line-graph?business_id=${encodeURIComponent(
          businessId
        )}&similar_business_ids=${encodeURIComponent(
          similarBizParam
        )}&start_date=${encodeURIComponent(
          startDateProcessed
        )}&end_date=${encodeURIComponent(endDateProcessed)}`;

        const res = await fetch(url);
        const data: LineGraphData = await res.json();

        // Only update state if this is the current request
        if (isCurrent) {
          setGraphData(data);
        }
      } catch (err) {
        if (isCurrent) {
          console.error("Error fetching line graph data:", err);
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
  }, [businessId, similar_businesses, startDateProcessed, endDateProcessed]);

  // Build and initialize the chart using ECharts.
  useEffect(() => {
    if (isLoading || !chartRef.current || !graphData) return;

    const chart = echarts.init(chartRef.current);

    // Merge all dates from the current and similar series.
    const allDatesSet = new Set<string>();
    [graphData.current, ...graphData.similar].forEach((biz) => {
      biz.daily_counts.forEach((dc) => allDatesSet.add(dc.date));
    });
    const sortedDates = Array.from(allDatesSet).sort(); // Ascending order

    // Build series for each business.
    const buildSeriesForBiz = (biz: BusinessLineData) => {
      const dateMap = new Map<string, number>();
      biz.daily_counts.forEach((dc) => dateMap.set(dc.date, dc.count));
      const seriesData = sortedDates.map((date) => dateMap.get(date) || 0);
      return {
        name: biz.business_name,
        type: "line",
        data: seriesData,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 2 },
      };
    };

    const seriesList = [
      buildSeriesForBiz(graphData.current),
      ...graphData.similar.map((biz) => buildSeriesForBiz(biz)),
    ];

    const option = {
      tooltip: {
        trigger: "axis",
      },
      legend: {
        bottom: 0,
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
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed" } },
      },
      series: seriesList,
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [isLoading, graphData]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-64 flex items-center justify-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">
          Similar Businesses Comparison
        </h2>
      </div>
      <div className="text-sm text-gray-600 mb-4">
        Posts from {formattedStart} to {formattedEnd}
      </div>
      <div className="h-64">
        <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
