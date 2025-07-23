"use client";

import { useEffect, useRef, useState } from "react";
import { format, subMonths, parseISO } from "date-fns";
import * as echarts from "echarts";

interface ComplimentLineGraphProps {
  businessId: string;
  selectedMonth: string;
}

interface ComplimentData {
  month: string;
  total_compliments: number;
  topics: Array<{
    topic: string;
    compliment_count: number;
  }>;
}

export default function ComplimentLineGraph({ 
  businessId,
  selectedMonth
}: ComplimentLineGraphProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [complimentData, setComplimentData] = useState<{
    currentMonth: ComplimentData | null;
    lastMonth: ComplimentData | null;
  }>({ currentMonth: null, lastMonth: null });

  // 计算当前月份和上个月份
  const currentMonthDate = selectedMonth === 'everything' 
    ? new Date() 
    : parseISO(selectedMonth + '-01');
  const lastMonthDate = subMonths(currentMonthDate, 1);

  // 获取数据
  useEffect(() => {
    let isCurrent = true;

    async function fetchComplimentData() {
      setIsLoading(true);
      try {
        // 获取当前月份数据
        const currentMonthResponse = await fetch(
          `/api/city-topics/getComplimentTrend?businessId=${businessId}&month=${format(currentMonthDate, 'yyyy-MM')}`
        );
        const currentMonthData = await currentMonthResponse.json();

        // 获取上个月数据
        const lastMonthResponse = await fetch(
          `/api/city-topics/getComplimentTrend?businessId=${businessId}&month=${format(lastMonthDate, 'yyyy-MM')}`
        );
        const lastMonthData = await lastMonthResponse.json();

        if (isCurrent) {
          setComplimentData({
            currentMonth: currentMonthData,
            lastMonth: lastMonthData,
          });
        }
      } catch (err) {
        console.error('[ComplimentLineGraph] Error fetching compliment data:', err);
        if (isCurrent) {
          setComplimentData({ currentMonth: null, lastMonth: null });
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchComplimentData();

    return () => {
      isCurrent = false;
    };
  }, [businessId, selectedMonth]); // 简化依赖项

  // 渲染图表
  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // 检查是否有数据 - 更宽松的检查
    if (!complimentData.currentMonth?.topics && !complimentData.lastMonth?.topics) {
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
    console.log('[ComplimentLineGraph] 图表渲染数据:', {
      currentMonth: complimentData.currentMonth,
      lastMonth: complimentData.lastMonth,
      currentMonthTopics: complimentData.currentMonth?.topics,
      lastMonthTopics: complimentData.lastMonth?.topics,
    });

    // 检查是否选择了 "Everything" 或所有话题都是 "Unknown" 或空
    const isEverythingSelected = selectedMonth === 'everything';
    const allTopicsUnknown = complimentData.currentMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic) &&
                            complimentData.lastMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic);

    console.log('[ComplimentLineGraph] isEverythingSelected:', isEverythingSelected, 'allTopicsUnknown:', allTopicsUnknown);

    // 准备数据
    const currentMonthName = format(currentMonthDate, 'MMM yyyy');
    const lastMonthName = format(lastMonthDate, 'MMM yyyy');

    // 计算总表扬数
    const currentTotal = complimentData.currentMonth?.total_compliments || 0;
    const lastTotal = complimentData.lastMonth?.total_compliments || 0;

    const series = [];

    if (isEverythingSelected || allTopicsUnknown) {
      // 如果选择 "Everything" 或所有话题都是 "Unknown"，显示总表扬数趋势
      // 总是显示，即使数据为0
      series.push({
        name: 'Total Compliments',
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
          color: '#4ECDC4',
        },
        itemStyle: {
          color: '#4ECDC4',
        },
      });
    } else {
      // 正常显示本月和上个月的数据
      // 添加本月数据 - 只要有数据就显示，即使为0
      if (complimentData.currentMonth?.topics) {
        series.push({
          name: currentMonthName,
          type: 'line',
          data: complimentData.currentMonth.topics.map(topic => ({
            value: topic.compliment_count,
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

      // 添加上个月数据 - 只要有数据就显示，即使为0
      if (complimentData.lastMonth?.topics) {
        series.push({
          name: lastMonthName,
          type: 'line',
          data: complimentData.lastMonth.topics.map(topic => ({
            value: topic.compliment_count,
            topic: topic.topic
          })),
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#45B7D1',
          },
          itemStyle: {
            color: '#45B7D1',
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
              if (complimentData.currentMonth?.topics) {
                complimentData.currentMonth.topics.forEach(t => allTopics.add(t.topic));
              }
              if (complimentData.lastMonth?.topics) {
                complimentData.lastMonth.topics.forEach(t => allTopics.add(t.topic));
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
        name: 'Compliment Count',
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
  }, [complimentData, isLoading, selectedMonth, currentMonthDate, lastMonthDate]);

  // 检查是否选择了 "Everything" 或所有话题都是 "Unknown" 或空（用于标题显示）
  const isEverythingSelected = selectedMonth === 'everything';
  const allTopicsUnknown = complimentData.currentMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic) &&
                          complimentData.lastMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic);

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
          {(isEverythingSelected || allTopicsUnknown) ? 'Total Compliments: This Month vs Last Month' : 'Compliment Trends: This Month vs Last Month'}
        </h2>
      </div>
      <div className="h-72">
        <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
} 