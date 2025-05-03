"use client";
import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";
import { useDateRange } from "@/context/DateRangeContext";
import { constructVercelURL } from "@/utils/generateURL";

interface ContentTypeProps {
  clientId: string;
  businessId: string;
}

interface ContentTypeStat {
  type: string;
  count: number;
  percentage: number;
}

interface ContentTypeData {
  contentTypeStats: ContentTypeStat[];
  totalCount: number;
}

export default function ContentType({ clientId, businessId }: ContentTypeProps) {
  const { dateRange } = useDateRange();
  // Format the raw date strings for display.
  const formattedStart = useMemo(
    () => format(new Date(dateRange.startDate), "MMM d"),
    [dateRange.startDate]
  );
  const formattedEnd = useMemo(
    () => format(new Date(dateRange.endDate), "MMM d"),
    [dateRange.endDate]
  );
  const startDateProcessed = useMemo(
    () => setStartOfDay(dateRange.startDate),
    [dateRange.startDate]
  );
  const endDateProcessed = useMemo(
    () => setEndOfDay(dateRange.endDate),
    [dateRange.endDate]
  );
  const [contentTypeData, setContentTypeData] = useState<ContentTypeData>({
    contentTypeStats: [],
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContentTypeData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          constructVercelURL(
            `/api/charts/getContentTypeStats?business_id=${businessId}&start_date=${startDateProcessed}&end_date=${endDateProcessed}`
          ),
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch content type data");
        }

        const data = await response.json();
        setContentTypeData(data);
      } catch (error) {
        console.error("Error fetching content type data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContentTypeData();
  }, [businessId, dateRange]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-medium text-gray-800">Posts Per Day</h2>
          </div>
          {/* Subheading: show date range */}
          <div className="text-sm text-gray-600 mb-4">
            Posts from {formattedStart} to {formattedEnd}
          </div>
          <div className="flex flex-col gap-4">
            {contentTypeData.contentTypeStats.map((stat, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-700">{stat.type}</span>
                <span className="font-semibold">{stat.percentage}%</span>
              </div>
            ))}
            {contentTypeData.contentTypeStats.length === 0 && (
              <p className="text-gray-500 text-center">No content type data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 