"use client";
import React, { useState, useEffect } from "react";
import { constructVercelURL } from "@/utils/generateURL";
import { CheckCircle, XCircle, TrendingUp, TrendingDown } from "lucide-react";

interface MonthlySummaryDocumentProps {
  clientId: string;
  businessId: string;
  selectedMonth: string;
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

const MonthlySummaryDocument: React.FC<MonthlySummaryDocumentProps> = ({
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
  const handleTopicClick = (topic: Topic, topicType: "strength" | "weakness") => {
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
    <div className="bg-white p-8 space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-start gap-8">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-[#1e0a3c] mb-4">
            HSBC Red Monthly Summary:
          </h1>
          <p className="text-base text-gray-700 leading-relaxed">
            {summary.summary_text}
          </p>
        </div>

        {/* Post Count Box */}
        <div className="flex-shrink-0 border-4 border-black p-6 min-w-[400px]">
          <h2 className="text-3xl font-bold mb-3">
            Posts this month: {summary.post_count_current_month}
          </h2>
          <div className="flex items-center gap-2">
            {isIncrease ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <span
              className={`text-base font-medium ${
                isIncrease ? "text-green-600" : "text-red-600"
              }`}
            >
              {isIncrease ? "up" : "down"} {Math.abs(percentChange).toFixed(0)}%
              vs last month
            </span>
          </div>
        </div>
      </div>

      {/* Main Content with Circle */}
      <div className="relative min-h-[600px] mt-16">
        {/* Circle in center */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative w-[400px] h-[400px]">
            {/* Main Circle - Split in half */}
            <div className="absolute inset-0 rounded-full overflow-hidden shadow-2xl">
              <div className="flex w-full h-full">
                {/* Left Half - Strengths */}
                <div className="w-1/2 bg-[#3d0e7e] flex items-center justify-center">
                  <span className="text-white text-3xl font-bold tracking-wider transform -rotate-90 origin-center whitespace-nowrap">
                    STRENGTH
                  </span>
                </div>
                {/* Right Half - Weaknesses */}
                <div className="w-1/2 bg-[#8b4ba8] flex items-center justify-center">
                  <span className="text-white text-3xl font-bold tracking-wider transform rotate-90 origin-center whitespace-nowrap">
                    WEAKNESS
                  </span>
                </div>
              </div>
            </div>

            {/* Strength Icons - Positioned by polar coordinates */}
            {strengths.map((_, index) => {
              let angle, radius;
              
              if (strengths.length === 1) {
                // Single item: 180° (left middle)
                angle = 180;
                radius = 200 + 48;
              } else if (strengths.length === 2) {
                // Two items: 225° and 135°
                const angles = [225, 135];
                angle = angles[index];
                radius = 200 + 42;
              } else if (strengths.length === 3) {
                // Three items: 225° (top-left), 180° (left), 135° (bottom-left)
                const angles = [225, 180, 135];
                const radii = [240, 248, 240]; // middle one slightly further out
                angle = angles[index];
                radius = radii[index];
              } else {
                // For more items, distribute between 225° and 135°
                const startAngle = 225;
                const endAngle = 135;
                const angleRange = startAngle - endAngle;
                angle = startAngle - (angleRange / (strengths.length - 1)) * index;
                // Subtle curve: middle items slightly further out
                const curveOffset = Math.sin((index / (strengths.length - 1)) * Math.PI) * 8;
                radius = 240 + curveOffset;
              }
              
              // Convert polar to cartesian coordinates
              const angleRad = (angle * Math.PI) / 180;
              const x = 200 + radius * Math.cos(angleRad);
              const y = 200 + radius * Math.sin(angleRad);
              
              const position = {
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)'
              };
              
              return (
                <div
                  key={`strength-icon-${index}`}
                  className="absolute"
                  style={position}
                >
                  <div className="bg-white rounded-full p-2 shadow-lg border-4 border-white">
                    <div className="bg-purple-600 rounded-full p-2">
                      <CheckCircle className="w-8 h-8 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Weakness Icons - Positioned by polar coordinates */}
            {weaknesses.map((_, index) => {
              let angle, radius;
              
              if (weaknesses.length === 1) {
                // Single item: 0° (right middle)
                angle = 0;
                radius = 200 + 48;
              } else if (weaknesses.length === 2) {
                // Two items: 315° and 45°
                const angles = [315, 45];
                angle = angles[index];
                radius = 200 + 42;
              } else if (weaknesses.length === 3) {
                // Three items: 315° (top-right), 0° (right), 45° (bottom-right)
                const angles = [315, 0, 45];
                const radii = [240, 248, 240]; // middle one slightly further out
                angle = angles[index];
                radius = radii[index];
              } else {
                // For more items, distribute between 315° and 45°
                const startAngle = 315;
                angle = startAngle + (90 / (weaknesses.length - 1)) * index;
                if (angle >= 360) angle -= 360;
                // Subtle curve: middle items slightly further out
                const curveOffset = Math.sin((index / (weaknesses.length - 1)) * Math.PI) * 8;
                radius = 240 + curveOffset;
              }
              
              // Convert polar to cartesian coordinates
              const angleRad = (angle * Math.PI) / 180;
              const x = 200 + radius * Math.cos(angleRad);
              const y = 200 + radius * Math.sin(angleRad);
              
              const position = {
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)'
              };
              
              return (
                <div
                  key={`weakness-icon-${index}`}
                  className="absolute"
                  style={position}
                >
                  <div className="bg-white rounded-full p-2 shadow-lg border-4 border-white">
                    <div className="bg-purple-600 rounded-full p-2">
                      <XCircle className="w-8 h-8 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths - Left Side */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[35%]">
          {strengths.map((strength, index) => {
            let angle;
            
            if (strengths.length === 1) {
              angle = 180;
            } else if (strengths.length === 2) {
              angle = [225, 135][index];
            } else if (strengths.length === 3) {
              angle = [225, 180, 135][index];
            } else {
              const startAngle = 225;
              const endAngle = 135;
              const angleRange = startAngle - endAngle;
              angle = startAngle - (angleRange / (strengths.length - 1)) * index;
            }
            
            // Convert angle to vertical offset
            const angleRad = (angle * Math.PI) / 180;
            const topOffset = Math.sin(angleRad) * 170;
            
            return (
              <button
                key={strength.id}
                onClick={() => handleTopicClick(strength, "strength")}
                className="absolute right-8 text-right hover:opacity-80 transition-opacity w-full pr-12"
                style={{ top: `${topOffset}px` }}
              >
                <h3 className="text-2xl font-bold mb-2">{strength.topic_title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {strength.topic_description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Weaknesses - Right Side */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[35%]">
          {weaknesses.map((weakness, index) => {
            let angle;
            
            if (weaknesses.length === 1) {
              angle = 0;
            } else if (weaknesses.length === 2) {
              angle = [315, 45][index];
            } else if (weaknesses.length === 3) {
              angle = [315, 0, 45][index];
            } else {
              const startAngle = 315;
              angle = startAngle + (90 / (weaknesses.length - 1)) * index;
              if (angle >= 360) angle -= 360;
            }
            
            // Convert angle to vertical offset
            const angleRad = (angle * Math.PI) / 180;
            const topOffset = Math.sin(angleRad) * 170;
            
            return (
              <button
                key={weakness.id}
                onClick={() => handleTopicClick(weakness, "weakness")}
                className="absolute left-8 text-left hover:opacity-80 transition-opacity w-full pl-12"
                style={{ top: `${topOffset}px` }}
              >
                <h3 className="text-2xl font-bold mb-2">{weakness.topic_title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {weakness.topic_description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MonthlySummaryDocument;