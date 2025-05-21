"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as echarts from "echarts/core";
import { GraphChart, PieChart } from "echarts/charts";
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
// Import date range context.
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

interface PieChartProps {
  clientId: string;
  businessId: string;
}

export default function PieChartComponent({
  clientId,
  businessId,
}: PieChartProps) {
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

  // Fetch Pie data from the API route.
  useEffect(() => {
    let isCurrent = true; // Flag to control whether the request is still valid

    async function fetchPieData() {
      setIsLoading(true); // Set loading state when the request is made

      try {
        const url = `/api/charts/piechart?business_id=${encodeURIComponent(
          businessId
        )}&start_date=${encodeURIComponent(
          startDateProcessed
        )}&end_date=${encodeURIComponent(endDateProcessed)}`;

        const res = await fetch(url);
        const data = await res.json();

        // Only update state if this is the current request
        if (isCurrent) {
          let total = 0;
          if (Array.isArray(data)) {
            total = data.reduce((sum, item) => sum + item.value, 0);
          }

          // If the API already returns an array, then map each item to add a color (if missing)
          if (Array.isArray(data)) {
            const mappedData: PieDataItem[] = data.map((item: any) => ({
              ...item,
              color:
                item.color ||
                (item.name.toLowerCase() === "rednote"
                  ? "#5A6ACF"
                  : item.name.toLowerCase() === "weibo"
                  ? "#8593ED"
                  : item.name.toLowerCase() === "douyin"
                  ? "#C7CEFF"
                  : "#5470c6"),
              percentage:
                total > 0 ? Math.round((item.value / total) * 100) : 0,
            }));

            if (isCurrent) {
              setChartData(mappedData);
            }
          } else {
            if (isCurrent) {
              setChartData([]);
            }
          }
        }
      } catch (err) {
        if (isCurrent) {
          console.error("Error fetching Pie chart data:", err);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchPieData();

    // Cleanup function: Mark the previous request as invalid when a new one is made
    return () => {
      isCurrent = false;
    };
  }, [businessId, startDateProcessed, endDateProcessed]);

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
        formatter:
          "<div style='width:140px; height:89px'><span style='font-size:12px; color:white'>{b}</span> <br/><span style='font-size:12px; color:white; opacity:50%'>This week</span> <br/><br/> <span style='color:white; font-size:16px'>{c} posts</span></div>",
        backgroundColor: "#37375C",
        borderColor: "#ccc",
        borderWidth: 1,
      },
      legend: {
        bottom: "0%",
        left: "center",
        itemGap: 20,
        icon: "circle",
        formatter: function (name: string) {
          // Find the corresponding data item
          const item = chartData.find((item) => item.name === name);
          // Return name and percentage on separate lines
          return `{a|${name}}\n{b|${item?.percentage}%}`;
        },
        textStyle: {
          rich: {
            a: {
              fontSize: 14,
              lineHeight: 20,
              color: "#333",
              fontWeight: "normal",
              align: "center",
            },
            b: {
              fontSize: 12,
              lineHeight: 16,
              color: "#666",
              align: "center",
            },
          },
        },
      },
      series: [
        {
          name: "Platforms",
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
          text: totalPosts > 0 ? `${totalPosts}\nPosts` : "No Data",
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
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <h2 className="text-base font-medium text-gray-800 mb-2">
        Platform Distribution
      </h2>
      <div className="text-sm text-gray-600 mb-4">
        Posts from {format(new Date(dateRange.startDate), "MMM d yyyy")} to{" "}
        {format(new Date(dateRange.endDate), "MMM d yyyy")}
      </div>
      <div className="h-80">
        <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
