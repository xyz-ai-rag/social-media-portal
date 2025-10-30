"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DateRangeProvider } from "@/context/DateRangeContext";
import DateRangePicker from "./DateRangePicker";
import GroupedBarChart from "@/components/dashboard/GroupedBarChart/GroupedBarChart";
import PostTypeChart from "@/components/dashboard/PostTypeRing/PostTypeRingChart";
import PieChartComponent from "./PieChart/PieChart";
import HashtagChart from "./HotHashtags/HotHashtags";
import LineGraph from "./SimilarBusinesses/LineGraph";
import TopCitiesMap from "./TopCities/TopCities";
import ContentType from "./ContentType/ContentType";
import TopUsers from "./TopUsers/TopUsers";
import MonthlySummary from "../credit-cards/MonthlySummary";
import MonthlySummaryDocument from "../credit-cards/MonthlySummaryDocument";
import { useAuth } from "@/context/AuthContext";
import { DashboardTierBanner } from "@/components/TierBanner";
import { BarChart3, TrendingUp } from "lucide-react";

interface DashboardProps {
  clientId: string;
  businessId: string;
}

export default function Dashboard({ clientId, businessId }: DashboardProps) {
  const { clientDetails } = useAuth();
  const searchParams = useSearchParams();
  
  const [businessName, setBusinessName] = useState<string>("");
  const [businessType, setBusinessType] = useState<string>("");
  const [lastCrawlTime, setLastCrawlTime] = useState<Date>(new Date());
  
  // Initialize activeTab with URL parameter check
  const [activeTab, setActiveTab] = useState<'statistics' | 'monthly-summary'>(() => {
    // First check URL parameter
    if (typeof window !== 'undefined') {
      const urlTab = new URLSearchParams(window.location.search).get('tab');
      if (urlTab === 'monthly-summary') {
        return 'monthly-summary';
      }
      
      // Then check sessionStorage
      const savedTab = sessionStorage.getItem(`dashboard_active_tab_${businessId}`);
      return (savedTab as 'statistics' | 'monthly-summary') || 'statistics';
    }
    return 'statistics';
  });

  // Initialize selectedMonth with localStorage check
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const savedMonth = localStorage.getItem(`selected_month_${businessId}`);
      if (savedMonth) {
        return savedMonth;
      }
    }
    
    // Default to last month if nothing saved
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  });

  // Initialize summaryViewMode with sessionStorage check
  const [summaryViewMode, setSummaryViewMode] = useState<'dashboard' | 'document'>(() => {
    if (typeof window !== 'undefined') {
      const savedViewMode = sessionStorage.getItem(`summary_view_mode_${businessId}`);
      return (savedViewMode as 'dashboard' | 'document') || 'dashboard';
    }
    return 'dashboard';
  });

  // Save activeTab to sessionStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`dashboard_active_tab_${businessId}`, activeTab);
    }
  }, [activeTab, businessId]);

  // Save summaryViewMode to sessionStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`summary_view_mode_${businessId}`, summaryViewMode);
    }
  }, [summaryViewMode, businessId]);

  // Watch for URL parameter changes
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab === 'monthly-summary' && activeTab !== 'monthly-summary') {
      setActiveTab('monthly-summary');
    }
  }, [searchParams, activeTab]);

  const getFormattedTimestamp = (data: Date) => {
    const date = new Date(data);
    const month = date.toLocaleString("en-US", { month: "long" });
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;

    return `${month} ${day}, ${year} – ${hours}:${minutes} ${ampm}`;
  };

  // Find current business details from clientDetails
  useEffect(() => {
    if (clientDetails?.businesses?.length) {
      const currentBusiness = clientDetails.businesses.find(
        (biz) => biz.business_id === businessId
      );

      if (currentBusiness) {
        setBusinessName(currentBusiness.business_name);
        setBusinessType(currentBusiness.business_type || "");
        setLastCrawlTime(currentBusiness.last_crawled_time);
      }
    }
  }, [clientDetails, businessId]);

  // Check if this is a Credit Card business
  const isCreditCard = businessType === "Credit card";

  return (
    <DateRangeProvider>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-[34px] font-bold text-[#5D5FEF]">
            {businessName} Dashboard
          </h1>
          <DateRangePicker 
            page="dashboard" 
            businessId={businessId}
            activeTab={activeTab}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </div>

        {/* Tier-aware banner */}
        <DashboardTierBanner />

        <div className="flex flex-col items-end gap-2">
          <h2 className="text-base font-light text-gray-600 italic">
            Last Update: {getFormattedTimestamp(lastCrawlTime)}
          </h2>
        </div>

        {/* Tabs for Credit Card business type */}
        {isCreditCard && (
          <div className="mt-6 mb-4">
            <div className="border-b border-gray-200">
              <ul className="flex flex-wrap -mb-px text-sm font-medium text-center" role="tablist">
                <li className="mr-2" role="presentation">
                  <button
                    className={`inline-flex items-center gap-2 p-4 border-b-2 rounded-t-lg transition-colors ${
                      activeTab === 'statistics'
                        ? "text-blue-600 border-blue-600"
                        : "hover:text-gray-600 hover:border-gray-300 border-transparent"
                    }`}
                    type="button"
                    role="tab"
                    onClick={() => setActiveTab('statistics')}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Statistics
                  </button>
                </li>
                <li className="mr-2" role="presentation">
                  <button
                    className={`inline-flex items-center gap-2 p-4 border-b-2 rounded-t-lg transition-colors ${
                      activeTab === 'monthly-summary'
                        ? "text-blue-600 border-blue-600"
                        : "hover:text-gray-600 hover:border-gray-300 border-transparent"
                    }`}
                    type="button"
                    role="tab"
                    onClick={() => setActiveTab('monthly-summary')}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Monthly Summary
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {(!isCreditCard || activeTab === 'statistics') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-stretch">
            {/* Row 1 */}
            <div className="md:col-span-2">
              <GroupedBarChart clientId={clientId} businessId={businessId} />
            </div>
            <div className="md:col-span-1">
              <PieChartComponent clientId={clientId} businessId={businessId} />
            </div>

            {/* Row 2 */}
            <div className="md:col-span-1 h-[404px]">
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

            {/* Row 4 */}
            <div className="md:col-span-1">
              <PostTypeChart clientId={clientId} businessId={businessId} />
            </div>
          </div>
        )}

        {/* Monthly Summary Tab Content - Only for Credit Cards */}
        {isCreditCard && activeTab === 'monthly-summary' && (
          <div className="space-y-4">
            {/* View Toggle */}
            <div className="flex justify-end">
              <div className="inline-flex rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setSummaryViewMode('dashboard')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    summaryViewMode === 'dashboard'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Dashboard View
                </button>
                <button
                  onClick={() => setSummaryViewMode('document')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    summaryViewMode === 'document'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Document View
                </button>
              </div>
            </div>

            {/* Render appropriate component */}
            {summaryViewMode === 'dashboard' ? (
              <MonthlySummary 
                clientId={clientId} 
                businessId={businessId}
                selectedMonth={selectedMonth}
              />
            ) : (
              <MonthlySummaryDocument 
                clientId={clientId} 
                businessId={businessId}
                selectedMonth={selectedMonth}
              />
            )}
          </div>
        )}
      </div>
    </DateRangeProvider>
  );
}