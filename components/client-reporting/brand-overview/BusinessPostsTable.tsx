// Fixed HotelPostsTable Component - Client Level
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
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
  earliestDate: string;
  latestDate: string;
  allBusinessIds: string;
}

export default function BusinessPostsTable({
  clientId,
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
        // Updated API call for client-level reporting
        const url = `/api/client-reporting/line-graph?client_id=${encodeURIComponent(
          clientId
        )}&business_ids=${encodeURIComponent(
          allBusinessIds
        )}&start_date=${encodeURIComponent(
          startDateProcessed
        )}&end_date=${encodeURIComponent(endDateProcessed)}&level=monthly`;
        
        const res = await fetch(url);
        const data = await res.json();

        // Updated to use the new API response structure
        const allBusinesses: BusinessLineData[] = data.businesses || [];
        const tableRows = allBusinesses.map((biz) => ({
          business_id: biz.business_id,
          name: biz.business_name,
          total: biz.counts.reduce((sum, mc) => sum + mc.count, 0),
        }));
        
        // Sort by total posts (highest first)
        tableRows.sort((a, b) => b.total - a.total);
        
        if (isCurrent) {
          setTableData(tableRows);
        }

      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching hotel posts table data:", error);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    // Only fetch if we have the required data
    if (clientId && allBusinessIds) {
      fetchData();
    }

    return () => {
      isCurrent = false;
    };
  }, [clientId, startDateProcessed, endDateProcessed, allBusinessIds]);

  const grandTotal = tableData.reduce((sum, row) => sum + row.total, 0);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md overflow-auto">
        <div className="h-64 flex items-center justify-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto">
      <h2 className="text-base font-medium text-gray-800 mb-2">Total Posts Breakdown</h2>
      <div className="text-sm text-gray-600 mb-4">
        Posts from {formattedStart} to {formattedEnd}
      </div>
      {tableData.length === 0 ? (
        <div className="text-gray-500 text-center py-8">No data found.</div>
      ) : (
        <div>
          {/* Show grand total at the top */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total Across All Businesses</span>
              <span className="text-lg font-bold text-blue-600">{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Individual business breakdown */}
          <div className="space-y-4">
            {tableData.map((row, index) => {
              // Calculate bar width relative to the highest value (first item since sorted)
              const maxValue = tableData.length > 0 ? tableData[0].total : 1;
              const relativeWidth = maxValue > 0 ? (row.total / maxValue) * 100 : 0;
              
              return (
                <div
                  key={row.business_id}
                  className="cursor-pointer hover:bg-blue-50 rounded-lg p-3 transition-colors"
                  title={`${row.name}: ${row.total.toLocaleString()} posts`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-800">{row.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {row.total.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        ({grandTotal > 0 ? ((row.total / grandTotal) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 relative group">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${relativeWidth}%` }}
                    ></div>
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none whitespace-nowrap">
                      {row.name}: {row.total.toLocaleString()} posts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              Showing {tableData.length} business{tableData.length !== 1 ? 'es' : ''} with {grandTotal.toLocaleString()} total posts
            </div>
          </div>
        </div>
      )}
    </div>
  );
}