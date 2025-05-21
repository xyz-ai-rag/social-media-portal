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

// Import helper functions from timeUtils
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";
// Import date range context
import { useDateRange } from "@/context/DateRangeContext";
import { constructVercelURL } from "@/utils/generateURL";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  PieChart,
  CanvasRenderer,
  GraphicComponent,
]);

interface ContentTypeProps {
  clientId: string;
  businessId: string;
}

interface ContentTypeStat {
  type: string;
  count: number;
  percentage: number;
}

interface ContentTypeData {
  contentTypeStats: ContentTypeStat[];
  totalCount: number;
}

export default function ContentType({ clientId, businessId }: ContentTypeProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [contentTypeData, setContentTypeData] = useState<ContentTypeData>({
    contentTypeStats: [],
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Get date range from context
  const { dateRange } = useDateRange();

  // Format the raw date strings for display
  const formattedStart = useMemo(
    () => format(new Date(dateRange.startDate), "MMM d yyyy"),
    [dateRange.startDate]
  );
  const formattedEnd = useMemo(
    () => format(new Date(dateRange.endDate), "MMM d yyyy"),
    [dateRange.endDate]
  );

  // Process dates using helper functions from timeUtils
  const startDateProcessed = useMemo(
    () => setStartOfDay(dateRange.startDate),
    [dateRange.startDate]
  );
  const endDateProcessed = useMemo(
    () => setEndOfDay(dateRange.endDate),
    [dateRange.endDate]
  );

  // Fetch content type data
  useEffect(() => {
    let isCurrent = true;

    async function fetchContentTypeData() {
      setIsLoading(true);

      try {
        const response = await fetch(
          constructVercelURL(
            `/api/charts/getContentTypeStats?business_id=${businessId}&start_date=${startDateProcessed}&end_date=${endDateProcessed}`
          ),
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch content type data");
        }

        const data = await response.json();

        if (isCurrent) {
          setContentTypeData(data);
        }
      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching content type data:", error);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchContentTypeData();

    return () => {
      isCurrent = false;
    };
  }, [businessId, startDateProcessed, endDateProcessed]);

  // Initialize and configure the chart
  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // Color mapping - using colors from your example
    const typeColors: Record<string, string> = {
      'Video': '#2196F3',  // Blue
      'Text': '#00BCD4',   // Cyan/Teal
    };

    // Map data for chart
    const seriesData = contentTypeData.contentTypeStats.map((item) => ({
      name: item.type,
      value: item.percentage,
      count: item.count,
      itemStyle: { 
        color: typeColors[item.type] || '#9C27B0'  // Default to purple
      }
    }));

    const option = {
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c}% ({d}%)"
      },
      series: [
        {
          name: "Content Type",
          type: "pie",
          radius: "75%",  // Traditional full pie chart
          center: ["50%", "50%"],
          data: seriesData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)"
            }
          },
          label: {
            show: false  // Hide labels inside pie chart
          }
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [isLoading, contentTypeData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="mb-2">
        <h2 className="text-base font-medium text-gray-800">Content Type</h2>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Content type from {formattedStart} to {formattedEnd}
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : contentTypeData.contentTypeStats.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">No content type data available</p>
        </div>
      ) : (
        <div>
          <div className="h-64">
            <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
          </div>
          
          {/* Legend below the chart - matching your example image */}
          <div className="flex flex-wrap justify-center gap-10 mt-4">
            {contentTypeData.contentTypeStats.map((stat, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-4 h-4 mr-2" 
                  style={{ 
                    backgroundColor: stat.type === 'Video' ? '#2196F3' : 
                                      stat.type === 'Text' ? '#00BCD4' : 
                                      '#9C27B0' 
                  }} 
                />
                <span className="text-sm font-medium text-gray-800">{stat.type}</span>
                <span className="ml-1 text-sm text-gray-600">({stat.count} posts)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}