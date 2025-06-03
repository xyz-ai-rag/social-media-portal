"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { setStartOfDay } from "@/utils/timeUtils";
import { setEndOfDay } from "@/utils/timeUtils";

interface MonthlyCount {
  date: string;
  count: number;
}

interface BusinessLineData {
  business_id: string;
  business_name: string;
  counts: MonthlyCount[];
}


interface HotelPostsTableProps {
  clientId: string;
  businessId: string;
  earliestDate: string;
  latestDate: string;
  allBusinessIds: string;
}

export default function HotelPostsTable({
  clientId,
  businessId,
  earliestDate,
  latestDate,
  allBusinessIds,
}: HotelPostsTableProps) {
  const [tableData, setTableData] = useState<{ business_id: string; name: string; total: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Process dates for API query.
  const startDateProcessed = useMemo(
    () => setStartOfDay(earliestDate),
    [earliestDate]
  );
  const endDateProcessed = useMemo(
    () => setEndOfDay(latestDate),
    [latestDate]
  );
  const formattedStart = useMemo(
    () => format(new Date(earliestDate), "MMM yyyy"),
    [earliestDate]
  );
  const formattedEnd = useMemo(
    () => format(new Date(latestDate), "MMM yyyy"),
    [latestDate]
  );

  useEffect(() => {
    let isCurrent = true;
    async function fetchData() {
      setIsLoading(true);
      try {
        const url = `/api/client-reporting/line-graph?business_id=${encodeURIComponent(
          businessId
        )}&all_business_ids=${encodeURIComponent(
          allBusinessIds
        )}&start_date=${encodeURIComponent(
          startDateProcessed
        )}&end_date=${encodeURIComponent(endDateProcessed)}`;
        const res = await fetch(url);
        const data = await res.json();

        const allBusinesses: BusinessLineData[] = data.similar || [];
        const tableRows = allBusinesses.map((biz) => ({
          business_id: biz.business_id,
          name: biz.business_name,
          total: biz.counts.reduce((sum, mc) => sum + mc.count, 0),
        }));
        tableRows.sort((a, b) => b.total - a.total);
        if (isCurrent) setTableData(tableRows);

      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching hotel posts table data:", error);
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }
    fetchData();
    return () => {
      isCurrent = false;
    };
  }, [businessId, earliestDate, latestDate, allBusinessIds]);
  const grandTotal = tableData.reduce((sum, row) => sum + row.total, 0);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center h-64">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto">
      <h2 className="text-base font-medium text-gray-800 mb-2">Hotel Total Posts</h2>
      <div className="text-sm text-gray-600 mb-4">
        Posts from {formattedStart} to {formattedEnd}
      </div>
      {tableData.length === 0 ? (
        <div>No data found.</div>
      ) : (
        <div>
          {tableData.map((row, index) => (
            <div
              key={index}
              className="mb-4 cursor-pointer hover:bg-blue-50 rounded transition"
              onClick={() => window.location.href = `/c/${clientId}/${row.business_id}/client-reporting/${row.business_id}`}
              title="View details"
            >
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{row.name}</span>
                <span className="text-sm font-medium">
                  {Math.round(row.total / grandTotal * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 relative group">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${row.total / grandTotal * 100}%` }}
                ></div>
                <div className="absolute bottom-full mb-2 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none">
                  {row.total} posts
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

