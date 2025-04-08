'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
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

// Sample data for visualization
const barChartData = [
  { day: '01', value: 12 },
  { day: '02', value: 8 },
  { day: '03', value: 11 },
  { day: '04', value: 7 },
  { day: '05', value: 13 },
  { day: '06', value: 15 },
  { day: '07', value: 12 },
  { day: '08', value: 9 },
  { day: '09', value: 11 },
  { day: '10', value: 8 },
  { day: '11', value: 14 },
  { day: '12', value: 16 },
];

const pieChartData = [
  { name: 'Rednote', value: 40, color: '#7986cb' },
  { name: 'Weibo', value: 32, color: '#9cb4ff' },
  { name: 'Douyin', value: 28, color: '#d3e3ff' },
];

const lineChartData = [
  { day: '01', value: 60, similar: 50 },
  { day: '02', value: 45, similar: 70 },
  { day: '03', value: 80, similar: 65 },
  { day: '04', value: 70, similar: 60 },
  { day: '05', value: 60, similar: 75 },
  { day: '06', value: 95, similar: 60 },
];

const topicsData = [
  { name: 'Food Taste', percentage: 85, color: '#ffa726' },
  { name: 'Hygiene', percentage: 85, color: '#7986cb' },
  { name: 'Packaging', percentage: 92, color: '#4dd0e1' },
];

const hashtagsData = [
  { tag: '#tourism', percentage: 15, imgSrc: '/icons/tourism.png' },
  { tag: '#bangkok', percentage: 10, imgSrc: '/icons/bangkok.png' },
  { tag: '#thailand', percentage: 8, imgSrc: '/icons/thailand.png' },
  { tag: '#hotel', percentage: 2, imgSrc: '/icons/hotel.png' },
];

