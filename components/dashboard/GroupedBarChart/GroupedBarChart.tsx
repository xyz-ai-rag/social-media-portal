'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { format } from 'date-fns';
import { setStartOfDay, setEndOfDay } from '@/utils/timeUtils';
// Import your DateRange context hook and a utility function if needed.
import { useDateRange } from '@/context/DateRangeContext';

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  CanvasRenderer
]);

interface GroupedBarChartProps {
  clientId: string;
  businessId: string;
}

interface ChartRecord {
  date: string;
  count: number;
}

export default function GroupedBarChart({ clientId, businessId }: GroupedBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartRecord[]>([]);

  // Get date range from context.
  const { dateRange } = useDateRange();

  // Format the raw date strings for display.
  const formattedStart = useMemo(
    () => format(new Date(dateRange.startDate), 'd MMM yyyy'),
    [dateRange.startDate]
  );
  const formattedEnd = useMemo(
    () => format(new Date(dateRange.endDate), 'd MMM yyyy'),
    [dateRange.endDate]
  );
  const startDateProcessed = useMemo(() => setStartOfDay(dateRange.startDate), [dateRange.startDate]);
  const endDateProcessed = useMemo(() => setEndOfDay(dateRange.endDate), [dateRange.endDate]);
  // Fetch daily posts data from the API.
  useEffect(() => {
    async function fetchChartData() {
      try {
        const url = `/api/charts/grouped-bar-chart?business_id=${businessId}&start_date=${startDateProcessed}&end_date=${endDateProcessed}`;
        const response = await fetch(url);
        const data = await response.json();
        setChartData(data);
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchChartData();
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
    const xAxisData = chartData.map(record => record.date);
    // Data series: just one series with daily counts.
    const seriesData = chartData.map(record => record.count);

    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: '{b}: {c} posts'
      },
      legend: {
        show: false
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed' } },
        show: true
      },
      series: [
        {
          name: 'Posts',
          type: 'bar',
          barWidth: '60%',
          data: seriesData,
          itemStyle: {
            color: '#5470c6',
            borderRadius: [2, 2, 0, 0]
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
  }, [isLoading, chartData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {/* Title */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">
          Number of Posts in Current Period
        </h2>
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
