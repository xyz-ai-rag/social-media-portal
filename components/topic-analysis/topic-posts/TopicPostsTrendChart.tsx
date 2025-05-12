"use client";
import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { TitleComponent, TooltipComponent, GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([TitleComponent, TooltipComponent, GridComponent, LineChart, CanvasRenderer]);

interface TopicPostsChartProps {
  businessId: string;
  topic: string;
}

const MIN_POINT_DISTANCE = 20; // px

const TopicPostTrendChart: React.FC<TopicPostsChartProps> = ({
  businessId,
  topic,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any[]>([]);
  const [grouped, setGrouped] = useState<{date: string, count: number}[]>([]);
  const [interval, setInterval] = useState<'hour'|'day'|'week'|'month'>('day');

  // Fetch raw data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/businesses/getTopicPostsTrend?businessId=${businessId}&topic=${topic}`);
        const res = await response.json();
        setData(res.postRows || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [topic, businessId]);

  // Dynamically group data by interval (hour/day/week/month) based on chart width and data span
  useEffect(() => {
    if (!data || data.length === 0) {
      setGrouped([]);
      return;
    }
    // Get chart container width
    let chartWidth = 1200;
    if (chartRef.current) {
      chartWidth = chartRef.current.offsetWidth || 1200;
    }
    const maxPoints = Math.floor(chartWidth / MIN_POINT_DISTANCE);
    // Calculate time span in days and hours
    const times = data.map(d => new Date(d.last_update_time).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const totalHours = Math.ceil((maxTime - minTime) / (1000 * 60 * 60)) + 1;
    const totalDays = Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24)) + 1;
    // Decide grouping interval
    let _interval: 'hour'|'day'|'week'|'month' = 'day';
    if (totalHours <= maxPoints) {
      _interval = 'hour';
    } else if (totalDays <= maxPoints) {
      _interval = 'day';
    } else if (totalDays <= maxPoints * 4) {
      _interval = 'week';
    } else {
      _interval = 'month';
    }
    setInterval(_interval);
    // Group data by selected interval
    const groupMap = new Map<string, number>();
    data.forEach(post => {
      const date = new Date(post.last_update_time);
      let key = '';
      if (_interval === 'hour') {
        // Format: YYYY-MM-DD HH
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      } else if (_interval === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (_interval === 'week') {
        // Get Monday of the week
        const monday = new Date(date);
        monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        key = monday.toISOString().split('T')[0];
      } else if (_interval === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      groupMap.set(key, (groupMap.get(key) || 0) + 1);
    });
    const groupedArr = Array.from(groupMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setGrouped(groupedArr);
  }, [data]);
  let cumulative = 0;
const cumulativeData = grouped.map(item => {
  cumulative += item.count;
  return cumulative;
});

  // Render chart with grouped data
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const option = {
      title: {
        text: `Topic Trend`,
        left: 'center',
        top: 10,
        bottom: 30,
        textStyle: { fontSize: 16 }
      },
      grid: { left: 60, right: 40, top: 40, bottom: 60 },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const d = params[0];
          return `${d.name}<br/>Posts: ${d.value}`;
        },
      },
      xAxis: {
        type: 'category',
        data: grouped.map(item => item.date),
        axisLabel: {
          fontSize: 12,
          rotate: 45,
          formatter: (value: string) => {
            const date = new Date(value);
            if (interval === 'month') {
              return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else if (interval === 'week' || interval === 'day') {
              const currentYear = new Date().getFullYear();
              const year = date.getFullYear();
              const month = date.toLocaleString('en-US', { month: 'short' });
              const day = date.getDate();
              return year === currentYear ? `${month} ${day}` : `${month} ${day}, ${year}`;
            } else if (interval === 'hour') {
              // Format: MM-DD HH:00
              return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
            }
            return value;
          }
        },
      },
      yAxis: {
        type: 'value',
        min: 'dataMin',
        axisLabel: { fontSize: 12 },
      },
      series: [
        {
          type: 'line',
          data: cumulativeData,
          smooth: false,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { color: '#b0b7c3' },
          lineStyle: { width: 3 },
        //   areaStyle: {
        //     color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        //       { offset: 0, color: 'rgba(176, 183, 195, 0.3)' },
        //       { offset: 1, color: 'rgba(176, 183, 195, 0.1)' },
        //     ]),
        //   },
        },
      ],
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
  }, [grouped, interval]);

  if (grouped.length === 0) return null;

  return (
    <div
      ref={chartRef}
      style={{ width: '100%' }}
      className="h-[300px] flex items-center justify-center w-full"
    />
  );
};

export default TopicPostTrendChart; 