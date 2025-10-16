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

interface ShareOfVoiceProps {
  businessId: string;
}

interface VoiceData {
  business_name: string;
  business_id: string;
  total_posts: number;
  percentage: number;
}

export default function ShareOfVoice({ businessId }: ShareOfVoiceProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [voiceData, setVoiceData] = useState<VoiceData[]>([]);
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

    async function fetchVoiceData() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          business_id: businessId,
          start_date: startDateProcessed,
          end_date: endDateProcessed,
        });

        const response = await fetch(
          `/api/businesses/credit-cards/getShareOfVoice?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch share of voice data");
        }

        const data = await response.json();

        if (isCurrent) {
          setVoiceData(data);
        }
      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching share of voice:", error);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchVoiceData();

    return () => {
      isCurrent = false;
    };
  }, [businessId, startDateProcessed, endDateProcessed]);

  useEffect(() => {
    if (isLoading || !chartRef.current || voiceData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    // Color palette matching your example
    const colors = [
      '#EF4444', // Red - HSBC Red
      '#9CA3AF', // Gray - BOC Chill Generic
      '#1E40AF', // Dark blue - CNCBI Motion
      '#60A5FA', // Light blue - Hang Seng MMPOWER
      '#FBBF24', // Yellow - BOC Chill World
      '#A855F7', // Purple - WeWa
      '#EC4899', // Pink - Sim Generic
      '#047857', // Dark green - Hang Seng Travel+
      '#0369A1', // Cyan - AEON Wakuwaku
      '#1E3A8A', // Navy - CCBA Eye
      '#4338CA', // Indigo - BOC Chill Platinum
      '#6B21A8', // Purple - Sim World
      '#86198F', // Fuchsia
    ];

    const seriesData = voiceData.map((item, index) => ({
      name: item.business_name,
      value: item.percentage,
      totalPosts: item.total_posts,
      itemStyle: {
        color: colors[index % colors.length],
      },
    }));

    const option = {
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          return `${params.name}<br/>${params.value}%<br/>${params.data.totalPosts} posts`;
        },
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        itemGap: 12,
        itemWidth: 16,
        itemHeight: 16,
        textStyle: {
          fontSize: 13,
        },
        formatter: (name: string) => {
          // Shorten long names for legend
          return name.length > 25 ? name.substring(0, 22) + '...' : name;
        },
      },
      series: [
        {
          name: "Share of Voice",
          type: "pie",
          radius: ["45%", "70%"],
          center: ["65%", "50%"],
          avoidLabelOverlap: true,
          data: seriesData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          label: {
            show: true,
            position: 'outside',
            formatter: (params: any) => {
              return `{name|${params.name}}\n{percent|${params.value}%}`;
            },
            rich: {
              name: {
                fontSize: 13,
                fontWeight: 'bold',
                color: '#333',
                lineHeight: 18,
              },
              percent: {
                fontSize: 12,
                color: '#666',
                lineHeight: 16,
              },
            },
          },
          labelLine: {
            show: true,
            length: 15,
            length2: 10,
          },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [isLoading, voiceData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="mb-2">
        <h2 className="text-base font-medium text-gray-800">Share of Voice</h2>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Market share breakdown from {formattedStart} to {formattedEnd}
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : voiceData.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <p className="text-gray-500">No share of voice data available</p>
        </div>
      ) : (
        <div className="h-[500px]">
          <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </div>
  );
}