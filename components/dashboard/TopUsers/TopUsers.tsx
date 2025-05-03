"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useDateRange } from "@/context/DateRangeContext";
import { constructVercelURL } from "@/utils/generateURL";
import { format } from "date-fns";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";

interface TopUsersProps {
  clientId: string;
  businessId: string;
}

interface UserPostCount {
  nickname: string;
  postCount: number;
}

export default function TopUsers({ clientId, businessId }: TopUsersProps) {
  const { dateRange } = useDateRange();
  const [topUsers, setTopUsers] = useState<UserPostCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          constructVercelURL(
            `/api/charts/getTopUsers?business_id=${businessId}&start_date=${startDateProcessed}&end_date=${endDateProcessed}`
          ),
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch top users data");
        }

        const data = await response.json();
        setTopUsers(data);
      } catch (error) {
        console.error("Error fetching top users data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopUsers();
  }, [businessId, dateRange]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : (
        <div>
          {/* Title */}
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-medium text-gray-800">Top Users</h2>
          </div>
          {/* Subheading: show date range */}
          <div className="text-sm text-gray-600 mb-4">
            Contents from {formattedStart} to {formattedEnd}
          </div>
          <div className="flex flex-col gap-4">
            {topUsers.map((user, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-700">{user.nickname}</span>
                <span className="font-semibold">{user.postCount} posts</span>
              </div>
            ))}
            {topUsers.length === 0 && (
              <p className="text-gray-500 text-center">No users with multiple posts found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 