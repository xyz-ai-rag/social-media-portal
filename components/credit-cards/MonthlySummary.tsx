"use client";
import React, { useState, useEffect } from "react";
import { constructVercelURL } from "@/utils/generateURL";
import { TrendingUp, TrendingDown, MessageCircle, ChevronRight } from "lucide-react";

interface MonthlySummaryProps {
  clientId: string;
  businessId: string;
  selectedMonth: string; // Format: YYYY-MM
}

interface Topic {
  id: string;
  topic_title: string;
  topic_description: string;
  quote_count: number;
}

interface SummaryData {
  summary: {
    id: string;
    summary_text: string;
    post_count_current_month: number;
    post_count_last_month: number;
    percent_change: number;
    month: string;
  };
  strengths: Topic[];
  weaknesses: Topic[];
}

const MonthlySummary: React.FC<MonthlySummaryProps> = ({
  clientId,
  businessId,
  selectedMonth,
}) => {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch summary data
  useEffect(() => {
    const fetchSummary = async () => {
      if (!businessId || !selectedMonth) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          constructVercelURL(
            `/api/businesses/credit-cards/getMonthlySummary?businessId=${businessId}&month=${selectedMonth}`
          )
        );

        if (!response.ok) {
          throw new Error("Failed to fetch monthly summary");
        }

        const result = await response.json();

        if (result.success) {
          setSummaryData(result.data);
        } else {
          setError("No summary data available");
        }
      } catch (err: any) {
        console.error("Error fetching monthly summary:", err);
        setError(err.message || "Failed to load monthly summary");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [businessId, selectedMonth]);

  // Handle topic click to drill down
  const handleTopicClick = (topic: Topic, topicType: 'strength' | 'weakness') => {
  // Navigate to drill-down page
  const params = new URLSearchParams({
    topic_id: topic.id,
    topic_type: topicType,
    topic_name: topic.topic_title,
    month: selectedMonth,
  });
  
  window.location.href = `/${clientId}/${businessId}/monthly-summary/posts?${params.toString()}`;
};

  // Format month for display
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">
          {error || "No monthly summary available for this period"}
        </p>
      </div>
    );
  }

  const { summary, strengths, weaknesses } = summaryData;
  const percentChange = summary.percent_change * 100;
  const isIncrease = percentChange >= 0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          {/* Summary Text */}
          <div className="flex-1 pr-8">
            <h2 className="text-2xl font-bold text-[#1e0a3c] mb-4">
              {formatMonth(selectedMonth)}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {summary.summary_text}
            </p>
          </div>

          {/* Post Count Card */}
          <div className="flex-shrink-0 border-2 border-gray-900 rounded-lg p-6 min-w-[280px]">
            <h3 className="text-xl font-semibold mb-2">
              Posts this month: {summary.post_count_current_month}
            </h3>
            <div className="flex items-center gap-2">
              {isIncrease ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  isIncrease ? "text-green-600" : "text-red-600"
                }`}
              >
                {isIncrease ? "↑" : "↓"} {Math.abs(percentChange).toFixed(0)}%
                vs last month
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Strengths and Weaknesses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths Column */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Strengths</h3>
          </div>

          <div className="space-y-4">
            {strengths.length === 0 ? (
              <p className="text-gray-500 italic">
                No strengths identified this month
              </p>
            ) : (
              strengths.map((strength, index) => (
                <button
                    key={strength.id}
                    onClick={() => handleTopicClick(strength, 'strength')}
                    className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all group"
                    >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {index + 1}. {strength.topic_title}
                    </h4>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {strength.topic_description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MessageCircle className="w-4 h-4" />
                    <span>Mentioned in {strength.quote_count} posts</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Weaknesses Column */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Weaknesses</h3>
          </div>

          <div className="space-y-4">
            {weaknesses.length === 0 ? (
              <p className="text-gray-500 italic">
                No weaknesses identified this month
              </p>
            ) : (
              weaknesses.map((weakness, index) => (
                <button
                    key={weakness.id}
                    onClick={() => handleTopicClick(weakness, 'weakness')}
                    className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-red-500 hover:shadow-md transition-all group"
                    >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                      {index + 1}. {weakness.topic_title}
                    </h4>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {weakness.topic_description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MessageCircle className="w-4 h-4" />
                    <span>Mentioned in {weakness.quote_count} posts</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummary;