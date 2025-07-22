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

  // 计算月份
  const currentMonthDate = useMemo(() => new Date(selectedMonth + '-01'), [selectedMonth]);
  const lastMonthDate = useMemo(() => subMonths(currentMonthDate, 1), [currentMonthDate]);

  // 获取数据
  useEffect(() => {
    let isCurrent = true;

    async function fetchCriticismData() {
      if (!businessId || !selectedMonth) return;
      
      setIsLoading(true);
      try {
        // 简化逻辑：统一处理所有情况
        const currentMonthStr = format(currentMonthDate, 'yyyy-MM');
        const lastMonthStr = format(lastMonthDate, 'yyyy-MM');

        console.log('[CriticismLineGraph] Fetching criticism data for:', { currentMonthStr, lastMonthStr, selectedMonth });

        // 并行获取本月和上个月的数据
        const [currentResponse, lastResponse] = await Promise.all([
          fetch(`/api/city-topics/getCriticismTrend?businessId=${encodeURIComponent(businessId)}&month=${currentMonthStr}`),
          fetch(`/api/city-topics/getCriticismTrend?businessId=${encodeURIComponent(businessId)}&month=${lastMonthStr}`)
        ]);

        const [currentData, lastData] = await Promise.all([
          currentResponse.json(),
          lastResponse.json()
        ]);

        console.log('[CriticismLineGraph] Received data:', { currentData, lastData });

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
  }, [businessId, selectedMonth]); // 简化依赖项

  // 渲染图表
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

    // 调试：打印实际的数据结构
    console.log('[CriticismLineGraph] 图表渲染数据:', {
      currentMonth: criticismData.currentMonth,
      lastMonth: criticismData.lastMonth,
      currentMonthTopics: criticismData.currentMonth?.topics,
      lastMonthTopics: criticismData.lastMonth?.topics,
    });

    // 检查是否选择了 "Everything" 或所有话题都是 "Unknown" 或空
    const isEverythingSelected = selectedMonth === 'everything';
    const allTopicsUnknown = criticismData.currentMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic) &&
                            criticismData.lastMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic);

    console.log('[CriticismLineGraph] isEverythingSelected:', isEverythingSelected, 'allTopicsUnknown:', allTopicsUnknown);

    // 准备数据
    const currentMonthName = format(currentMonthDate, 'MMM yyyy');
    const lastMonthName = format(lastMonthDate, 'MMM yyyy');

    // 计算总批评数
    const currentTotal = criticismData.currentMonth?.total_criticisms || 0;
    const lastTotal = criticismData.lastMonth?.total_criticisms || 0;

    const series = [];

    if (isEverythingSelected || allTopicsUnknown) {
      // 如果选择 "Everything" 或所有话题都是 "Unknown"，显示总批评数趋势
      // 总是显示，即使数据为0
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
      // 正常显示本月和上个月的数据
      // 添加本月数据 - 只要有数据就显示，即使为0
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

      // 添加上个月数据 - 只要有数据就显示，即使为0
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
              // 合并本月和上个月的话题，去重
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

  // 检查是否选择了 "Everything" 或所有话题都是 "Unknown" 或空（用于标题显示）
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