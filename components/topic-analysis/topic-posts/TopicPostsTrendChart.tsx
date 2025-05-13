"use client";
import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { TitleComponent, TooltipComponent, GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { set } from "date-fns";

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
  const [grouped, setGrouped] = useState<{date: string, count: number, formattedDate: string}[]>([]);
  const [sameYear, setSameYear] = useState(true);
  const [intervalInMinutes, setIntervalInMinutes] = useState(0);
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
    const maxWinPoints = Math.floor(chartWidth / MIN_POINT_DISTANCE);
    const maxPoints = Math.min(maxWinPoints,30);
    
    // Calculate time range
    const times = data.map(d => new Date(d.last_update_time).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    // Check if dates are in the same year
    const minYear = new Date(minTime).getFullYear();
    const maxYear = new Date(maxTime).getFullYear();
    const sameYear = minYear === maxYear;
    setSameYear(sameYear);
    
    // Calculate appropriate time interval based on time range
    const timeSpan = maxTime - minTime;
    const timeSpanInHours = timeSpan / (1000 * 60 * 60);
    const timeSpanInDays = timeSpanInHours / 24;
    
    // Determine time interval based on time span
    let intervalInMinutes: number;
    intervalInMinutes = Math.round((timeSpanInDays * 24 /maxPoints * 60) / 60) * 60; 
    setIntervalInMinutes(intervalInMinutes);
    
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
      const year = date.getFullYear();
      const month = date.toLocaleString('en-US', { month: 'short' });
      const day = date.getDate();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const formattedDate = intervalInMinutes > 180 ? 
        `${month} ${day}${!sameYear ? `, ${year}` : ''} ${intervalInMinutes < 60*24 ? hours : ''}` : 
        `${month} ${day}${!sameYear ? `, ${year}` : ''} ${hours}:${minutes}`;
      return {
        date: date.toISOString(),
        count,
        formattedDate
      };
    });

    setGrouped(groupedArr);
  }, [data, sameYear, intervalInMinutes]);

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
          return `${grouped[d.dataIndex].formattedDate}<br/>Posts: ${d.value}`;
        },
      },
      xAxis: {
        type: 'category',
        data: grouped.map(item => item.formattedDate),
        axisLabel: {
          fontSize: 12,
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        min: 'dataMin',
        axisLabel: { 
          fontSize: 12,
          formatter: (value: number) => Math.round(value)
        },
        minInterval: 1, 
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
  }, [grouped]);

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