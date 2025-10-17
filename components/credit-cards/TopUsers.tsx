"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useDateRange } from "@/context/DateRangeContext";
import { format } from "date-fns";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  BarChart,
  CanvasRenderer,
]);

interface TopUsersProps {
  businessId: string;
  platform:string
}

interface UserData {
  nickname: string;
  post_count: number;
  percentage?: number;
}

export default function TopUsers({ businessId,platform }: TopUsersProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { dateRange } = useDateRange();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const fetchUsers = async () => {
      if (!dateRange.startDate || !dateRange.endDate) return;

      setLoading(true);
      setError(null);

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
          `/api/businesses/credit-cards/getTopUsers?${params.toString()}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch users");
        }

        const data = await response.json();
        
        // Calculate total posts to determine percentages
        const totalPosts = data.reduce((sum: number, user: UserData) => sum + user.post_count, 0);
        
        // Add percentage to each user
        const usersWithPercentage = data.slice(0, 10).map((user: UserData) => ({
          ...user,
          percentage: totalPosts > 0 ? Math.round((user.post_count / totalPosts) * 100) : 0
        }));
        
        setUsers(usersWithPercentage);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [businessId, dateRange.startDate, dateRange.endDate, startDateProcessed, endDateProcessed]);

  useEffect(() => {
    if (loading || !chartRef.current || users.length === 0) return;

    const sortedUsers = [...users].sort((a, b) => b.post_count - a.post_count);
    
    const chart = echarts.init(chartRef.current);

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
        right: '14%',
        bottom: '3%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          show: false
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
        inverse: true,
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
            value: user.post_count,
            nickname: user.nickname,
            percentage: user.percentage
          })),
          barWidth: '50%',
          label: {
            show: true,
            position: 'right',
            formatter: function(params: any) {
              return params.data.value + " posts";
            },
            fontSize: 12,
            color: '#666'
          },
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#2196F3' },
              { offset: 1, color: '#64B5F6' }
            ]),
            borderRadius: [0, 4, 4, 0]
          }
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [loading, users]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">Top Users</h2>
        <div className="text-sm text-gray-600">
          Top users with multiple posts
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Top users from {formattedStart} to {formattedEnd}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      ) : users.length === 0 ? (
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