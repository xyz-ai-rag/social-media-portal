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

interface PlatformRingChartProps {
  clientId: string;
  businessId: string;
  earliestDate: string;
  latestDate: string;
}

export default function PlatformRingChart({
  clientId,
  businessId,
  earliestDate,
  latestDate,
}: PlatformRingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartData, setChartData] = useState<PieDataItem[]>([]);
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
  () => format(new Date(earliestDate), "MMM d yyyy"),
  [earliestDate]
);
const formattedEnd = useMemo(
  () => format(new Date(latestDate), "MMM d yyyy"),
  [latestDate]
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
    <div className="bg-white p-6 rounded-lg shadow-md w-full min-h-[400px] flex flex-col">
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="h-80 flex items-center justify-center w-full">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center w-full">
            <p className="text-gray-500">No platform data available</p>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <h2 className="text-base font-medium text-gray-800">Platform Distribution</h2>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Posts from {formattedStart} to {formattedEnd}
            </div>
            <div className="h-80 flex items-center justify-center w-full">
              <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
            </div>
            {/* Legend below the chart */}
            <div className="flex flex-wrap justify-center gap-10 mt-4 w-full">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-gray-800">{item.name}</span>
                  <span className="ml-1 text-sm text-gray-600">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
