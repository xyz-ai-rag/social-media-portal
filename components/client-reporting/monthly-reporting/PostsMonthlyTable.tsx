"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";

interface MonthlyCount {
  date: string;
  count: number;
}

interface BusinessLineData {
  business_id: string;
  business_name: string;
  counts: MonthlyCount[];
}

interface TableRow {
  business_id: string;
  name: string;
  total: number;
  previousTotal: number;
  percentageChange: number;
}

interface PostsMonthlyTableProps {
  clientId: string;
  businessId: string;
  month: string;
  allBusinessIds: string;
}

export default function PostsMonthlyTable({
  clientId,
  businessId,
  month,
  allBusinessIds,
}: PostsMonthlyTableProps) {
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Process dates for API query
  const [year, monthNum] = month.split('-').map(Number);
  const currentDate = new Date(year, monthNum - 1);
  const previousDate = new Date(year, monthNum - 2);

  const startDateProcessed = useMemo(
    () => setStartOfDay(format(currentDate, 'yyyy-MM-dd')),
    [currentDate]
  );
  const endDateProcessed = useMemo(
    () => setEndOfDay(format(currentDate, 'yyyy-MM-dd')),
    [currentDate]
  );
  const previousStartDate = useMemo(
    () => setStartOfDay(format(previousDate, 'yyyy-MM-dd')),
    [previousDate]
  );
  const previousEndDate = useMemo(
    () => setEndOfDay(format(previousDate, 'yyyy-MM-dd')),
    [previousDate]
  );

  const formattedCurrentMonth = useMemo(
    () => format(currentDate, "MMM yyyy"),
    [currentDate]
  );
  const formattedPreviousMonth = useMemo(
    () => format(previousDate, "MMM yyyy"),
    [previousDate]
  );

  useEffect(() => {
    let isCurrent = true;
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch current month's data
        const currentUrl = `/api/client-reporting/line-graph?business_id=${encodeURIComponent(
          businessId
        )}&all_business_ids=${encodeURIComponent(
          allBusinessIds
        )}&start_date=${encodeURIComponent(
          startDateProcessed
        )}&end_date=${encodeURIComponent(endDateProcessed)}`;

        // Fetch previous month's data
        const previousUrl = `/api/client-reporting/line-graph?business_id=${encodeURIComponent(
          businessId
        )}&all_business_ids=${encodeURIComponent(
          allBusinessIds
        )}&start_date=${encodeURIComponent(
          previousStartDate
        )}&end_date=${encodeURIComponent(previousEndDate)}`;

        const [currentRes, previousRes] = await Promise.all([
          fetch(currentUrl),
          fetch(previousUrl)
        ]);

        const currentData = await currentRes.json();
        const previousData = await previousRes.json();

        const allBusinesses: BusinessLineData[] = currentData.similar || [];
        const previousBusinesses: BusinessLineData[] = previousData.similar || [];

        const tableRows = allBusinesses.map((biz) => {
          const currentTotal = biz.counts.reduce((sum, mc) => sum + mc.count, 0);
          const previousBiz = previousBusinesses.find(pb => pb.business_id === biz.business_id);
          const previousTotal = previousBiz ? previousBiz.counts.reduce((sum, mc) => sum + mc.count, 0) : 0;
          const percentageChange = previousTotal === 0 ? 100 : ((currentTotal - previousTotal) / previousTotal) * 100;

          return {
            business_id: biz.business_id,
            name: biz.business_name,
            total: currentTotal,
            previousTotal,
            percentageChange
          };
        })
        .filter(row => row.total > 0)
        .sort((a, b) => b.total - a.total);

        if (isCurrent) setTableData(tableRows);

      } catch (error) {
        if (isCurrent) {
          console.error("Error fetching monthly posts table data:", error);
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }
    fetchData();
    return () => {
      isCurrent = false;
    };
  }, [businessId, month, allBusinessIds, startDateProcessed, endDateProcessed, previousStartDate, previousEndDate]);

  const grandTotal = tableData.reduce((sum: number, row: TableRow) => sum + row.total, 0);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center h-64">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto">
      <h2 className="text-base font-medium text-gray-800 mb-2">Monthly Posts Comparison</h2>
      <div className="text-sm text-gray-600 mb-4">
        Comparing {formattedCurrentMonth} with {formattedPreviousMonth}
      </div>
      {tableData.length === 0 ? (
        <div>No data found.</div>
      ) : (
        <div>
          {tableData.map((row, index) => (
            <div
              key={index}
              className="mb-4 cursor-pointer hover:bg-blue-50 rounded transition p-2"
              onClick={() => window.location.href = `/c/${clientId}/${row.business_id}/client-reporting/${row.business_id}`}
              title="View details"
            >
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{row.name}</span>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-medium ${row.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.percentageChange >= 0 ? '+' : ''}{Math.round(row.percentageChange)}%
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round(row.total / grandTotal * 100)}%
                  </span>
                </div>
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