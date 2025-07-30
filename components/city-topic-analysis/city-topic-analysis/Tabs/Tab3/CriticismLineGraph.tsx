"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { format, subMonths, addMonths } from "date-fns";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  LineChart,
  CanvasRenderer,
]);

interface CriticismLineGraphProps {
  businessId: string;
  selectedMonth: string;
}

interface CriticismData {
  month: string;
  total_criticisms: number;
  topics: Array<{
    topic: string;
    criticism_count: number;
  }>;
}

export default function CriticismLineGraph({ 
  businessId,
  selectedMonth
}: CriticismLineGraphProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [criticismData, setCriticismData] = useState<{
    currentMonth: CriticismData | null;
    lastMonth: CriticismData | null;
  }>({ currentMonth: null, lastMonth: null });
  const [isLoading, setIsLoading] = useState(true);

  // Calculate months
  const currentMonthDate = useMemo(() => new Date(selectedMonth + '-01'), [selectedMonth]);
  const lastMonthDate = useMemo(() => subMonths(currentMonthDate, 1), [currentMonthDate]);

  // Fetch data
  useEffect(() => {
    let isCurrent = true;

    async function fetchCriticismData() {
      if (!businessId || !selectedMonth) return;
      
      setIsLoading(true);
      try {
        // Simplified logic: handle all cases uniformly
        const currentMonthStr = format(currentMonthDate, 'yyyy-MM');
        const lastMonthStr = format(lastMonthDate, 'yyyy-MM');

        // Fetch current month and last month data in parallel
        const [currentResponse, lastResponse] = await Promise.all([
          fetch(`/api/city-topics/getCriticismTrend?businessId=${encodeURIComponent(businessId)}&month=${currentMonthStr}`),
          fetch(`/api/city-topics/getCriticismTrend?businessId=${encodeURIComponent(businessId)}&month=${lastMonthStr}`)
        ]);

        const [currentData, lastData] = await Promise.all([
          currentResponse.json(),
          lastResponse.json()
        ]);

        if (isCurrent) {
          setCriticismData({
            currentMonth: currentData,
            lastMonth: lastData
          });
        }
      } catch (err) {
        console.error('[CriticismLineGraph] Error fetching criticism data:', err);
        if (isCurrent) {
          setCriticismData({ currentMonth: null, lastMonth: null });
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchCriticismData();

    return () => {
      isCurrent = false;
    };
  }, [businessId, selectedMonth]); // Simplified dependencies

  // Render chart
  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // 检查是否有数据 - 更宽松的检查
    if (!criticismData.currentMonth?.topics && !criticismData.lastMonth?.topics) {
      chart.setOption({
        title: {
          text: 'No Data Available',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 16,
          }
        }
      });
      return;
    }

    // Check if "Everything" is selected or all topics are "Unknown" or empty
    const isEverythingSelected = selectedMonth === 'everything';
    const allTopicsUnknown = criticismData.currentMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic) &&
                            criticismData.lastMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic);

    // Prepare data
    const currentMonthName = format(currentMonthDate, 'MMM yyyy');
    const lastMonthName = format(lastMonthDate, 'MMM yyyy');

    // Calculate total criticisms
    const currentTotal = criticismData.currentMonth?.total_criticisms || 0;
    const lastTotal = criticismData.lastMonth?.total_criticisms || 0;

    const series = [];

    if (isEverythingSelected || allTopicsUnknown) {
      // If "Everything" is selected or all topics are "Unknown", show total criticism trend
      // Always show, even if data is 0
      series.push({
        name: 'Total Criticisms',
        type: 'line',
        data: [
          { value: lastTotal, topic: 'Last Month' },
          { value: currentTotal, topic: 'This Month' }
        ],
        smooth: true,
        showSymbol: true,
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#FF6B6B',
        },
        itemStyle: {
          color: '#FF6B6B',
        },
      });
    } else {
      // Normal display of current month and last month data
      // Add current month data - show as long as there's data, even if 0
      if (criticismData.currentMonth?.topics) {
        series.push({
          name: currentMonthName,
          type: 'line',
          data: criticismData.currentMonth.topics.map(topic => ({
            value: topic.criticism_count,
            topic: topic.topic
          })),
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#FF6B6B',
          },
          itemStyle: {
            color: '#FF6B6B',
          },
        });
      }

      // Add last month data - show as long as there's data, even if 0
      if (criticismData.lastMonth?.topics) {
        series.push({
          name: lastMonthName,
          type: 'line',
          data: criticismData.lastMonth.topics.map(topic => ({
            value: topic.criticism_count,
            topic: topic.topic
          })),
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#4ECDC4',
          },
          itemStyle: {
            color: '#4ECDC4',
          },
        });
      }
    }

    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let result = `<div><strong>${params[0].name}</strong></div>`;
          params.forEach((param: any) => {
            result += `<div style="color: ${param.color}">${param.seriesName}: ${param.value.value || param.value} (${param.value.topic || 'Total'})</div>`;
          });
          return result;
        }
      },
      legend: {
        data: series.map(s => s.name),
        top: '2%'
      },
      grid: {
        top: '15%',
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: (isEverythingSelected || allTopicsUnknown)
          ? ['Last Month', 'This Month']
          : (() => {
              // Merge current month and last month topics, remove duplicates
              const allTopics = new Set();
              if (criticismData.currentMonth?.topics) {
                criticismData.currentMonth.topics.forEach(t => allTopics.add(t.topic));
              }
              if (criticismData.lastMonth?.topics) {
                criticismData.lastMonth.topics.forEach(t => allTopics.add(t.topic));
              }
              return Array.from(allTopics);
            })(),
        axisLabel: {
          rotate: (isEverythingSelected || allTopicsUnknown) ? 0 : 45,
          fontSize: (isEverythingSelected || allTopicsUnknown) ? 12 : 10
        },
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        name: 'Criticism Count',
        splitLine: {
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      series: series,
    };

    chart.setOption(option);

    const resizeObserver = new window.ResizeObserver(() => {
      chart.resize();
    });
    
    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [isLoading, criticismData, currentMonthDate, lastMonthDate]);

  // Check if "Everything" is selected or all topics are "Unknown" or empty (for title display)
  const isEverythingSelected = selectedMonth === 'everything';
  const allTopicsUnknown = criticismData.currentMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic) &&
                          criticismData.lastMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-64 flex items-center justify-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-medium text-gray-800">
          {(isEverythingSelected || allTopicsUnknown) ? 'Total Criticisms: This Month vs Last Month' : 'Criticism Trends: This Month vs Last Month'}
        </h2>
      </div>
      <div className="h-72">
        <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
} 