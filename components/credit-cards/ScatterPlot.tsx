"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  MarkLineComponent,
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
  MarkLineComponent,
  ScatterChart,
  CanvasRenderer,
]);

interface SOVvsNetSentimentProps {
  businessId: string;
  platform:string;
}

interface ScatterData {
  business_name: string;
  business_id: string;
  sov_percentage: number;
  net_sentiment_score: number | null;
  total_posts: number;
}

export default function SOVvsNetSentiment({ businessId,platform }: SOVvsNetSentimentProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [scatterData, setScatterData] = useState<ScatterData[]>([]);
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

    async function fetchScatterData() {
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
          `/api/businesses/credit-cards/getSOVvsNetSentiment?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch SOV vs Net Sentiment data");
        }

        const data = await response.json();

        if (isCurrent) {
          setScatterData(data);
        }
      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching SOV vs Net Sentiment:", error);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchScatterData();

    return () => {
      isCurrent = false;
    };
  }, [businessId, startDateProcessed, endDateProcessed]);

  useEffect(() => {
    if (isLoading || !chartRef.current || scatterData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const plotData = scatterData.map((item) => ({
      value: [item.sov_percentage, item.net_sentiment_score ?? 0],
      name: item.business_name,
      total_posts: item.total_posts,
    }));

    // Calculate dynamic axis ranges with padding
    const sovValues = scatterData.map(item => item.sov_percentage);
    const sentimentValues = scatterData.map(item => item.net_sentiment_score ?? 0);
    
    const minSOV = Math.min(...sovValues);
    const maxSOV = Math.max(...sovValues);
    const minSentiment = Math.min(...sentimentValues);
    const maxSentiment = Math.max(...sentimentValues);
    
    // Add 10% padding to each side
    const sovRange = maxSOV - minSOV;
    const sentimentRange = maxSentiment - minSentiment;
    
    const sovPadding = sovRange * 0.1 || 5; // Fallback to 5 if range is 0
    const sentimentPadding = sentimentRange * 0.1 || 10; // Fallback to 10 if range is 0
    
    const sovMin = Math.max(0, minSOV - sovPadding);
    const sovMax = maxSOV + sovPadding;
    const sentMin = minSentiment - sentimentPadding;
    const sentMax = maxSentiment + sentimentPadding;

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `<strong>${params.data.name}</strong><br/>SOV: ${params.value[0].toFixed(2)}%<br/>Net Sentiment: ${params.value[1].toFixed(2)}<br/>Total Posts: ${params.data.total_posts}`;
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'SOV',
        nameLocation: 'middle',
        nameGap: 30,
        min: sovMin,
        max: sovMax,
        axisLabel: {
          formatter: '{value}%'
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
            color: '#e0e0e0'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'Net Sentiment',
        nameLocation: 'middle',
        nameGap: 50,
        min: sentMin,
        max: sentMax,
        axisLabel: {
          formatter: '{value}'
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
            color: '#e0e0e0'
          }
        }
      },
      series: [
        {
          type: 'scatter',
          data: plotData,
          symbolSize: 12,
          itemStyle: {
            color: '#6366F1',
            opacity: 0.8
          },
          labelLayout: {
            hideOverlap: false,
            moveOverlap: 'shiftY',
            draggable: false,
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => params.data.name,
            fontSize: 10,
            color: '#333',
            minMargin: 2,
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              type: 'solid',
              color: '#3B82F6',
              width: 2
            },

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
  }, [isLoading, scatterData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="mb-2">
        <h2 className="text-base font-medium text-gray-800">SOV vs Net Sentiment Score</h2>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Share of Voice vs Net Sentiment from {formattedStart} to {formattedEnd}
      </div>

      {isLoading ? (
        <div className="h-[500px] flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : scatterData.length === 0 ? (
        <div className="h-[500px] flex items-center justify-center">
          <p className="text-gray-500">No data available for this period</p>
        </div>
      ) : (
        <div className="h-[500px]">
          <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </div>
  );
}