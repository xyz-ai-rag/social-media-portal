"use client";

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  BarChart,
  CanvasRenderer,
]);

interface CompetitorComparisonBarChartProps {
  title: string;
  businessName: string;
  competitorName: string;
  businessData: number;
  competitorData: number;
}

export default function CompetitorComparisonBarChart({
  title,
  businessName,
  competitorName,
  businessData,
  competitorData
}: CompetitorComparisonBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params: any) {
          let result = '';
          params.forEach((param: any) => {
            result += `${param.seriesName}: ${param.value.toLocaleString()}<br/>`;
          });
          return result;
        }
      },
      legend: {
        bottom: 0,
        left: 'center',
        itemWidth: 12,
        itemHeight: 12,
        icon: 'rect',
        textStyle: {
          fontSize: 11
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '20%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['Comparison'],
        axisLabel: {
          show: false // Hide x-axis labels since we only have one category
        },
        axisTick: {
          show: false
        },
        axisLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: function(value: number) {
            return value.toLocaleString();
          }
        },
        splitLine: {
          lineStyle: {
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: businessName,
          type: 'bar',
          data: [businessData],
          itemStyle: {
            color: '#5D5FEF'
          },
          label: {
            show: true,
            position: 'top',
            formatter: function(params: any) {
              return params.value.toLocaleString();
            },
            fontSize: 12,
            fontWeight: 'bold'
          },
          barWidth: '30%'
        },
        {
          name: competitorName,
          type: 'bar',
          data: [competitorData],
          itemStyle: {
            color: '#10B981'
          },
          label: {
            show: true,
            position: 'top',
            formatter: function(params: any) {
              return params.value.toLocaleString();
            },
            fontSize: 12,
            fontWeight: 'bold'
          },
          barWidth: '30%'
        }
      ]
    };

    chart.setOption(option);

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [businessName, competitorName, businessData, competitorData]);

  // Show "No data available" if both values are 0
  if (businessData === 0 && competitorData === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md w-full min-h-64 flex flex-col">
        <h2 className="text-base font-medium text-gray-800 mb-2">{title}</h2>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full min-h-64 flex flex-col">
      <h2 className="text-base font-medium text-gray-800 mb-2">{title}</h2>
      <div className="flex-1">
        <div ref={chartRef} style={{ width: '100%', height: '200px' }} />
      </div>
    </div>
  );
}