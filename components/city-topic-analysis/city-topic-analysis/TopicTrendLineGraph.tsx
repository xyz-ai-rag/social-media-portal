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
import { format } from "date-fns";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  LineChart,
  CanvasRenderer,
]);

interface TopicTrendLineGraphProps {
  businessId: string;
  topic: string;
  topicType: string;
}

interface MonthlySMPI {
  month: string;
  smpi: number;
  total: number;
  highly_positive: number;
  positive: number;
  negative: number;
  highly_negative: number;
  criticism: number;
}

interface TopicTrendData {
  topic: string;
  monthly_smpi: MonthlySMPI[];
}

export default function TopicTrendLineGraph({ 
  businessId, 
  topic,
  topicType
}: TopicTrendLineGraphProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [trendData, setTrendData] = useState<TopicTrendData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 获取数据
  useEffect(() => {
    let isCurrent = true;

    async function fetchTrendData() {
      setIsLoading(true);
      try {
        const url = `/api/city-topics/getTopicSMPIHistory?businessId=${encodeURIComponent(businessId)}&topic=${encodeURIComponent(topic)}&type=${encodeURIComponent(topicType)}`;
        console.log('[TopicTrendLineGraph] Fetching SMPI history:', url);
        
        const res = await fetch(url);
        const data = await res.json();
        console.log('[TopicTrendLineGraph] Received SMPI history:', data);

        if (isCurrent) {
          setTrendData(data);
        }
      } catch (err) {
        console.error('[TopicTrendLineGraph] Error fetching SMPI history:', err);
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    fetchTrendData();

    return () => {
      isCurrent = false;
    };
  }, [businessId, topic, topicType]);

  // 渲染图表
  useEffect(() => {
    if (isLoading || !chartRef.current || !trendData) return;

    const chart = echarts.init(chartRef.current);

    if (!trendData?.monthly_smpi?.length) {
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

    const months = trendData.monthly_smpi.map(item => item.month);
    const smpiValues = trendData.monthly_smpi.map(item => item.smpi);

    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const [param] = params;
          const monthData = trendData.monthly_smpi.find(item => item.month === param.name);
          return `
            <div>
              <div><strong>${param.name}</strong></div>
              <div>SMPI: ${param.value.toFixed(1)}</div>
              <div>Total: ${monthData?.total || 0}</div>
              <div>HP: ${monthData?.highly_positive || 0}</div>
              <div>P: ${monthData?.positive || 0}</div>
              <div>Neg: ${monthData?.negative || 0}</div>
              <div>HN: ${monthData?.highly_negative || 0}</div>
              <div>Crit: ${monthData?.criticism || 0}</div>
            </div>
          `;
        }
      },
      grid: {
        top: '8%',
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: {
          formatter: (value: string) => format(new Date(value + '-01'), 'MMM yyyy'),
        },
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        name: 'SMPI Score',
        splitLine: {
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: 'SMPI Score',
          type: 'line',
          data: smpiValues,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#5D5FEF',
          },
          itemStyle: {
            color: '#5D5FEF',
          },
          areaStyle: {
            opacity: 0.1,
            color: '#5D5FEF',
          },
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
  }, [isLoading, trendData]);

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
          SMPI Over Time
        </h2>
      </div>
      <div className="h-72">
        <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
} 