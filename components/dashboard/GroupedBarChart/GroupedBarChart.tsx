"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { format } from "date-fns";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";
// Import your DateRange context hook and a utility function if needed.
import { useDateRange } from "@/context/DateRangeContext";

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  CanvasRenderer,
]);

interface GroupedBarChartProps {
  clientId: string;
  businessId: string;
}

interface ChartRecord {
  date: string;
  count: number;
}

export default function GroupedBarChart({
  clientId,
  businessId,
}: GroupedBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartRecord[]>([]);

  // Get date range from context.
  const { dateRange } = useDateRange();

  // Format the raw date strings for display.
  const formattedStart = useMemo(
    () => format(new Date(dateRange.startDate), "MMM d"),
    [dateRange.startDate]
  );
  const formattedEnd = useMemo(
    () => format(new Date(dateRange.endDate), "MMM d"),
    [dateRange.endDate]
  );
  const startDateProcessed = useMemo(
    () => setStartOfDay(dateRange.startDate),
    [dateRange.startDate]
  );
  const endDateProcessed = useMemo(
    () => setEndOfDay(dateRange.endDate),
    [dateRange.endDate]
  );
  // Fetch daily posts data from the API.
  useEffect(() => {
    let isCurrent = true; // Flag to control whether the request is still valid

    async function fetchChartData() {
      setIsLoading(true); // Set loading state when the request is made

      try {
        const url = `/api/charts/grouped-bar-chart?business_id=${businessId}&start_date=${startDateProcessed}&end_date=${endDateProcessed}`;
        const response = await fetch(url);
        const data = await response.json();

        if (isCurrent) {
          setChartData(data); // Only update state if this is the current request
        } else {
          console.log("Ignore an invalid request");
        }
      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching chart data:", error);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchChartData();

    // Cleanup function: Mark the previous request as invalid when a new one is made
    return () => {
      isCurrent = false;
    };
  }, [businessId, startDateProcessed, endDateProcessed]);

  // Compute the total number of posts in the current period.
  const totalPosts = useMemo(
    () => chartData.reduce((sum, record) => sum + record.count, 0),
    [chartData]
  );

  // Initialize and configure the chart once data is loaded.
  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // xAxis will show the dates.
    const xAxisData = chartData.map((record) => record.date);
    // Data series: just one series with daily counts.
    const seriesData = chartData.map((record) => record.count);

    const option = {
      tooltip: {
        trigger: "axis",
        formatter:
          "<div style='width:140px; height:59px'><span style='font-size:12px; color:white'>{b}</span> <br/><br/><span style='color:white; font-size:16px'>{c} posts</span></div>",
        backgroundColor: "#37375C", // 修改背景颜色，支持透明度
        borderColor: "#ccc", // 设置边框颜色
        borderWidth: 1, // 设置边框宽度
      },
      legend: {
        show: false,
      },
      grid: {
        top: "8%",
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          formatter: function (value: any) {
            // Only store MM-DD
            return value.slice(5); // "2024-04-22" -> "04-22"
          },
        },
        data: xAxisData, // such as ["2024-04-20", "2024-04-21", "2024-04-22"]
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed" } },
        show: true,
      },
      series: [
        {
          name: "Posts",
          type: "bar",
          barWidth: "30%",
          data: seriesData,
          itemStyle: {
            color: "#5470c6",
            borderRadius: [2, 2, 0, 0],
          },
        },
      ],
    };

    chart.setOption(option);

    // Create a ResizeObserver to automatically resize the chart when container dimensions change
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
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      {/* Title */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">Posts Per Day</h2>
      </div>
      {/* Subheading: show date range */}
      <div className="text-sm text-gray-600 mb-4">
        Posts from {formattedStart} to {formattedEnd}
      </div>
      {/* Total Posts Display */}
      <div className="mb-4">
        <span className="text-2xl font-bold">{totalPosts}</span>
      </div>
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : (
        <div className="h-64">
          <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </div>
  );
}
