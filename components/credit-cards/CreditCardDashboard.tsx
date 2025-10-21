"use client";

import React, { useState, useEffect } from "react";
import { DateRangeProvider } from "@/context/DateRangeContext";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import CreditCardTabSection from "./CreditCardTabSection";
import TopHashtags from "./TopHashtags";
import TopUsers from "./TopUsers";
import PostCategory from "./PostCategory";
import PostType from "./PostType";
import PostsOverTime from "./PostsOverTime";
import ShareOfVoice from "./ShareOfVoice";
import ShareOfVoiceOverTime from "./SOVOvertime";
import SentimentComparison from "./SentimentComparison";
import NetSentimentScore from "./NetSentimentScore";
import SOVvsNetSentiment from "./ScatterPlot";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";

interface CreditCardDashboardProps {
  clientId: string;
  businessId: string;
}

export default function CreditCardDashboard({
  clientId,
  businessId,
}: CreditCardDashboardProps) {
  const { clientDetails } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [businessName, setBusinessName] = useState<string>("");
  const [lastCrawlTime, setLastCrawlTime] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState(0);
  const [displayLanguage, setDisplayLanguage] = useState<'en' | 'zh'>('en');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

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

  // Initialize and sync state from URL params
  useEffect(() => {
    const platformParam = searchParams.get("platform") || 'all';
    const tabParam = searchParams.get("tab");
    
    setSelectedPlatform(platformParam);
    
    // Set active tab from URL param, default to 0
    if (tabParam !== null) {
      const tabIndex = parseInt(tabParam, 10);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 2) {
        setActiveTab(tabIndex);
      }
    }
  }, [searchParams]);

  // Handler to update platform and URL
  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    
    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    if (platform === 'all') {
      params.delete('platform');
    } else {
      params.set('platform', platform);
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Handler to update active tab and URL
  const handleTabChange = (tabIndex: number) => {
    setActiveTab(tabIndex);
    
    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabIndex.toString());
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <DateRangeProvider>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-[34px] font-bold text-[#5D5FEF]">
            {businessName} Overview
          </h1>
          <div className="flex gap-4 items-end">
            <DateRangePicker 
              page="credit-cards" 
              businessId={businessId}
            />
            <div className="w-64">
              <select
                id="platform-filter"
                value={selectedPlatform}
                onChange={(e) => handlePlatformChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="all">All Platforms</option>
                <option value="xhs">Rednote</option>
                <option value="wb">Weibo</option>
                <option value="dy">Douyin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation with Language Toggle */}
        <CreditCardTabSection
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          displayLanguage={displayLanguage}
          setDisplayLanguage={setDisplayLanguage}
        />

        {/* Tab Content */}
        <div className="space-y-6" key={selectedPlatform}>
          {/* Tab 1: Overview */}
          {activeTab === 0 && (
            <>
              {/* Row 1: Post Type | Post Category | Top Users */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-[450px]">
                  <PostType 
                    businessId={businessId}
                    platform={selectedPlatform}
                  />
                </div>
                <div className="h-[450px]">
                  <PostCategory 
                    businessId={businessId}
                    platform={selectedPlatform}
                  />
                </div>
                <div className="h-[450px]">
                  <TopUsers 
                    businessId={businessId}
                    platform={selectedPlatform}
                  />
                </div>
              </div>

              {/* Row 2: Top Hashtags Word Cloud - Full Width */}
              <div className="h-[500px]">
                <TopHashtags 
                  businessId={businessId}
                  displayLanguage={displayLanguage}
                  platform={selectedPlatform}
                />
              </div>

              {/* Row 3: Posts Over Time - Full Width */}
              <div className="h-[550px]">
                <PostsOverTime 
                  businessId={businessId}
                  platform={selectedPlatform}
                />
              </div>
            </>
          )}

          {/* Tab 2: Share of Voice */}
          {activeTab === 1 && (
            <>
              {/* Share of Voice Pie Chart - Full Width */}
              <div className="h-[600px]">
                <ShareOfVoice 
                  businessId={businessId}
                  platform={selectedPlatform}
                />
              </div>

              {/* Share of Voice Over Time - Full Width */}
              <div className="h-[550px]">
                <ShareOfVoiceOverTime
                  businessId={businessId}
                  platform={selectedPlatform}
                />
              </div>
            </>
          )}

          {/* Tab 3: Sentiment */}
          {activeTab === 2 && (
            <>
              {/* Sentiment Comparison - Full Width */}
              <div className="h-[550px]">
                <SentimentComparison
                  businessId={businessId}
                  platform={selectedPlatform}
                />
              </div>

              {/* Net Sentiment Score - Full Width */}
              <div className="h-[500px]">
                <NetSentimentScore
                  businessId={businessId}
                  platform={selectedPlatform}
                />
              </div>

              {/* SOV vs Net Sentiment - Full Width */}
              <div className="h-[550px]">
                <SOVvsNetSentiment
                  businessId={businessId}
                  platform={selectedPlatform}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </DateRangeProvider>
  );
}