// Fixed PostTypeRingChart Component - Client Level
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { format } from "date-fns";

// Import helper functions from timeUtils.
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";
import { useDateRange } from "@/context/DateRangeContext";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer,
  GraphicComponent,
]);

interface PieDataItem {
  name: string;
  value: number;
  color?: string;
  percentage?: number; // Add percentage field
}

interface PostTypeRingChartProps {
  clientId: string;
  businessId: string;
}

export default function PostTypeRingChart({
  clientId,
  businessId,
}: PostTypeRingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartData, setChartData] = useState<PieDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get date range from context.
  const { dateRange } = useDateRange();

  // Process dates using helper functions from timeUtils.
  const startDateProcessed = useMemo(
    () => setStartOfDay(dateRange.startDate),
    [dateRange.startDate]
  );
  const endDateProcessed = useMemo(
    () => setEndOfDay(dateRange.endDate),
    [dateRange.endDate]
  );

  // Determine which business IDs to use
  const businessIdsToUse = useMemo(() => {
    if (businessId) {
      return businessId;
    }
  }, [businessId]);

  // Fetch Pie data from the API route.
  useEffect(() => {
    let isCurrent = true; // Flag to control whether the request is still valid

    async function fetchPieData() {
      setIsLoading(true);

      try {
        // If specific businessId is provided, use business_id parameter
        const url = `/api/client-reporting/category-chart?business_id=${encodeURIComponent(
          businessId
        )}&start_date=${encodeURIComponent(
          startDateProcessed
        )}&end_date=${encodeURIComponent(endDateProcessed)}`;

        const res = await fetch(url);
        const data = await res.json();
        const categoryData = data.categoryStats;

        // Only update state if this is the current request
        if (isCurrent) {
          const filtered = Array.isArray(categoryData)
            ? categoryData.filter(
                (item: any) => typeof item.count === "number" && item.count > 0
              )
            : [];
          const total = filtered.reduce((sum, item) => sum + item.count, 0);
          const mappedData: PieDataItem[] = filtered.map((item: any) => ({
            name: item.category,
            value: item.count,
            color:
              item.category.toLowerCase() === "organic post"
                ? "#5A6ACF"
                : item.category.toLowerCase() === "commercial post"
                ? "#8593ED"
                : item.category.toLowerCase() === "own post"
                ? "#C7CEFF"
                : item.category.toLowerCase() === "promotional post"
                ? "#9F7AEA"
                : item.category.toLowerCase() === "news post"
                ? "#68D391"
                : "#5470c6",
            percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
          }));
          setChartData(mappedData);
        }
      } catch (err) {
        if (isCurrent) {
          console.error("Error fetching Post Type chart data:", err);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    // Only fetch if we have the required data
    if (businessIdsToUse) {
      fetchPieData();
    }

    // Cleanup function: Mark the previous request as invalid when a new one is made
    return () => {
      isCurrent = false;
    };
  }, [startDateProcessed, endDateProcessed, businessId, businessIdsToUse]);

  // Initialize and configure the chart once data is loaded.
  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // Map chartData to series format.
    const seriesData = chartData.map((item) => ({
      name: item.name,
      value: item.value,
      itemStyle: { color: item.color },
      percentage: item.percentage,
    }));

    // Calculate the total posts for the center text.
    const totalPosts = chartData.reduce((sum, item) => sum + item.value, 0);

    const option = {
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          return `<div style='width:140px; height:50px'><span style='font-size:12px; color:white'>${
            params.name
          }</span> <br/> <span style='color:white; font-size:16px'>${params.value.toLocaleString()} posts</span></div>`;
        },
        backgroundColor: "#37375C",
        borderColor: "#ccc",
        borderWidth: 1,
      },
      series: [
        {
          name: "Post Types",
          type: "pie",
          radius: ["40%", "70%"], // donut style
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          data: seriesData,
        },
      ],
      // Add a graphic element in the center for total posts.
      graphic: {
        type: "text",
        left: "center",
        top: "center",
        style: {
          text:
            totalPosts > 0
              ? `${totalPosts.toLocaleString()}\nPosts`
              : "No Data",
          textAlign: "center",
          color: "#333",
          fontSize: 16,
          fontWeight: "bold",
        },
      },
    };

    chart.setOption(option);

    // Use ResizeObserver to listen for container size changes
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
  }, [isLoading, chartData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full min-h-[400px] flex flex-col">
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center w-full">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center w-full">
            <p className="text-gray-500">No post type data available</p>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <h2 className="text-base font-medium text-gray-800">Post Type</h2>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Posts from {format(new Date(dateRange.startDate), "MMM d yyyy")}{" "}
              to {format(new Date(dateRange.endDate), "MMM d yyyy")}
            </div>
            <div className="h-64 flex items-center justify-center w-full">
              <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
            </div>
            {/* Legend below the chart */}
            <div className="flex flex-wrap justify-center gap-10 mt-4 w-full">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className="w-4 h-4 mr-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-gray-800">
                    {item.name}
                  </span>
                  <span className="ml-1 text-sm text-gray-600">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
