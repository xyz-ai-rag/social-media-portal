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
;
interface PostTypeProps {
  businessId: string;
  platform:string
}

interface PostTypeStat {
  type: string;
  count: number;
  percentage: number;
  color?: string;
}

interface PostTypeData {
  postTypeStats: PostTypeStat[];
  totalCount: number;
}

export default function PostType({ businessId ,platform}: PostTypeProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [postTypeData, setPostTypeData] = useState<PostTypeData>({
    postTypeStats: [],
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const { dateRange } = useDateRange();

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

  useEffect(() => {
    let isCurrent = true;

    async function fetchPostTypeData() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          business_id: businessId,
          start_date: startDateProcessed,
          end_date: endDateProcessed,
        });
        // Add platform filter if not 'all'
        if (platform && platform !== 'all') {
          params.append('platform', platform);
        }
        const response = await fetch(
          `/api/businesses/credit-cards/getPostTypes?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch post type data");
        }

        const data = await response.json();

        if (isCurrent) {
          // Add colors to the data
          const statsWithColors = data.postTypeStats.map((stat: PostTypeStat) => ({
            ...stat,
            color: stat.type.toLowerCase() === 'video' ? '#8593ED' : '#5A6ACF',
          }));

        
          setPostTypeData({
            postTypeStats: statsWithColors,
            totalCount: data.totalCount,
          });
        }
      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching post type data:", error);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchPostTypeData();

    return () => {
      isCurrent = false;
    };
  }, [businessId, startDateProcessed, endDateProcessed]);

  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    const seriesData = postTypeData.postTypeStats.map((item) => ({
      name: item.type,
      value: item.count,
      itemStyle: { color: item.color },
      percentage: item.percentage,
    }));

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
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          data: seriesData,
        },
      ],
      graphic: {
        type: "text",
        left: "center",
        top: "center",
        style: {
          text:
            postTypeData.totalCount > 0
              ? `${postTypeData.totalCount.toLocaleString()}\nPosts`
              : "No Data",
          textAlign: "center",
          color: "#333",
          fontSize: 16,
          fontWeight: "bold",
        },
      },
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
  }, [isLoading, postTypeData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full min-h-[400px] flex flex-col">
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center w-full">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
          </div>
        ) : postTypeData.postTypeStats.length === 0 ? (
          <div className="h-64 flex items-center justify-center w-full">
            <p className="text-gray-500">No post type data available</p>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <h2 className="text-base font-medium text-gray-800">Post Type</h2>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Posts from {formattedStart} to {formattedEnd}
            </div>
            <div className="h-64 flex items-center justify-center w-full">
              <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
            </div>
            <div className="flex flex-wrap justify-center gap-10 mt-4 w-full">
              {postTypeData.postTypeStats.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className="w-4 h-4 mr-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-gray-800">
                    {item.type}
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