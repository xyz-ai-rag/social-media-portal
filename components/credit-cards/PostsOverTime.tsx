"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { format } from "date-fns";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";
import { useDateRange } from "@/context/DateRangeContext";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  LineChart,
  CanvasRenderer,
]);

interface PostsOverTimeProps {
  businessId: string;
  platform:string;
}

interface MonthlyData {
  month_year: string;
  total_posts: number;
  [key: string]: any;
}

export default function PostsOverTime({ businessId,platform }: PostsOverTimeProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
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

    async function fetchMonthlyData() {
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
          `/api/businesses/credit-cards/getPostsOverTime?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch posts over time data");
        }

        const data = await response.json();

        if (isCurrent) {
          setMonthlyData(data);
        }
      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching posts over time:", error);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchMonthlyData();

    return () => {
      isCurrent = false;
    };
  }, [businessId, startDateProcessed, endDateProcessed]);

  useEffect(() => {
    if (isLoading || !chartRef.current || monthlyData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const months = monthlyData.map((item) => item.month_year);
    const totalPostsData = monthlyData.map((item) => item.total_posts);

    const businesses = Object.keys(monthlyData[0] || {}).filter(
      (key) => !['month_year', 'year', 'month_num', 'month_start', 'total_posts'].includes(key)
    );

    const colors = [
      '#60A5FA', '#FCD34D', '#FBBF24', '#3B82F6', '#EC4899', '#EF4444',
      '#1E40AF', '#10B981', '#F87171', '#86EFAC', '#9CA3AF', '#1E3A8A', '#60A5FA',
    ];

    const businessSeries = businesses.map((business, index) => ({
      name: business,
      type: 'line',
      data: monthlyData.map((item) => item[business] || 0),
      smooth: true,
      lineStyle: {
        width: 2,
      },
      itemStyle: {
        color: colors[index % colors.length],
      },
      emphasis: {
        focus: 'series',
      },
    }));

    const series = [
      {
        name: 'TOTAL POSTS',
        type: 'line',
        data: totalPostsData,
        smooth: true,
        lineStyle: {
          width: 3,
        },
        itemStyle: {
          color: '#10B981',
        },
        emphasis: {
          focus: 'series',
        },
        z: 10,
      },
      ...businessSeries,
    ];

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
      },
      legend: {
        data: ['TOTAL POSTS', ...businesses],
        top: 0,
        orient: 'horizontal',
        itemGap: 15,
        itemWidth: 25,
        itemHeight: 14,
        textStyle: {
          fontSize: 12,
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '120',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: months,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Posts',
        axisLabel: {
          formatter: '{value}',
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
      ],
      series: series,
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [isLoading, monthlyData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="mb-2">
        <h2 className="text-base font-medium text-gray-800">Posts Over Time</h2>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Monthly post trends from {formattedStart} to {formattedEnd}
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : monthlyData.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-500">No data available for this period</p>
        </div>
      ) : (
        <div className="h-[450px]">
          <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </div>
  );
}