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

const MIN_POINT_DISTANCE = 30; // px

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
    
    // Calculate time range
    const times = data.map(d => new Date(d.last_update_time).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    // Calculate appropriate time interval based on time range
    const timeSpan = maxTime - minTime;
    const timeSpanInHours = timeSpan / (1000 * 60 * 60);
    const timeSpanInDays = timeSpanInHours / 24;
    
    // Determine time interval based on time span
    let intervalInMinutes: number;
    if (timeSpanInDays <= 3) {
      intervalInMinutes = 120; // 2 hours for spans <= 3 days
    } else if (timeSpanInDays <= 7) {
      intervalInMinutes = 360; // 6 hours for spans <= 1 week
    } else if (timeSpanInDays <= 30) {
      intervalInMinutes = 720; // 12 hours for spans <= 1 month
    } else if (timeSpanInDays <= 90) {
      intervalInMinutes = 1440; // 1 day for spans <= 3 months
    } else if (timeSpanInDays <= 180) {
      intervalInMinutes = 2880; // 2 days for spans <= 6 months
    } else {
      intervalInMinutes = 4320; // 3 days for spans > 6 months
    }
    
    // Round minTime to previous interval
    const roundedMinTime = new Date(minTime);
    roundedMinTime.setMinutes(Math.floor(roundedMinTime.getMinutes() / intervalInMinutes) * intervalInMinutes);
    roundedMinTime.setSeconds(0);
    roundedMinTime.setMilliseconds(0);
    
    // Calculate number of points based on chart width
    const numPoints = Math.min(maxPoints, Math.max(5, Math.floor(timeSpanInHours * 60 / intervalInMinutes)));
    
    // Create evenly distributed time points
    const timePoints: Date[] = [];
    // Add one more interval to ensure the last point is after maxTime
    const timeStep = (maxTime - roundedMinTime.getTime() + intervalInMinutes * 60000) / (numPoints - 1);
    
    for (let i = 0; i < numPoints; i++) {
      const time = roundedMinTime.getTime() + timeStep * i;
      const date = new Date(time);
      // Round to nearest interval
      date.setMinutes(Math.round(date.getMinutes() / intervalInMinutes) * intervalInMinutes);
      date.setSeconds(0);
      date.setMilliseconds(0);
      timePoints.push(date);
    }

    // Group data into these time points
    const groupedArr = timePoints.map(date => {
      const count = data.filter(post => {
        const postTime = new Date(post.last_update_time).getTime();
        return postTime <= date.getTime();
      }).length;
      return {
        date: date.toISOString(),
        count
      };
    });

    setGrouped(groupedArr);
  }, [data]);

  const cumulativeData = grouped.map(item => item.count);

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
            const currentYear = new Date().getFullYear();
            const year = date.getFullYear();
            const month = date.toLocaleString('en-US', { month: 'short' });
            const day = date.getDate();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return year === currentYear ? 
              `${month} ${day} ${hours}:${minutes}` : 
              `${month} ${day}, ${year} ${hours}:${minutes}`;
          }
        },
      },
      yAxis: {
        type: 'value',
        min: 'dataMin',
        axisLabel: { 
          fontSize: 12,
          formatter: (value: number) => Math.round(value)
        },
        minInterval: 1,  // 最小间隔为1
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