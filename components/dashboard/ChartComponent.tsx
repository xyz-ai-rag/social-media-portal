'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import {
  BarChart,
  LineChart,
  PieChart,
  GraphChart,
} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent
} from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

// Register the required components
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
  BarChart,
  LineChart,
  PieChart,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  GraphChart
]);

interface ChartProps {
  type: 'bar' | 'line' | 'pie' | 'bubble' | 'hashtags';
  title: string;
  description?: string;
  data: any;
  extraInfo?: {
    value?: string | number;
    change?: {
      value: string | number;
      isPositive: boolean;
    };
    changeLabel?: string;
    period?: string;
  };
  startDate?: string;
  endDate?: string;
  showViewReport?: boolean;
  className?: string;
}

const ChartComponent: React.FC<ChartProps> = ({
  type,
  title,
  description,
  data,
  extraInfo,
  showViewReport = true,
  className = '',
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || type === 'hashtags') return;

    // Create chart instance
    chart.current = echarts.init(chartRef.current);

    // Configure chart based on type
    let option: any = {};

    switch (type) {
      case 'bar':
        option = {
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
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: data.map((item: any) => item.day),
            axisLine: {
              show: false
            },
            axisTick: {
              show: false
            }
          },
          yAxis: {
            type: 'value',
            show: false
          },
          series: [
            {
              name: 'Posts',
              type: 'bar',
              barWidth: '60%',
              data: data.map((item: any) => item.value),
              itemStyle: {
                color: '#5470c6',
                borderRadius: [2, 2, 0, 0]
              }
            }
          ]
        };
        break;

      case 'pie':
        option = {
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            show: false
          },
          series: [
            {
              name: 'Platform',
              type: 'pie',
              radius: ['50%', '70%'],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 10,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: false
              },
              labelLine: {
                show: false
              },
              data: data.map((item: any) => ({
                value: item.value,
                name: item.name,
                itemStyle: {
                  color: item.color
                }
              }))
            }
          ]
        };
        break;

      case 'line':
        option = {
          tooltip: {
            trigger: 'axis'
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: data.map((item: any) => item.day),
            axisLine: {
              show: false
            },
            axisTick: {
              show: false
            }
          },
          yAxis: {
            type: 'value',
            show: false
          },
          series: [
            {
              name: 'Your Business',
              type: 'line',
              data: data.map((item: any) => item.value),
              lineStyle: {
                width: 3,
                color: '#5470c6'
              },
              symbol: 'circle',
              symbolSize: 8
            },
            {
              name: 'Similar Businesses',
              type: 'line',
              data: data.map((item: any) => item.similar),
              lineStyle: {
                width: 3,
                color: '#e0e0e0'
              },
              symbol: 'circle',
              symbolSize: 8
            }
          ]
        };
        break;

      case 'bubble':
        option = {
          series: [
            {
              type: 'graph',
              layout: 'none',
              symbolSize: (d: any) => d.size,
              roam: false,
              label: {
                show: true,
                formatter: (params: any) => {
                  return `${params.data.percentage}%\n${params.name}`;
                },
                fontSize: 12,
                color: '#fff',
                position: 'inside'
              },
              emphasis: {
                focus: 'self'
              },
              data: data.map((topic: any, index: number) => {
                // Create a custom layout for the bubbles
                const positions = [
                  [200, 100],  // Position 1
                  [100, 150],  // Position 2
                  [150, 200]   // Position 3
                ];
                
                return {
                  name: topic.name,
                  value: positions[index % positions.length],
                  size: topic.percentage,
                  percentage: topic.percentage,
                  itemStyle: {
                    color: topic.color
                  }
                };
              }),
              lineStyle: {
                color: 'source',
                curveness: 0.3
              }
            }
          ]
        };
        break;
    }

    // Apply configuration and render chart
    chart.current.setOption(option);

    // Handle window resize
    const handleResize = () => {
      chart.current?.resize();
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.current?.dispose();
    };
  }, [type, data]);

  // Render hashtags list for the hashtags type
  const renderHashtags = () => {
    if (type !== 'hashtags' || !data) return null;
  
    return (
      <div className="mt-0">
        {data.map((hashtag: any, index: number) => (
          <div key={index} className="flex items-center mb-5">
            <div className="w-10 h-10 rounded-full bg-gray-200 mr-4 flex items-center justify-center text-gray-600">
              <span className="text-sm font-medium">#{index + 1}</span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{hashtag.tag}</span>
                <span className="text-sm font-medium">{hashtag.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${hashtag.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-medium text-gray-500">{title}</h2>
        {showViewReport && (
          <button className="text-sm text-blue-500">View Report</button>
        )}
      </div>
      
      {/* For hashtags, use a smaller margin after description */}
      {(description || extraInfo?.period) && (
        <div className={`text-xs text-gray-500 ${type === 'hashtags' ? 'mb-2' : 'mb-4'}`}>
          {description || extraInfo?.period}
        </div>
      )}
      
      {extraInfo && extraInfo.value && (
        <div className="mb-2">
          <span className="text-2xl font-bold">{extraInfo.value}</span>
          {extraInfo.change && (
            <div className="flex items-center mt-1 text-sm">
              {extraInfo.change.isPositive ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <span className={extraInfo.change.isPositive ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                {extraInfo.change.value}
              </span>
              {extraInfo.changeLabel && (
                <span className="text-gray-500 ml-1">{extraInfo.changeLabel}</span>
              )}
            </div>
          )}
        </div>
      )}
      
      {type === 'pie' ? (
        <div className="h-64 flex justify-center items-center">
          <div className="relative w-full h-full">
            <div ref={chartRef} style={{ width: '100%', height: '100%' }}></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="font-bold">8 posts</div>
              <div className="text-xs text-gray-500">This week</div>
            </div>
          </div>
        </div>
      ) : type === 'hashtags' ? (
        <div className="-mt-2" style={{marginTop: '-0.5rem'}}> {/* Negative margin to pull content up */}
          {renderHashtags()}
        </div>
      ) : (
        <div className="h-64">
          <div ref={chartRef} style={{ width: '100%', height: '100%' }}></div>
        </div>
      )}
      
      {type === 'bar' && (
        <div className="flex gap-4 mt-2 text-xs">
          <div className="flex items-center">
            <span className="h-3 w-3 rounded-full bg-blue-500 mr-1"></span>
            <span>Last 5 days</span>
          </div>
          <div className="flex items-center">
            <span className="h-3 w-3 rounded-full bg-orange-400 mr-1"></span>
            <span>Last Week</span>
          </div>
        </div>
      )}
      
      {type === 'line' && (
        <div className="flex gap-4 mt-2 text-xs">
          <div className="flex items-center">
            <span className="h-3 w-3 rounded-full bg-blue-500 mr-1"></span>
            <span>Last 5 days</span>
          </div>
          <div className="flex items-center">
            <span className="h-3 w-3 rounded-full bg-gray-300 mr-1"></span>
            <span>Last Week</span>
          </div>
        </div>
      )}
      
      {type === 'pie' && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {data.map((item: any, index: number) => (
            <div key={index} className="flex flex-col items-center">
              <div className="flex items-center">
                <span className="h-3 w-3 rounded-full mr-1" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs">{item.name}</span>
              </div>
              <span className="text-xs font-medium">{item.value}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChartComponent;