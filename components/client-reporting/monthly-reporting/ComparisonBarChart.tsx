import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { endOfMonth, format, startOfDay, subMonths } from 'date-fns';
import { setEndOfDay } from '@/utils/timeUtils';
import { setStartOfDay } from '@/utils/timeUtils';

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
  allBusinessIds: string;
  type: string;
  param: string;
}

export default function ComparisonBarChart({
  title,
  month,
  type,
  param,  
  allBusinessIds,
}: ComparisonBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonthData, setCurrentMonthData] = useState<number>(0);
  const [lastMonthData, setLastMonthData] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch current month data
        const currentMonth = format(month, 'yyyy-MM');
        const currentMonthResponse = await fetch(
          `/api/client-reporting/posts-count?&month=${currentMonth}&type=${type}${param ? `&param=${param}` : ''}`
        );
        const currentMonthResult = await currentMonthResponse.json();

        // Fetch last month data
        const lastMonthResponse = await fetch(
          `/api/client-reporting/posts-count?&month=${format(subMonths(currentMonth, 1), 'yyyy-MM')}&type=${type}${param ? `&param=${param}` : ''}`
        );
        const lastMonthResult = await lastMonthResponse.json();

        setCurrentMonthData(currentMonthResult.count || 0);
        setLastMonthData(lastMonthResult.count || 0);
      } catch (error) {
        console.error('Error fetching comparison data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [month, type, param]);

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
        data: [month, format(subMonths(month, 1), 'yyyy-MM')],
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
          data: [currentMonthData, lastMonthData],
          itemStyle: {
            color: function(params: any) {
              return params.dataIndex === 0 ? '#5D5FEF' : '#A5A6F6';
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

    setIsLoading(false);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [currentMonthData, lastMonthData]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-64 flex items-center justify-center w-full">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
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