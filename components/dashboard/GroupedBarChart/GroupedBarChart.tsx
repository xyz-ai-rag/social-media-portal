'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Additional date formatting
import { format } from 'date-fns';

// Import your DateRange context hook and your utility function
import { useDateRange } from '@/context/DateRangeContext';
import { calculateComparisonPeriod } from './GroupedBarChartUtils';

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
  previousValue: number;
  currentValue: number;
}

export default function GroupedBarChart({ clientId, businessId }: GroupedBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartRecord[]>([]);

  // Use date range from the context
  const { dateRange } = useDateRange();

  // Optionally format the raw date strings for display
  const formattedStart = useMemo(
    () => format(new Date(dateRange.startDate), 'd MMM yyyy'),
    [dateRange.startDate]
  );
  const formattedEnd = useMemo(
    () => format(new Date(dateRange.endDate), 'd MMM yyyy'),
    [dateRange.endDate]
  );

  // Process dates using your utility function
  const processedDates = useMemo(
    () => calculateComparisonPeriod(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate, dateRange.endDate]
  );

  // Fetch data from the API route using the processed dates
  useEffect(() => {
    async function fetchChartData() {
      try {
        const url = `/api/charts/grouped-bar-chart?business_id=${businessId}&start_date=${processedDates.startDate}&end_date=${processedDates.endDate}`;
        const response = await fetch(url);
        const data = await response.json();
        // console.log("return data", data);
        setChartData(data);
      } catch (error) {
        console.error("Error fetching chart data", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchChartData();
  }, [businessId, processedDates]);

  // Compute dynamic totals and percentage change
  const currentTotal = useMemo(
    () => chartData.reduce((sum, r) => sum + r.currentValue, 0),
    [chartData]
  );
  const previousTotal = useMemo(
    () => chartData.reduce((sum, r) => sum + r.previousValue, 0),
    [chartData]
  );
  const numericChange = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
  const percentageChange = numericChange.toFixed(1);

  // Decide arrow direction and color based on sign of percentageChange
  const isPositive = numericChange >= 0;
  const arrowColor = isPositive ? 'text-green-500' : 'text-red-500';

  // Up arrow path (caret up) and down arrow path (caret down)
  const arrowPathUp =
    'M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z';
  const arrowPathDown =
    'M14.707 9.293a1 1 0 00-1.414 0L11 11.586V4a1 1 0 10-2 0v7.586L6.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 000-1.414z';

  // Initialize and configure the chart once data is loaded.
  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // For aggregated results (over 14 days) we expect exactly 2 records;
    // otherwise, daily pairs.
    let xAxisData: string[] = [];
    if (chartData.length === 2) {
      xAxisData = ["Period 1", "Period 2"];
    } else if (chartData.length > 2) {
      xAxisData = chartData.map((_, index) => (index + 1).toString());
    }

    const previousSeriesData = chartData.map((r) => r.previousValue);
    const currentSeriesData = chartData.map((r) => r.currentValue);

    const option = {
      tooltip: {
        trigger: 'item',
        axisPointer: { type: 'shadow' },
        formatter: function (params: any) {
          return `<strong>${params.seriesName}</strong>: ${params.data}`;
        }
      },
      legend: {
        data: ['Current period', 'Previous period'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed' } },
        show: true
      },
      series: [
        {
          name: 'Current period',
          type: 'bar',
          barGap: 0,
          barWidth: '30%',
          data: currentSeriesData,
          itemStyle: {
            color: '#5470c6',
            borderRadius: [2, 2, 0, 0]
          }
        },
        {
          name: 'Previous period',
          type: 'bar',
          barWidth: '30%',
          data: previousSeriesData,
          itemStyle: {
            color: '#ffa726',
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
      {/* Title more specific */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-gray-800">Number of Posts: Current Period vs. Previous Period</h2>
      </div>

      {/* Subheading showing the raw date range (formatted) */}
      <div className="text-sm text-gray-600 mb-4">
        Posts from {formattedStart} to {formattedEnd}
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : (
        <>
          {/* Display total posts and up/down arrow depending on sign */}
          <div className="mb-4">
            <span className="text-2xl font-bold">{currentTotal}</span>
            <div className="flex items-center mt-1 text-sm">
              {/* Dynamic arrow color and path */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 mr-1 ${arrowColor}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d={isPositive ? arrowPathUp : arrowPathDown} clipRule="evenodd" />
              </svg>
              <span className={`${isPositive ? 'text-green-500' : 'text-red-500'} font-medium`}>
                {Math.abs(parseFloat(percentageChange))}%
              </span>
              <span className="text-gray-500 ml-1">vs previous period</span>
            </div>
          </div>

          {/* Chart container */}
          <div className="h-64">
            <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
          </div>

          {/* Legend */}
          {/* <div className="flex gap-4 mt-4 text-xs">
            <div className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-blue-500 mr-1"></span>
              <span>Current period</span>
            </div>
            <div className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-orange-400 mr-1"></span>
              <span>Previous period</span>
            </div>
          </div> */}
        </>
      )}
    </div>
  );
}
