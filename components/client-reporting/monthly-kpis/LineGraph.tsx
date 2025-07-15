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

import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  LineChart,
  CanvasRenderer,
]);

// Define type for a monthly count.
interface MonthlyCount {
  date: string; // e.g., '2025-04'
  count: number;
}

// Each business data returned from the API.
interface BusinessLineData {
  business_id: string;
  business_name: string;
  counts: MonthlyCount[];
}

// Updated API response structure
interface LineGraphData {
  businesses: BusinessLineData[];
}

interface LineGraphProps {
  clientId: string;
  businessId?: string; // Optional single business ID
  earliestDate: string;
  latestDate: string;
  allBusinessIds?: string; // Optional comma-separated business IDs
  date_level: string;
}

export default function LineGraph({ 
  clientId, 
  businessId, 
  earliestDate, 
  latestDate, 
  allBusinessIds, 
  date_level 
}: LineGraphProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<LineGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Process dates for API query.
  const startDateProcessed = useMemo(
    () => setStartOfDay(earliestDate),
    [earliestDate]
  );
  const endDateProcessed = useMemo(
    () => setEndOfDay(latestDate),
    [latestDate]
  );
  const formattedStart = useMemo(
    () => date_level === "daily" ? format(new Date(earliestDate), "MMM d") : format(new Date(earliestDate), "MMM yyyy"),
    [earliestDate, date_level]
  );
  const formattedEnd = useMemo(
    () => date_level === "daily" ? format(new Date(latestDate), "MMM d") : format(new Date(latestDate), "MMM yyyy"),
    [latestDate, date_level]
  );

  // Fetch data from the API route.
  useEffect(() => {
    let isCurrent = true; // Flag to control whether the request is still valid

    async function fetchLineData() {
      setIsLoading(true);

      try {
        // Build URL with proper parameter handling
        const params = new URLSearchParams({
          client_id: clientId,
          start_date: startDateProcessed,
          end_date: endDateProcessed,
          date_level: date_level // Fixed: was 'level' before
        });

        // Add business ID parameters based on what's provided
        if (businessId) {
          // Single business ID
          params.append('business_id', businessId);
          console.log(`[LineGraph Component] Using single businessId: ${businessId}`);
        } else if (allBusinessIds) {
          // Multiple business IDs
          params.append('business_ids', allBusinessIds);
          console.log(`[LineGraph Component] Using multiple businessIds: ${allBusinessIds}`);
        }
        // If neither is provided, API will fetch all businesses for the client

        const url = `/api/client-reporting/line-graph?${params.toString()}`;
        console.log(`[LineGraph Component] API URL: ${url}`);

        const res = await fetch(url);
        
        if (!res.ok) {
          throw new Error(`API request failed: ${res.status} ${res.statusText}`);
        }
        
        const data: LineGraphData = await res.json();

        // Sort businesses alphabetically by business_name before processing
        const sortedBusinesses = (data.businesses || []).sort((a: BusinessLineData, b: BusinessLineData) => 
          a.business_name.localeCompare(b.business_name)
        );

        // Process all businesses with cumulative counts
        const processedBusinesses = sortedBusinesses.map((business: BusinessLineData) => {
          let cumulative = 0;
          const cumulativeCounts = business.counts.map((dc: MonthlyCount) => {
            cumulative += dc.count;
            return {
              date: dc.date,
              count: cumulative
            };
          });

          return {
            business_id: business.business_id,
            business_name: business.business_name,
            counts: cumulativeCounts
          };
        });

        const processedData: LineGraphData = {
          businesses: processedBusinesses
        };

        // Only update state if this is the current request
        if (isCurrent) {
          setGraphData(processedData);
          console.log(`[LineGraph Component] Data loaded for ${processedData.businesses.length} businesses`);
        }
      } catch (err) {
        if (isCurrent) {
          console.error("Error fetching line graph data:", err);
          setGraphData({ businesses: [] }); // Set empty data on error
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    // Only fetch if we have the required data
    if (clientId && (businessId || allBusinessIds || (!businessId && !allBusinessIds))) {
      fetchLineData();
    }

    // Cleanup function: Mark the previous request as invalid when a new one is made
    return () => {
      isCurrent = false;
    };
  }, [clientId, businessId, allBusinessIds, startDateProcessed, endDateProcessed, date_level]);

  // Build and initialize the chart using ECharts.
  useEffect(() => {
    if (isLoading || !chartRef.current || !graphData || !graphData.businesses) return;

    const chart = echarts.init(chartRef.current);

    // Merge all months from all businesses.
    const allMonthsSet = new Set<string>();
    graphData.businesses.forEach((biz) => {
      biz.counts.forEach((mc) => allMonthsSet.add(mc.date));
    });
    const sortedMonths = Array.from(allMonthsSet).sort(); // Ascending order

    function generateColorPalette(n: number) {
      return Array.from({ length: n }, (_, i) => `hsl(${(i * 360) / n}, 60%, 60%)`);
    }
    const colorPalette = generateColorPalette(graphData.businesses.length);

    // Build series for each business.
    const buildSeriesForBiz = (biz: BusinessLineData) => {
      const monthMap = new Map<string, number>();
      biz.counts.forEach((mc) => monthMap.set(mc.date, mc.count));
      const seriesData = sortedMonths.map((month) => monthMap.get(month) || 0);
      return {
        name: biz.business_name,
        type: "line",
        data: seriesData,
        smooth: false,
        showSymbol: false,
        lineStyle: { width: 2 },
      };
    };

    const seriesList = graphData.businesses.map((biz) => buildSeriesForBiz(biz));

    const option = {
      color: colorPalette,
      tooltip: {
        trigger: "axis",
        confine: true,
        position: function (point: number[], params: any, dom: any, rect: any, size: any) {
          if (point[1] < size.contentSize[1] / 2) {
            return [point[0], point[1] + 10];
          }
          return [point[0], point[1] - size.contentSize[1] - 10];
        },
        formatter: function(params: any) {
          let html = `<div><b>${params[0].axisValue}</b></div>`;
          params.forEach((item: any) => {
            html += `<div><span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background:${item.color}"></span>${item.seriesName}: <b>${item.value.toLocaleString()}</b></div>`;
          });
          return html;
        }
      },
      legend: {
        bottom: 0,
        left: 0,
        itemWidth: 10,
        itemHeight: 10,
        icon: "rect",
      },
      grid: {
        top: "8%",
        left: "3%",
        right: "4%",
        bottom: "20%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: sortedMonths,
        axisLabel: {
          formatter: (value: string) => value, // YYYY-MM
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed" } },
        axisLabel: {
          formatter: function(value: number) {
            return value.toLocaleString();
          }
        }
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
  }, [isLoading, graphData]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center w-full">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  if (!graphData || !graphData.businesses || graphData.businesses.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center w-full">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">
          {date_level === "daily" ? "Daily Posts" : "Monthly Posts"}
        </h2>
      </div>
      <div className="text-sm text-gray-600 mb-4">
        Posts from {formattedStart} to {formattedEnd}
        {graphData.businesses.length === 1 && ` for ${graphData.businesses[0].business_name}`}
      </div>
      <div className="h-80">
        <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}