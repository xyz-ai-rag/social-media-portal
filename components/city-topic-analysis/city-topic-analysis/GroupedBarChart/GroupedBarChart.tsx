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
import { calculateSMPI } from "@/utils/smpi";
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
  topic: string;
  smpi: number;
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
    () => format(new Date(dateRange.startDate), "MMM d yyyy"),
    [dateRange.startDate]
  );
  const formattedEnd = useMemo(
    () => format(new Date(dateRange.endDate), "MMM d yyyy"),
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
        const url = `/api/city-topics/getCityTopicSMPI?businessId=${businessId}`;
        const response = await fetch(url);
        const { topics } = await response.json();
        console.log('[GroupedBarChart] API返回 topics:', topics);

        const chartData = (topics || []).map((item: any) => ({
          topic: item.topic,
          smpi: calculateSMPI(item)
        }));

        if (isCurrent) {
          setChartData(chartData);
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

    return () => {
      isCurrent = false;
    };
  }, [businessId]);

  // Initialize and configure the chart once data is loaded.
  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // xAxis will show the dates.
    const xAxisData = chartData.map((record) => record.topic);
    // Data series: just one series with daily counts.
    const seriesData = chartData.map((record) => record.smpi);

    const option = {
      tooltip: {
        trigger: "axis",
        formatter: function(params: any) {
          const p = Array.isArray(params) ? params[0] : params;
          return `
            <div style='width:140px; height:59px'>
              <span style='font-size:12px; color:white'>${p.name}</span>
              <br/><br/>
              <span style='color:white; font-size:16px'>SMPI score: ${p.value}</span>
            </div>
          `;
        },
        backgroundColor: "#37375C", 
        borderColor: "#ccc",
        borderWidth: 1,
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
          rotate: 45,
          fontSize: 10,
          formatter: function (value: any) {
            return value;
          },
        },
        data: xAxisData, // such as ["Accommodations", "Shopping", ...]
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed" } },
        show: true,
        max: 100, // 固定最大高度为100
      },
      series: [
        {
          name: "SMPI score",
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
    <div className="bg-white p-6 rounded-lg shadow-md h-full w-full">
      {/* Title */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">SMPI KPI By Topic</h2>
      </div>
      {/* Subheading: show current month */}
      <div className="text-sm text-gray-600 mb-4">
        {format(new Date(), 'MMMM yyyy')}
      </div>
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : (
        <>
          <div className="h-64">
            <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
          </div>
        </>
      )}
    </div>
  );
}
