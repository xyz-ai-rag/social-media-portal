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

// The API returns an object with two keys.
interface LineGraphData {
  similar: BusinessLineData[];
}

interface LineGraphProps {
  clientId: string;
  businessId: string; // Selected business id from the URL.
  earliestDate: string;
  latestDate: string;
  allBusinessIds: string;
  level: string;
}

export default function LineGraph({ clientId, businessId, earliestDate, latestDate, allBusinessIds, level }: LineGraphProps) {
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
    () => level === "daily" ? format(new Date(earliestDate), "MMM d") : format(new Date(earliestDate), "MMM yyyy"),
    [earliestDate, level]
  );
  const formattedEnd = useMemo(
    () => level === "daily" ? format(new Date(latestDate), "MMM d") : format(new Date(latestDate), "MMM yyyy"),
    [latestDate, level]
  );

  // Fetch data from the API route.
  useEffect(() => {
    let isCurrent = true; // Flag to control whether the request is still valid

    async function fetchLineData() {
      setIsLoading(true); // Set loading state when the request is made

      try {
        // Pass the current business id separately and the similar business ids as a comma-separated list.
        const url = `/api/client-reporting/line-graph?business_id=${encodeURIComponent(
          businessId
        )}&all_business_ids=${encodeURIComponent(
          allBusinessIds
        )}&start_date=${encodeURIComponent(
          startDateProcessed
        )}&end_date=${encodeURIComponent(
          endDateProcessed
        )}&level=${encodeURIComponent(level)}`;

        const res = await fetch(url);
        const data = await res.json();

        // Process all businesses
        const graphData: LineGraphData = {
          similar: []
        };

        data.similar.forEach((business: { business_id: string; business_name: string; counts: MonthlyCount[] }) => {
          let cumulative = 0;
          const cumulativeCounts = business.counts.map((dc: MonthlyCount) => {
            cumulative += dc.count;
            return {
              date: dc.date,
              count: cumulative
            };
          });

          const processedBusiness: BusinessLineData = {
            business_id: business.business_id,
            business_name: business.business_name,
            counts: cumulativeCounts
          };

          graphData.similar.push(processedBusiness);
        });

        // Only update state if this is the current request
        if (isCurrent) {
          setGraphData(graphData);
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
  }, [businessId, startDateProcessed, endDateProcessed, allBusinessIds, level]);

  // Build and initialize the chart using ECharts.
  useEffect(() => {
    if (isLoading || !chartRef.current || !graphData) return;

    const chart = echarts.init(chartRef.current);

    // Merge all months from all businesses.
    const allMonthsSet = new Set<string>();
    graphData.similar.forEach((biz) => {
      biz.counts.forEach((mc) => allMonthsSet.add(mc.date));
    });
    const sortedMonths = Array.from(allMonthsSet).sort(); // Ascending order

    function generateColorPalette(n: number) {
      return Array.from({ length: n }, (_, i) => `hsl(${(i * 360) / n}, 60%, 60%)`);
    }
    const colorPalette = generateColorPalette(graphData.similar.length);

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

    const seriesList = [
      ...graphData.similar.map((biz) => buildSeriesForBiz(biz)),
    ];

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
          formatter: (value: string) => value, //  YYYY-MM
        },
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
  }, [isLoading, graphData]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center w-full">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">
          {level === "daily" ? "Monthly Posts" : "Total Posts"}
        </h2>
      </div>
      <div className="text-sm text-gray-600 mb-4">
        Posts from {formattedStart} to {formattedEnd}
      </div>
      <div className="h-80">
        <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
