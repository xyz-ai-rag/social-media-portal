'use client';

import React, { useState, useEffect } from 'react';
import ChartComponent from './ChartComponent';

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Detect sidebar state
  useEffect(() => {
    const checkSidebarState = () => {
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState !== null) {
        setIsSidebarCollapsed(JSON.parse(savedState));
      }
    };

    // Check initial state
    checkSidebarState();

    // Set up an interval to check for changes
    const interval = setInterval(checkSidebarState, 300);

    // Listen for storage events
    const handleStorageChange = () => {
      checkSidebarState();
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Initialize charts
  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Fetch data based on date range
  const fetchData = async (start: string, end: string) => {
    // This would be an actual API call in a real application
    console.log(`Fetching data from ${start} to ${end}`);
    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  // Handle date changes
  useEffect(() => {
    if (startDate && endDate) {
      fetchData(startDate, endDate);
    }
  }, [startDate, endDate]);

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
      
      {/* Grid layout for dashboard - responsive based on sidebar state */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Number of posts chart - spans 2 columns */}
        <ChartComponent
          type="bar"
          title="Number of posts"
          data={barChartData}
          extraInfo={{
            value: "113",
            change: {
              value: "2.1%",
              isPositive: true
            },
            changeLabel: "vs last week",
            period: "Sales from 1-12 Dec, 2020"
          }}
          showViewReport={true}
          className="md:col-span-2"
        />
        
        {/* Platform Distribution Chart */}
        <ChartComponent
          type="pie"
          title="Platform"
          data={pieChartData}
          description="From 1-6 Dec, 2020"
          showViewReport={true}
        />
        
        {/* Topics Chart */}
        <ChartComponent
          type="bubble"
          title="Topics"
          description="Most common topics mentioned"
          data={topicsData}
          showViewReport={false}
        />
        
        {/* Top Hashtags */}
        <ChartComponent
          type="hashtags"
          title="Top Hashtags"
          description="Most commonly used hashtags"
          data={hashtagsData}
          showViewReport={false}
        />
        
        {/* Similar Businesses Chart */}
        <ChartComponent
          type="line"
          title="Similar Businesses"
          data={lineChartData}
          extraInfo={{
            value: "2,568",
            change: {
              value: "2.1%",
              isPositive: false
            },
            changeLabel: "vs last week",
            period: "Performance vs similar businesses"
          }}
          showViewReport={true}
        />
      </div>
    </div>
  );
}