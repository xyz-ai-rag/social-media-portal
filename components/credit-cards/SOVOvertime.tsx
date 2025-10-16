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

interface ShareOfVoiceOverTimeProps {
  businessId: string;
}

interface MonthlySOVData {
  month_year: string;
  [key: string]: any; // Business names as keys with percentage values
}

export default function ShareOfVoiceOverTime({ businessId }: ShareOfVoiceOverTimeProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlySOVData[]>([]);
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

    async function fetchMonthlySOVData() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          business_id: businessId,
          start_date: startDateProcessed,
          end_date: endDateProcessed,
        });

        const response = await fetch(
          `/api/businesses/credit-cards/getShareOfVoiceOverTime?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch share of voice over time data");
        }

        const data = await response.json();

        if (isCurrent) {
          setMonthlyData(data);
        }
      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching share of voice over time:", error);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchMonthlySOVData();

    return () => {
      isCurrent = false;
    };
  }, [businessId, startDateProcessed, endDateProcessed]);

  useEffect(() => {
    if (isLoading || !chartRef.current || monthlyData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const months = monthlyData.map((item) => item.month_year);

    const businesses = Object.keys(monthlyData[0] || {}).filter(
      (key) => !['month_year', 'year_month_order'].includes(key)
    );

    const colors = [
      '#FCD34D', // Yellow - AEON
      '#60A5FA', // Light blue - BOC Chill Generic
      '#FBBF24', // Orange - BOC Chill Platinum
      '#1E40AF', // Dark blue - BOC Chill World
      '#EC4899', // Pink - CCB Eye
      '#EF4444', // Red - CNCBI Motion
      '#10B981', // Green - Hang Seng MMPOWER
      '#047857', // Dark green - Hang Seng Travel+
      '#DC2626', // Dark red - HSBC Red
      '#A855F7', // Purple - Sim Generic
      '#1E3A8A', // Navy - Sim World
      '#60A5FA', // Sky blue - WeWa
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

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        formatter: (params: any) => {
          let result = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach((param: any) => {
            if (param.value > 0) {
              result += `${param.marker} ${param.seriesName}: ${param.value}%<br/>`;
            }
          });
          return result;
        },
      },
      legend: {
        data: businesses,
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
        name: 'Share of Voice (%)',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value}%',
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
      ],
      series: businessSeries,
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
        <h2 className="text-base font-medium text-gray-800">Share of Voice Over Time</h2>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Monthly share of voice trends from {formattedStart} to {formattedEnd}
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