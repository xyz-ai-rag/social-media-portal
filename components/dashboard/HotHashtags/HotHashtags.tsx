"use client";

import React, { useEffect, useState } from "react";
import { useDateRange } from "@/context/DateRangeContext";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";
import { format } from "date-fns";

import {
  FaPlane,
  FaHotel,
  FaUtensils,
  FaMagic,
  FaMusic,
  FaShoppingBag,
  FaStar,
  FaEllipsisH,
} from "react-icons/fa";

interface HashtagItem {
  tag: string;
  percentage: number;
}

interface HashtagChartProps {
  clientId: string;
  businessId: string;
}

export default function HashtagChart({
  clientId,
  businessId,
}: HashtagChartProps) {
  const [hashtags, setHashtags] = useState<HashtagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get the date range from context.
  const { dateRange } = useDateRange();

  // Process the start and end dates using helper functions.
  const startDateProcessed = setStartOfDay(dateRange.startDate);
  const endDateProcessed = setEndOfDay(dateRange.endDate);

  // Mapping from tag (string) to a JSX icon element.
  const tagIconMapping: Record<string, React.ReactNode> = {
    Travel: <FaPlane className="text-gray-600" />,
    Hotels: <FaHotel className="text-gray-600" />,
    Foods: <FaUtensils className="text-gray-600" />,
    "Fashion and Beauty": <FaMagic className="text-gray-600" />,
    Festivals: <FaMusic className="text-gray-600" />,
    Shopping: <FaShoppingBag className="text-gray-600" />,
    "Special Event": <FaStar className="text-gray-600" />,
    // Fallback if the tag doesn't match any key.
    Others: <FaEllipsisH className="text-gray-600" />,
  };

  useEffect(() => {
    async function fetchHashtagData() {
      try {
        const url = `/api/charts/hashtags?business_id=${businessId}&start_date=${startDateProcessed}&end_date=${endDateProcessed}`;
        const res = await fetch(url);
        const data = await res.json();
        // Assume data is an array of objects like: [ { tag: "Travel", percentage: 15 }, ... ]
        setHashtags(data);
      } catch (error) {
        console.error("Error fetching hashtag data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHashtagData();
  }, [businessId, startDateProcessed, endDateProcessed]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center h-64">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full overflow-auto">
      <h2 className="text-base font-medium text-gray-800 mb-2">
        Top Hashtag Topics
      </h2>
      <div className="text-sm text-gray-600 mb-4">
        Posts from {format(new Date(dateRange.startDate), "MMM d")} to{" "}
        {format(new Date(dateRange.endDate), "MMM d")}
      </div>
      {hashtags.length === 0 ? (
        <div>No hashtags found.</div>
      ) : (
        <div>
          {hashtags.map((hashtag, index) => (
            <div key={index} className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 mr-4 flex items-center justify-center">
                {/* Use the mapping; if the tag isn't defined, fallback to "Others" */}
                {tagIconMapping[hashtag.tag] || tagIconMapping["Others"]}
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{hashtag.tag}</span>
                  <span className="text-sm font-medium">
                    {hashtag.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${hashtag.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
