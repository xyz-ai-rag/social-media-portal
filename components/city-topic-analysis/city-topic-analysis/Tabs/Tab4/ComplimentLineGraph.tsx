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

  // Calculate current month and last month
  const currentMonthDate = selectedMonth === 'everything' 
    ? new Date() 
    : parseISO(selectedMonth + '-01');
  const lastMonthDate = subMonths(currentMonthDate, 1);

  // Fetch data
  useEffect(() => {
    let isCurrent = true;

    async function fetchComplimentData() {
      setIsLoading(true);
      try {
        // Fetch current month data
        const currentMonthResponse = await fetch(
          `/api/city-topics/getComplimentTrend?businessId=${businessId}&month=${format(currentMonthDate, 'yyyy-MM')}`
        );
        const currentMonthData = await currentMonthResponse.json();

        // Fetch last month data
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
  }, [businessId, selectedMonth]); // Simplified dependencies

  // Render chart
  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    // Check if there's data - more lenient check
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

    // Check if "Everything" is selected or all topics are "Unknown" or empty
    const isEverythingSelected = selectedMonth === 'everything';
    const allTopicsUnknown = complimentData.currentMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic) &&
                            complimentData.lastMonth?.topics.every(t => t.topic === 'Unknown' || !t.topic);

    // Prepare data
    const currentMonthName = format(currentMonthDate, 'MMM yyyy');
    const lastMonthName = format(lastMonthDate, 'MMM yyyy');

    // Calculate total compliments
    const currentTotal = complimentData.currentMonth?.total_compliments || 0;
    const lastTotal = complimentData.lastMonth?.total_compliments || 0;

    const series = [];

    if (isEverythingSelected || allTopicsUnknown) {
      // If "Everything" is selected or all topics are "Unknown", show total compliment trend
      // Always show, even if data is 0
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
      // Normal display of current month and last month data
      // Add current month data - show as long as there's data, even if 0
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

      // Add last month data - show as long as there's data, even if 0
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
              // Merge current month and last month topics, remove duplicates
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

  // Check if "Everything" is selected or all topics are "Unknown" or empty (for title display)
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