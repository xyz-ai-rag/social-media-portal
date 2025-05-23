"use client";

import React, { useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts/core";
import { BarChart as EBarChart } from "echarts/charts";
import { TitleComponent, TooltipComponent, GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useRouter } from "next/navigation";

echarts.use([TitleComponent, TooltipComponent, GridComponent, EBarChart, CanvasRenderer]);

interface Topic {
  topic: string;
  count: number;
  percentage: number;
}

interface BarChartProps {
  topics: Topic[];
  businessId: string;
  clientId: string;
  minCount: number;
  maxTopics: number;
  topicType: string;
}

const BarChart: React.FC<BarChartProps> = ({ topics, businessId, clientId, minCount, maxTopics, topicType }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Filter topics by minimum count and limit the number of topics
  const filteredTopics = useMemo(() => {
    // If we have fewer topics than maxTopics, show all topics
    if (topics.length <= maxTopics) {
      return topics;
    }
    
    // Otherwise, sort by count (descending) and limit to maxTopics
    return [...topics]
      .sort((a, b) => b.count - a.count)
      .slice(0, maxTopics);
  }, [topics, maxTopics]);

  // For bar chart display, we want to show in ascending order
  const sortedTopics = useMemo(() => {
    return [...filteredTopics].sort((a, b) => a.count - b.count);
  }, [filteredTopics]);

  useEffect(() => {
    if (!chartRef.current || sortedTopics.length === 0) return;
    
    const chart = echarts.init(chartRef.current);

    const option = {
      grid: {
        left: 200,
        right: 100,
        top: 40,
        bottom: 20,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const d = params[0];
          return `<b>${d.name}</b>: ${d.value}`;
        },
      },
      xAxis: {
        type: 'value',
        boundaryGap: [0, 0.01],
        axisLabel: { fontSize: 12 },
      },
      yAxis: {
        type: 'category',
        data: sortedTopics.map((t) => t.topic),
        axisLabel: {
          fontSize: 12,
          formatter: (value: string) => {
            if (value.length <= 30) return value;
            const mid = Math.floor(value.length / 2);
            let split = value.lastIndexOf(' ', mid);
            if (split === -1 || split < 10) {
              split = value.indexOf(' ', mid);
            }
            if (split === -1 || split > 50) {
              split = 30;
            }
            const first = value.slice(0, split);
            const second = value.slice(split + 1, 60);
            return first + '\n' + second + (value.length > 60 ? '…' : '');
          },
        },
      },
      series: [
        {
          type: 'bar',
          data: sortedTopics.map((t) => t.count),
          itemStyle: {
            color: '#b0b7c3',
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right',
            fontSize: 12,
            color: '#222',
          },
          barWidth: 16,
        },
      ],
    };

    chart.setOption(option);

    // --- ResizeObserver + window.resize dual monitoring ---
    const resizeHandler = () => {
      chart.resize();
    };

    // ResizeObserver
    const resizeObserver = new window.ResizeObserver(() => {
      chart.resize();
    });
    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    // window resize
    window.addEventListener('resize', resizeHandler);

    setTimeout(() => chart.resize(), 0);

    chart.on('click', (params: any) => {
      const topicName = params.name;
      router.push(`/${clientId}/${businessId}/topic-analysis/${encodeURIComponent(topicName)}?topic_type=${encodeURIComponent(topicType)}`);
    });

    return () => {
      chart.off('click');
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeHandler);
      chart.dispose();
    };
  }, [sortedTopics, businessId, clientId, topicType, router]);

  if (sortedTopics.length === 0) {
    return null;
  }

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: `${Math.max(200, sortedTopics.length * 34)}px`
      }}
    />
  );
};

export default BarChart;