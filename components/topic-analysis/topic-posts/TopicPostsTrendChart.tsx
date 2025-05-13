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
  const [grouped, setGrouped] = useState<{ date: string, count: number, formattedDate: string }[]>([]);
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

  useEffect(() => {
    if (!data || data.length < 2) {
      setGrouped([]);
      return;
    }
    // Get chart container width
    let chartWidth = 1200;
    if (chartRef.current) {
      chartWidth = chartRef.current.offsetWidth || 1200;
    }
    const maxWinPoints = Math.floor(chartWidth / MIN_POINT_DISTANCE);
    const maxPoints = Math.min(maxWinPoints, 30);

    // Calculate time range
    const times = data.map(d => new Date(d.last_update_time).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    // If minTime equals maxTime, add one hour to maxTime to avoid division by zero
    const adjustedMaxTime = minTime === maxTime ? maxTime + 3600000 : maxTime;
    
    // Check if dates are in the same year
    const minYear = new Date(minTime).getFullYear();
    const maxYear = new Date(adjustedMaxTime).getFullYear();
    setSameYear(minYear === maxYear);

    // Calculate appropriate time interval based on time range
    const timeSpan = adjustedMaxTime - minTime;
    const timeSpanInHours = timeSpan / (1000 * 60 * 60);
    const timeSpanInDays = timeSpanInHours / 24;

    // Determine time interval based on time span
    const calculatedInterval = Math.round((timeSpanInDays * 24 / maxPoints * 60) / 60) * 60;
    // Ensure minimum interval is 1 minute
    const intervalInMinutes = Math.max(1, calculatedInterval);
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
    const timeStep = (adjustedMaxTime - roundedMinTime.getTime() + intervalInMinutes * 60000) / (numPoints - 1);

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
        const postDate = new Date(post.last_update_time);
        console.log(postDate, "postDate");

        // If interval is greater than a day, round to start of day
        if (intervalInMinutes > 24 * 60) {
          const compareDate = new Date(date);
          return (
            postDate.getFullYear() < compareDate.getFullYear() ||
            (postDate.getFullYear() === compareDate.getFullYear() &&
              (postDate.getMonth() < compareDate.getMonth() ||
                (postDate.getMonth() === compareDate.getMonth() &&
                  postDate.getDate() <= compareDate.getDate())))
          );
        }
        if (intervalInMinutes > 180) {
          const compareDate = new Date(date);
          return (
            postDate.getFullYear() < compareDate.getFullYear() ||
            (postDate.getFullYear() === compareDate.getFullYear() &&
              (postDate.getMonth() < compareDate.getMonth() ||
                (postDate.getMonth() === compareDate.getMonth() &&
                  (postDate.getDate() < compareDate.getDate() ||
                    (postDate.getDate() === compareDate.getDate() &&
                      postDate.getHours() <= compareDate.getHours())))))
          );
        }
        return postTime <= date.getTime();
      }).length;
      const year = date.getFullYear();
      const month = date.toLocaleString('en-US', { month: 'short' });
      const day = date.getDate();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const formattedDate = intervalInMinutes > 180 ?
        `${month} ${day}${!sameYear ? `, ${year}` : ''} ${intervalInMinutes < 60 * 24 ? hours : ''}` :
        `${month} ${day}${!sameYear ? `, ${year}` : ''} ${hours}:${minutes}`;
      return {
        date: date.toISOString(),
        count,
        formattedDate
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
        bottom: 35,
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

  return (
    <>
      {data.length > 1 ? (
        <div
          ref={chartRef}
          style={{ width: '100%' }}
          className="h-[300px] flex items-center justify-center w-full"
        />
      ) : (
        <div className="h-[100px] flex items-center justify-center w-full">
          <p>Not enough data to show line chart</p>
        </div>
      )}
    </>
  );
};

export default TopicPostTrendChart; 