export default function Dashboard() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const lineChartRef = useRef(null);
  const bubbleChartRef = useRef(null);
  
  // Initialize charts
  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Initialize charts after loading
  useEffect(() => {
    if (isLoading) return;
    
    // Bar Chart
    if (barChartRef.current) {
      const barChart = echarts.init(barChartRef.current);
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
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: barChartData.map(item => item.day),
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
            data: barChartData.map(item => item.value),
            itemStyle: {
              color: '#5470c6',
              borderRadius: [2, 2, 0, 0]
            }
          }
        ]
      };
      barChart.setOption(option);
      
      // Handle resizing
      window.addEventListener('resize', () => barChart.resize());
      return () => {
        barChart.dispose();
        window.removeEventListener('resize', () => barChart.resize());
      };
    }
  }, [isLoading]);
  
  // Initialize pie chart
  useEffect(() => {
    if (isLoading || !pieChartRef.current) return;
    
    const pieChart = echarts.init(pieChartRef.current);
    const option = {
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
          data: pieChartData.map(item => ({
            value: item.value,
            name: item.name,
            itemStyle: {
              color: item.color
            }
          }))
        }
      ]
    };
    pieChart.setOption(option);
    
    // Handle resizing
    window.addEventListener('resize', () => pieChart.resize());
    return () => {
      pieChart.dispose();
      window.removeEventListener('resize', () => pieChart.resize());
    };
  }, [isLoading]);
  
  // Initialize line chart
  useEffect(() => {
    if (isLoading || !lineChartRef.current) return;
    
    const lineChart = echarts.init(lineChartRef.current);
    const option = {
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
        data: lineChartData.map(item => item.day),
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
          stack: 'Total',
          data: lineChartData.map(item => item.value),
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
          stack: 'Total',
          data: lineChartData.map(item => item.similar),
          lineStyle: {
            width: 3,
            color: '#e0e0e0'
          },
          symbol: 'circle',
          symbolSize: 8
        }
      ]
    };
    lineChart.setOption(option);
    
    // Handle resizing
    window.addEventListener('resize', () => lineChart.resize());
    return () => {
      lineChart.dispose();
      window.removeEventListener('resize', () => lineChart.resize());
    };
  }, [isLoading]);
  
  // Initialize bubble chart - We'll use a custom bubble layout since ECharts doesn't have a direct equivalent
  useEffect(() => {
    if (isLoading || !bubbleChartRef.current) return;
    
    const bubbleChart = echarts.init(bubbleChartRef.current);
    const option = {
      series: [
        {
          type: 'graph',
          layout: 'none',
          symbolSize: (data:any) => data.size,
          roam: false,
          label: {
            show: true,
            formatter: (params:any) => {
              return `${params.data.percentage}%\n${params.name}`;
            },
            fontSize: 12,
            color: '#fff',
            position: 'inside'
          },
          emphasis: {
            focus: 'self'
          },
          data: topicsData.map((topic, index) => {
            // Create a custom layout for the bubbles
            const positions = [
              [200, 100],  // Food Taste
              [100, 150],  // Hygiene
              [150, 200]   // Packaging
            ];
            
            return {
              name: topic.name,
              value: positions[index],
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
    bubbleChart.setOption(option);
    
    // Handle resizing
    window.addEventListener('resize', () => bubbleChart.resize());
    return () => {
      bubbleChart.dispose();
      window.removeEventListener('resize', () => bubbleChart.resize());
    };
  }, [isLoading]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Business Name</h1>
        
        <div className="flex gap-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">Start Date</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-md p-2 text-sm"
            />
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">End Date</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-md p-2 text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Grid layout for dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Left: Number of posts */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gray-500">Number of posts</h2>
            <button className="text-sm text-blue-500">View Report</button>
          </div>
          
          <div className="mb-2">
            <span className="text-2xl font-bold">113</span>
            <div className="flex items-center mt-1 text-sm">
              <FiArrowUp className="text-green-500 mr-1" />
              <span className="text-green-500 font-medium">2.1%</span>
              <span className="text-gray-500 ml-1">vs last week</span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 mb-4">
            Sales from 1-12 Dec, 2020
          </div>
          
          <div className="h-64">
            <div ref={barChartRef} style={{ width: '100%', height: '100%' }}></div>
          </div>
          
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
        </div>
        
        {/* Top Middle: Empty or extension of first chart */}
        <div className="bg-white p-6 rounded-lg shadow-md hidden md:block">
          {/* This will be empty or an extension of the first chart on smaller screens */}
        </div>
        
        {/* Top Right: Platform Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gray-500">Platform</h2>
            <button className="text-sm text-blue-500">View Report</button>
          </div>
          
          <div className="text-xs text-gray-500 mb-4">
            From 1-6 Dec, 2020
          </div>
          
          <div className="h-64 flex justify-center items-center">
            <div className="relative w-full h-full">
              <div ref={pieChartRef} style={{ width: '100%', height: '100%' }}></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="font-bold">8 posts</div>
                <div className="text-xs text-gray-500">This week</div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-2">
            {pieChartData.map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="flex items-center">
                  <span className="h-3 w-3 rounded-full mr-1" style={{ backgroundColor: item.color }}></span>
                  <span className="text-xs">{item.name}</span>
                </div>
                <span className="text-xs font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Bottom Left: Topics */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gray-500">Topics</h2>
          </div>
          
          <div className="text-xs text-gray-500 mb-4">
            Most common topics mentioned
          </div>
          
          <div className="h-64">
            <div ref={bubbleChartRef} style={{ width: '100%', height: '100%' }}></div>
          </div>
        </div>
        
        {/* Bottom Middle: Top Hashtags */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gray-500">Top Hashtags</h2>
          </div>
          
          <div className="text-xs text-gray-500 mb-4">
            Most commonly used hashtags
          </div>
          
          <div className="space-y-4 mt-6">
            {hashtagsData.map((hashtag, index) => (
              <div key={index} className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                  <span className="text-xs">#{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{hashtag.tag}</div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full" 
                      style={{ width: `${hashtag.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm font-medium ml-2">{hashtag.percentage}%</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Bottom Right: Similar Businesses */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gray-500">Similar Businesses</h2>
            <button className="text-sm text-blue-500">View Report</button>
          </div>
          
          <div className="mb-2">
            <span className="text-2xl font-bold">2,568</span>
            <div className="flex items-center mt-1 text-sm">
              <FiArrowDown className="text-red-500 mr-1" />
              <span className="text-red-500 font-medium">2.1%</span>
              <span className="text-gray-500 ml-1">vs last week</span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 mb-4">
            Performance vs similar businesses
          </div>
          
          <div className="h-64">
            <div ref={lineChartRef} style={{ width: '100%', height: '100%' }}></div>
          </div>
          
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
        </div>
      </div>
    </div>
  );
}