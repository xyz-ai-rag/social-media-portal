"use client";

import React, { useState, useEffect } from "react";
import { DateRangeProvider } from "@/context/DateRangeContext";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
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

interface CreditCardDashboardProps {
  clientId: string;
  businessId: string;
}

export default function CreditCardDashboard({
  clientId,
  businessId,
}: CreditCardDashboardProps) {
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

  return (
    <DateRangeProvider>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-[34px] font-bold text-[#5D5FEF]">
            {businessName} Credit Card Analytics
          </h1>
          <DateRangePicker 
            page="credit-cards" 
            businessId={businessId}
          />
        </div>

        <div className="flex flex-col items-end gap-2 mb-6">
          <h2 className="text-base font-light text-gray-600 italic">
            Last Update: {getFormattedTimestamp(lastCrawlTime)}
          </h2>
        </div>

        <div className="space-y-6">
          {/* Posts Over Time - Full Width */}
          <div className="h-[500px]">
            <PostsOverTime 
              businessId={businessId}
            />
          </div>

          {/* Row 2: Share of Voice Over Time (2 cols) | Net Sentiment Score (1 col) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 h-[500px]">
              <ShareOfVoiceOverTime
                businessId={businessId}
              />
            </div>
            <div className="h-[500px]">
              <NetSentimentScore
                businessId={businessId}
              />
            </div>
          </div>

          {/* Row 3: Top Hashtags (2 cols) | Top Users (1 col) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 h-[450px]">
              <TopHashtags 
                businessId={businessId}
              />
            </div>
            <div className="h-[450px]">
              <TopUsers 
                businessId={businessId}
              />
            </div>
          </div>

          {/* Row 4: Sentiment Comparison (1 col) | Share of Voice (2 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-[550px]">
              <SentimentComparison
                businessId={businessId}
              />
            </div>
            <div className="md:col-span-2 h-[550px]">
              <ShareOfVoice 
                businessId={businessId}
              />
            </div>
          </div>

          {/* Row 5: SOV vs Net Sentiment - Full Width */}
          <div className="h-[550px]">
            <SOVvsNetSentiment
              businessId={businessId}
            />
          </div>

          {/* Row 6: Post Type | Post Category | Empty */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-[450px]">
              <PostType 
                businessId={businessId}
              />
            </div>
            <div className="h-[450px]">
              <PostCategory 
                businessId={businessId}
              />
            </div>
            <div className="h-[450px]">
              {/* Reserved for future component */}
            </div>
          </div>
        </div>
      </div>
    </DateRangeProvider>
  );
}