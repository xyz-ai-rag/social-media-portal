import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { endOfMonth, format, startOfDay, subMonths, parse } from 'date-fns';

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
  param: string;
  businessId: string;
}

export default function ComparisonBarChart({
  title,
  month,
  param,
  businessId,
}: ComparisonBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonthData, setCurrentMonthData] = useState<number>(0);
  const [lastMonthData, setLastMonthData] = useState<number>(0);
  const [monthlyAvgData, setMonthlyAvgData] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch data by month
        const response = await fetch(
          `/api/client-reporting/posts-count?&businessId=${businessId}&param=${param}`
        );

        const data = await response.json();

        const currentMonth = format(parse(month, 'yyyy-MM', new Date()), 'yyyy-MM');
        const lastMonth = format(subMonths(parse(month, 'yyyy-MM', new Date()), 1), 'yyyy-MM');

        let total = 0;
        let count = 0;
        if(data.length === 0) {
          setCurrentMonthData(0);
          setLastMonthData(0);
          setMonthlyAvgData(0);
          return;
        }

        for (const month in data) {
          total += data[month].count;
          count++;
        }
        
        const avg = count > 0 ? Math.round(total / count) : 0;

        setCurrentMonthData(data[currentMonth]?.count || 0);
        setLastMonthData(data[lastMonth]?.count || 0);
        setMonthlyAvgData(avg);
      } catch (error) {
        console.error('Error fetching comparison data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [month, businessId]);

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
          format(parse(month, 'yyyy-MM', new Date()), 'yyyy-MM'),
          format(subMonths(parse(month, 'yyyy-MM', new Date()), 1), 'yyyy-MM'),
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
          data: [currentMonthData, lastMonthData, monthlyAvgData],
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

    setIsLoading(false);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [currentMonthData, lastMonthData, monthlyAvgData]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-64 flex items-center justify-center w-full">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }
  if(currentMonthData === 0 && lastMonthData === 0 && monthlyAvgData === 0) {
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