"use client";
import React, { useState, useEffect } from "react";
import { DateRangeProvider } from "@/context/DateRangeContext";
import DateRangePicker from "./DateRangePicker";
import GroupedBarChart from "@/components/dashboard/GroupedBarChart/GroupedBarChart";
import PieChartComponent from "./PieChart/PieChart";
import HashtagChart from "./HotHashtags/HotHashtags";
import LineGraph from "./SimilarBusinesses/LineGraph";
import TopCitiesMap from "./TopCities/TopCities";
import ContentType from "./ContentType/ContentType";
import TopUsers from "./TopUsers/TopUsers";
import { useAuth } from "@/context/AuthContext";

interface DashboardProps {
  clientId: string;
  businessId: string;
}

export default function Dashboard({ clientId, businessId }: DashboardProps) {
  const { clientDetails } = useAuth();
  const [businessName, setBusinessName] = useState<string>("");
  const [lastCrawlTime, setLastCrawlTime] = useState<Date>(new Date());

  const getFormattedTimestamp = (data: Date) => {
    const date = new Date(data);
    const month = date.toLocaleString("en-US", { month: "long" });
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;

    return `${month} ${day}, ${year} – ${hours}:${minutes}${ampm}`;
  };

  // Find current business name from clientDetails
  useEffect(() => {
    if (clientDetails?.businesses?.length) {
      const currentBusiness = clientDetails.businesses.find(
        (biz) => biz.business_id === businessId
      );

      if (currentBusiness) {
        setBusinessName(currentBusiness.business_name);
        setLastCrawlTime(currentBusiness.last_crawled_time);
      }
    }
  }, [clientDetails, businessId]);

  return (
    <DateRangeProvider>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-[34px] font-bold text-[#5D5FEF]">
            {businessName} Dashboard
          </h1>
          <DateRangePicker page="dashboard" businessId={businessId} />
        </div>
        <div className="">
          <h2 className="text-base font-medium text-gray-800 italic">
            Last Update: {getFormattedTimestamp(lastCrawlTime)}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-stretch">
          {/* Row 1 */}
          <div className="md:col-span-2">
            <GroupedBarChart clientId={clientId} businessId={businessId} />
          </div>
          <div className="md:col-span-1">
            <PieChartComponent clientId={clientId} businessId={businessId} />
          </div>

          {/* Row 2 */}
          <div className="md:col-span-1">
            <HashtagChart clientId={clientId} businessId={businessId} />
          </div>
          <div className="md:col-span-2">
            <LineGraph clientId={clientId} businessId={businessId} />
          </div>

          {/* Row 3 */}
          <div className="md:col-span-1">
            <TopCitiesMap clientId={clientId} businessId={businessId} />
          </div>
          <div className="md:col-span-1">
            <ContentType clientId={clientId} businessId={businessId} />
          </div>
          <div className="md:col-span-1">
            <TopUsers clientId={clientId} businessId={businessId} />
          </div>
        </div>
      </div>
    </DateRangeProvider>
  );
}
