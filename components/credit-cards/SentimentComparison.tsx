"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
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
  BarChart,
  CanvasRenderer,
]);

interface SentimentComparisonProps {
  businessId: string;
  platform:string;
}

interface SentimentData {
  business_name: string;
  positive_percentage: number;
  neutral_percentage: number;
  negative_percentage: number;
  total_posts: number;
}

export default function SentimentComparison({ businessId,platform }: SentimentComparisonProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
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

    async function fetchSentimentData() {
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
          `/api/businesses/credit-cards/getSentimentComparison?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch sentiment comparison data");
        }

        const data = await response.json();

        if (isCurrent) {
          setSentimentData(data);
        }
      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching sentiment comparison:", error);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchSentimentData();

    return () => {
      isCurrent = false;
    };
  }, [businessId, startDateProcessed, endDateProcessed]);

  useEffect(() => {
    if (isLoading || !chartRef.current || sentimentData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const businessNames = sentimentData.map((item) => item.business_name);
    const positiveData = sentimentData.map((item) => item.positive_percentage);
    const neutralData = sentimentData.map((item) => item.neutral_percentage);
    const negativeData = sentimentData.map((item) => item.negative_percentage);

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          let result = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach((param: any) => {
            result += `${param.marker} ${param.seriesName}: ${param.value}%<br/>`;
          });
          return result;
        }
      },
      legend: {
        data: ['Positive', 'Neutral', 'Negative'],
        top: 0,
        itemGap: 20,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '50',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: businessNames,
        axisLabel: {
          rotate: 75,
          fontSize: 11,
          interval: 0,
        }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          name: 'Positive',
          type: 'bar',
          stack: 'total',
          data: positiveData,
          itemStyle: {
            color: '#86EFAC' // Green
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
              return params.value > 5 ? `${params.value}%` : '';
            },
            fontSize: 12,
            color: '#333'
          }
        },
        {
          name: 'Neutral',
          type: 'bar',
          stack: 'total',
          data: neutralData,
          itemStyle: {
            color: '#FCD34D' // Yellow
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
              return params.value > 5 ? `${params.value}%` : '';
            },
            fontSize: 12,
            color: '#333'
          }
        },
        {
          name: 'Negative',
          type: 'bar',
          stack: 'total',
          data: negativeData,
          itemStyle: {
            color: '#F0ABFC' // Pink/Purple
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
              return params.value > 5 ? `${params.value}%` : '';
            },
            fontSize: 12,
            color: '#333'
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
  }, [isLoading, sentimentData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="mb-2">
        <h2 className="text-base font-medium text-gray-800">Sentiment Comparison</h2>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Sentiment breakdown from {formattedStart} to {formattedEnd}
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : sentimentData.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-500">No sentiment data available for this period</p>
        </div>
      ) : (
        <div className="h-96">
          <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </div>
  );
}