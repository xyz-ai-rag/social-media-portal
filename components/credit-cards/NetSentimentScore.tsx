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

interface NetSentimentScoreProps {
  businessId: string;
}

interface NetSentimentData {
  business_name: string;
  business_id: string;
  total_posts: number;
  non_neutral_posts: number;
  highly_positive: number;
  positive: number;
  neutral: number;
  negative: number;
  highly_negative: number;
  net_sentiment_score: number | null;
}

export default function NetSentimentScore({ businessId }: NetSentimentScoreProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [sentimentData, setSentimentData] = useState<NetSentimentData[]>([]);
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

    async function fetchNetSentimentData() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          business_id: businessId,
          start_date: startDateProcessed,
          end_date: endDateProcessed,
        });

        const response = await fetch(
          `/api/businesses/credit-cards/getNetSentimentScore?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch net sentiment score data");
        }

        const data = await response.json();

        if (isCurrent) {
          setSentimentData(data);
        }
      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching net sentiment score:", error);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchNetSentimentData();

    return () => {
      isCurrent = false;
    };
  }, [businessId, startDateProcessed, endDateProcessed]);

  useEffect(() => {
    if (isLoading || !chartRef.current || sentimentData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const businessNames = sentimentData.map((item) => item.business_name);
    const scores = sentimentData.map((item) => item.net_sentiment_score ?? 0);

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          const data = params[0];
          return `<strong>${data.axisValue}</strong><br/>Net Sentiment Score: ${data.value.toFixed(2)}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '20%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: businessNames,
        axisLabel: {
          rotate: 80,
          fontSize: 10,
          interval: 0,
        }
      },
      yAxis: {
        type: 'value',
        min: -100,
        max: 100,
        axisLabel: {
          formatter: '{value}'
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#e0e0e0'
          }
        }
      },
      series: [
        {
          type: 'bar',
          data: scores.map(score => ({
            value: score,
            itemStyle: {
              color: '#6366F1' // Purple for all bars
            }
          })),
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => {
              return params.value.toFixed(2);
            },
            fontSize: 10,
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
        <h2 className="text-base font-medium text-gray-800">Net Sentiment Score</h2>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Net sentiment scores from {formattedStart} to {formattedEnd}
      </div>

      {/* Formula explanation */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs">
        <div className="font-semibold text-blue-900 mb-1">Formula:</div>
        <div className="text-blue-800">
          ((HPos + Pos) - (Neg + HNeg)) / (Total_Non_Neutral) * 100
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : sentimentData.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-500">No sentiment score data available for this period</p>
        </div>
      ) : (
        <div className="h-[400px]">
          <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </div>
  );
}