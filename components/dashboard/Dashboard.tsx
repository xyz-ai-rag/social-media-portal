"use client";
import React, { useState, useEffect } from "react";
import { DateRangeProvider } from "@/context/DateRangeContext";
import DateRangePicker from "./DateRangePicker";
import GroupedBarChart from "@/components/dashboard/GroupedBarChart/GroupedBarChart";
import PieChartComponent from "./PieChart/PieChart";
import HashtagChart from "./HotHashtags/HotHashtags";
import LineGraph from "./SimilarBusinesses/LineGraph";
import { useAuth } from "@/context/AuthContext";

const TopicsChart = () => (
  <div className="bg-white p-6 rounded-lg shadow-md h-full">
    <h2 className="text-sm font-medium text-gray-500 mb-2">Topics</h2>
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
      <p className="text-gray-400">Topics Chart</p>
    </div>
  </div>
);

interface DashboardProps {
  clientId: string;
  businessId: string;
}

export default function Dashboard({ clientId, businessId }: DashboardProps) {
  const { clientDetails } = useAuth();
  const [businessName, setBusinessName] = useState<string>("");

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
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-[34px] font-bold text-[#5D5FEF]">
            Analytics Dashboard
          </h1>

          {/* Shared Date Range Picker */}
          <DateRangePicker />
        </div>

        {/* Grid layout for dashboard with all chart components */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full items-stretch">
          {/* Number of posts chart - spans 2 columns */}
          <div className="md:col-span-2">
            <GroupedBarChart clientId={clientId} businessId={businessId} />
          </div>

          {/* Platform Distribution Chart */}
          <div>
            <PieChartComponent clientId={clientId} businessId={businessId} />
          </div>

          {/* Topics Chart */}
          <div>
            <TopicsChart />
          </div>

          {/* Top Hashtags */}
          <div>
            <HashtagChart clientId={clientId} businessId={businessId} />
          </div>

          {/* Similar Businesses Chart */}
          <div>
            <LineGraph clientId={clientId} businessId={businessId} />
          </div>
        </div>
      </div>
    </DateRangeProvider>
  );
}
