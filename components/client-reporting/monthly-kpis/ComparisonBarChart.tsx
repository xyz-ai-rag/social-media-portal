"use client"
import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { format, subMonths, parse } from 'date-fns';

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  BarChart,
  CanvasRenderer,
]);

interface ComparisonBarChartProps {
  title: string;
  month: string;
  thisMonthData: number;
  lastMonthData: number;
  monthlyAvgData: number;
}

export default function ComparisonBarChart({
  title,
  month,
  thisMonthData,
  lastMonthData,
  monthlyAvgData
}: ComparisonBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: [
          format(parse(month, 'yyyy-MM', new Date()), 'MMM yyyy'),
          format(subMonths(parse(month, 'yyyy-MM', new Date()), 1), 'MMM yyyy'),
          'Monthly Avg'
        ],
        axisLabel: {
          interval: 0
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: 'Posts',
          type: 'bar',
          data: [thisMonthData, lastMonthData, monthlyAvgData.toFixed(1)],
          itemStyle: {
            color: function(params: any) {
              if (params.dataIndex === 0) return '#5D5FEF';
              if (params.dataIndex === 1) return '#A5A6F6';
              return '#F6C85F';
            }
          },
          label: {
            show: true,
            position: 'top',
            formatter: '{c}'
          }
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
  }, [thisMonthData, lastMonthData, monthlyAvgData]);

  if(thisMonthData === 0 && lastMonthData === 0 && monthlyAvgData === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md w-full">
        <h2 className="text-base font-medium text-gray-800 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 text-center">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full">
      <h2 className="text-base font-medium text-gray-800 mb-2">{title}</h2>
      <div ref={chartRef} style={{ width: '100%', height: '200px' }} />
    </div>
  );
} 