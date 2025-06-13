// Fixed PostFormatPieChart Component - Client Level
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
  businessId?: string; // Optional - not used for client-level reporting
  earliestDate: string;
  latestDate: string;
  allBusinessIds: string;
  level: string;
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

export default function PostFormatPieChart({ 
  clientId, 
  businessId, // Not used for client-level
  earliestDate, 
  latestDate, 
  allBusinessIds, 
  level 
}: ContentTypeProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [contentTypeData, setContentTypeData] = useState<ContentTypeData>({
    contentTypeStats: [],
    totalCount: 0,
  });
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
    () => level === "monthly" ? format(new Date(earliestDate), "MMM yyyy") : format(new Date(earliestDate), "MMM d yyyy"),
    [earliestDate, level]
  );
  const formattedEnd = useMemo(
    () => level === "monthly" ? format(new Date(latestDate), "MMM yyyy") : format(new Date(latestDate), "MMM d yyyy"),
    [latestDate, level]
  );

  // Fetch content type data
  useEffect(() => {
    let isCurrent = true;

    async function fetchContentTypeData() {
      setIsLoading(true);

      try {
        // Use the existing API route that already works with business_ids
        const url = `/api/charts/getContentTypeStats?all_business_ids=${encodeURIComponent(
          allBusinessIds
        )}&start_date=${encodeURIComponent(
          startDateProcessed
        )}&end_date=${encodeURIComponent(endDateProcessed)}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (isCurrent) {
          // Ensure we have the expected structure
          setContentTypeData({
            contentTypeStats: data.contentTypeStats || [],
            totalCount: data.totalCount || 0
          });
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

    // Only fetch if we have the required data
    if (clientId && allBusinessIds) {
      fetchContentTypeData();
    }

    return () => {
      isCurrent = false;
    };
  }, [clientId, startDateProcessed, endDateProcessed, allBusinessIds]);

  // Initialize and configure the chart
  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // Color mapping - using colors from your example
    const typeColors: Record<string, string> = {
      'Video': '#2196F3',  // Blue
      'Text': '#00BCD4',   // Cyan/Teal
      'Image': '#4CAF50',  // Green
      'Audio': '#FF9800',  // Orange
      'Document': '#9C27B0', // Purple
    };

    // Map data for chart
    const seriesData = (contentTypeData?.contentTypeStats || []).map((item) => ({
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
        formatter: (params: any) => `${params.name}: ${params.data.count} posts`
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

    // Use ResizeObserver for better resize handling
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
  }, [isLoading, contentTypeData]);

  // Check if we have valid data
  const hasValidData = contentTypeData && 
                      contentTypeData.contentTypeStats && 
                      contentTypeData.contentTypeStats.length > 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full min-h-[400px] flex flex-col">
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center w-full">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
          </div>
        ) : !hasValidData ? (
          <div className="h-64 flex items-center justify-center w-full">
            <p className="text-gray-500">No content type data available</p>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <h2 className="text-base font-medium text-gray-800">Content Type</h2>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Content type from {formattedStart} to {formattedEnd}
            </div>
            <div className="h-64 flex items-center justify-center w-full">
              <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
            </div>
            {/* Legend below the chart - matching your example image */}
            <div className="flex flex-wrap justify-center gap-10 mt-4 w-full">
              {(contentTypeData?.contentTypeStats || []).map((stat, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className="w-4 h-4 mr-2"
                    style={{
                      backgroundColor: stat.type === 'Video' ? '#2196F3' :
                        stat.type === 'Text' ? '#00BCD4' :
                          stat.type === 'Image' ? '#4CAF50' :
                            stat.type === 'Audio' ? '#FF9800' :
                              '#9C27B0'
                    }}
                  />
                  <span className="text-sm font-medium text-gray-800">{stat.type}</span>
                  <span className="ml-1 text-sm text-gray-600">
                    ({(contentTypeData?.totalCount || 0) > 0 ? 
                      ((stat.count/(contentTypeData?.totalCount || 1))*100).toFixed(0) : 0}%)
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