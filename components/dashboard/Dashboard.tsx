'use client';
import React, { useState, useEffect } from 'react';
import { DateRangeProvider } from '@/context/DateRangeContext';
import DateRangePicker from './DateRangePicker';
import GroupedBarChart from '@/components/dashboard/GroupedBarChart/GroupedBarChart';
import { useAuth } from '@/context/AuthContext';

// Dummy components for other charts
const PlatformChart = () => (
  <div className="bg-white p-6 rounded-lg shadow-md h-full">
    <h2 className="text-sm font-medium text-gray-500 mb-2">Platform</h2>
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
      <p className="text-gray-400">Platform Distribution Chart</p>
    </div>
  </div>
);

const TopicsChart = () => (
  <div className="bg-white p-6 rounded-lg shadow-md h-full">
    <h2 className="text-sm font-medium text-gray-500 mb-2">Topics</h2>
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
      <p className="text-gray-400">Topics Chart</p>
    </div>
  </div>
);

const HashtagsChart = () => (
  <div className="bg-white p-6 rounded-lg shadow-md h-full">
    <h2 className="text-sm font-medium text-gray-500 mb-2">Top Hashtags</h2>
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
      <p className="text-gray-400">Hashtags Chart</p>
    </div>
  </div>
);

const SimilarBusinessesChart = () => (
  <div className="bg-white p-6 rounded-lg shadow-md h-full">
    <h2 className="text-sm font-medium text-gray-500 mb-2">Similar Businesses</h2>
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
      <p className="text-gray-400">Similar Businesses Chart</p>
    </div>
  </div>
);

interface DashboardProps {
  clientId: string;
  businessId: string;
}

export default function Dashboard({ clientId, businessId }: DashboardProps) {
  const { clientDetails } = useAuth();
  const [businessName, setBusinessName] = useState<string>('');
  
  // Find current business name from clientDetails
  useEffect(() => {
    if (clientDetails?.businesses?.length) {
      const currentBusiness = clientDetails.businesses.find(
        (biz) => biz.business_id === businessId
      );
      
      if (currentBusiness) {
        setBusinessName(currentBusiness.business_name);
      }
    }
  }, [clientDetails, businessId]);

  return (
    <DateRangeProvider>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
          
          {/* Shared Date Range Picker */}
          <DateRangePicker />
        </div>
        
        {/* Business info banner */}
        {businessName && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
            <div className="flex items-center text-blue-700">
              <span className="font-medium">
                Viewing data for: {businessName}
              </span>
            </div>
          </div>
        )}
        
        {/* Grid layout for dashboard with all chart components */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Number of posts chart - spans 2 columns */}
          <div className="md:col-span-2">
            <GroupedBarChart clientId={clientId} businessId={businessId} />
          </div>
          
          {/* Platform Distribution Chart */}
          <div>
            <PlatformChart />
          </div>
          
          {/* Topics Chart */}
          <div>
            <TopicsChart />
          </div>
          
          {/* Top Hashtags */}
          <div>
            <HashtagsChart />
          </div>
          
          {/* Similar Businesses Chart */}
          <div>
            <SimilarBusinessesChart />
          </div>
        </div>
      </div>
    </DateRangeProvider>
  );
}