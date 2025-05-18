"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  LegendComponent
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useDateRange } from "@/context/DateRangeContext";
import { constructVercelURL } from "@/utils/generateURL";
import { format } from "date-fns";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";

// Register the required components
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  BarChart,
  CanvasRenderer,
  LegendComponent
]);

interface TopUsersProps {
  clientId: string;
  businessId: string;
}

interface UserPostCount {
  nickname: string;
  postCount: number;
  percentage?: number;
}

export default function TopUsers({ clientId, businessId }: TopUsersProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { dateRange } = useDateRange();
  const [topUsers, setTopUsers] = useState<UserPostCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Format the raw date strings for display
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
    const fetchTopUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          constructVercelURL(
            `/api/charts/getTopUsersStats?business_id=${businessId}&start_date=${startDateProcessed}&end_date=${endDateProcessed}`
          ),
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch top users data");
        }

        const data = await response.json();
        
        // Calculate total posts to determine percentages
        const totalPosts = data.reduce((sum: number, user: UserPostCount) => sum + user.postCount, 0);
        
        // Add percentage to each user
        const usersWithPercentage = data.map((user: UserPostCount) => ({
          ...user,
          percentage: Math.round((user.postCount / totalPosts) * 100)
        }));
        
        setTopUsers(usersWithPercentage);
      } catch (error) {
        console.error("Error fetching top users data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopUsers();
  }, [businessId, dateRange, startDateProcessed, endDateProcessed]);

  // Initialize and update the chart when data is loaded
  useEffect(() => {
    if (isLoading || !chartRef.current || topUsers.length === 0) return;

    // Sort users by post count (descending order for display)
    const sortedUsers = [...topUsers].sort((a, b) => b.postCount - a.postCount);
    
    const chart = echarts.init(chartRef.current);
    
    // Generate gradient colors for bars
    const colorStops = [
      { offset: 0, color: '#2196F3' },    // Start color
      { offset: 1, color: '#64B5F6' }     // End color
    ];

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params: any) {
          const data = params[0];
          return `${data.name}: ${data.data.value} posts`;
        }
      },
      grid: {
        left: '3%',
        right: '10%',
        bottom: '3%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          show: false  // Hide x-axis labels
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#eee'
          }
        },
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        }
      },
      yAxis: {
        type: 'category',
        inverse: true,  // This is the key change - invert the y-axis to show highest at top
        data: sortedUsers.map(user => user.nickname),
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        }
      },
      series: [
        {
          name: 'Posts',
          type: 'bar',
          data: sortedUsers.map(user => ({
            value: user.postCount,
            nickname: user.nickname,
            percentage: user.percentage
          })),
          barWidth: '50%',
          label: {
            show: true,
            position: 'right',
            formatter: function(params: any) {
              return params.data.percentage + '%';
            },
            fontSize: 12,
            color: '#666'
          },
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, colorStops),
            borderRadius: [0, 4, 4, 0]  // Rounded corners on right side
          }
        }
      ]
    };

    chart.setOption(option);
    
    // Handle window resize
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [isLoading, topUsers]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">Top Users</h2>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Top users from {formattedStart} to {formattedEnd}
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : topUsers.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">No users with multiple posts found</p>
        </div>
      ) : (
        <div className="h-64 mt-2">
          <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </div>
  );
}