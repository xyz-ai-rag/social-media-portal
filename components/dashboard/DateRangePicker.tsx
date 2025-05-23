"use client";

import React, { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { setStartOfDay, setEndOfDay } from "../../utils/timeUtils";
import { useDateRange } from "@/context/DateRangeContext";
import DatePicker from "../business-posts/DatePicker";

interface DateRangePickerProps {
  page: string;
  businessId?: string;
  onDateRangeChange?: (
    startDate: string,
    endDate: string,
    label: string,
    aggregation: "hourly" | "daily" | "weekly" | "monthly"
  ) => void;
}

export default function DateRangePicker({
  page,
  businessId,
  onDateRangeChange,
}: DateRangePickerProps) {
  // Add client-side only marker
  const [isClient, setIsClient] = useState(false);
  
  // Try to use context if available
  const dateRangeContext = useDateRange();

  const [selectedPreset, setSelectedPreset] = useState("last30Days");
  const [showCustomDates, setShowCustomDates] = useState(false);

  // Calculate date limits - use yesterday as the maximum selectable date
  const [yesterday, setYesterday] = useState("");
  const [thirtyDaysAgo, setThirtyDaysAgo] = useState("");
  
  // Initialize with empty states for custom dates
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [earliestDate, setEarliestDate] = useState<string>("");
  const [latestDate, setLatestDate] = useState<string>("");

  // Initialize client-side values and load stored preferences
  useEffect(() => {
    setIsClient(true);
    // Calculate dates on client-side only
    const yesterdayDate = subDays(new Date(), 1);
    const yesterdayStr = format(yesterdayDate, "yyyy-MM-dd");
    setYesterday(yesterdayStr);
    
    const thirtyDaysAgoDate = subDays(new Date(), 30);
    const thirtyDaysAgoStr = format(thirtyDaysAgoDate, "yyyy-MM-dd");
    setThirtyDaysAgo(thirtyDaysAgoStr);
    
    // Load preferences from sessionStorage
    const savedSelected = localStorage.getItem(`${page}_select`);
    if (savedSelected) {
      setSelectedPreset(JSON.parse(savedSelected));
      setShowCustomDates(JSON.parse(savedSelected) === "custom");
    }
    
    const savedStartDate = localStorage.getItem(`${page}_start_date`);
    if (savedStartDate) {
      setCustomStartDate(JSON.parse(savedStartDate));
    } else {
      setCustomStartDate(thirtyDaysAgoStr);
    }
    
    const savedEndDate = localStorage.getItem(`${page}_end_date`);
    if (savedEndDate) {
      setCustomEndDate(JSON.parse(savedEndDate));
    } else {
      setCustomEndDate(yesterdayStr);
    }

  }, []);

  // Fetch date range when component mounts
  useEffect(() => {
    const fetchDateRange = async () => {
      if (!businessId) return;
      
      try {
        const response = await fetch(
          `/api/charts/dateRange?business_id=${businessId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch date range");
        }
        const data = await response.json();
        if (data.earliest_date && data.latest_date) {
          setEarliestDate(data.earliest_date);
          setLatestDate(data.latest_date);
        }
      } catch (error) {
        console.error("Error fetching date range:", error);
      }
    };

    fetchDateRange();
  }, [businessId]);

  const getDatePreset = (preset: string) => {
    if (!isClient) return { start: "", end: "", label: "", aggregation: "daily" as const };
    
    switch (preset) {
      case "yesterday": {
        const yesterdayDate = subDays(new Date(), 1);
        const yesterdayStr = format(yesterdayDate, "yyyy-MM-dd");
        return {
          start: setStartOfDay(yesterdayStr),
          end: setEndOfDay(yesterdayStr),
          label: "Yesterday",
          aggregation: "hourly" as const,
        };
      }
      case "last7Days": {
        const yesterdayDate = subDays(new Date(), 1);
        const start = subDays(yesterdayDate, 6); // 7 days ending with yesterday
        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(yesterdayDate, "yyyy-MM-dd");
        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          label: "Last 7 days",
          aggregation: "daily" as const,
        };
      }
      case "last30Days": {
        const yesterdayDate = subDays(new Date(), 1);
        const start = subDays(yesterdayDate, 29); // 30 days ending with yesterday
        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(yesterdayDate, "yyyy-MM-dd");
        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          label: "Last 30 days",
          aggregation: "daily" as const,
        };
      }
      case "last60Days": {
        const yesterdayDate = subDays(new Date(), 1);
        const start = subDays(yesterdayDate, 59); // 30 days ending with yesterday
        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(yesterdayDate, "yyyy-MM-dd");
        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          label: "Last 60 days",
          aggregation: "daily" as const,
        };
      }
      case "last90Days": {
        const yesterdayDate = subDays(new Date(), 1);
        const start = subDays(yesterdayDate, 89); // 30 days ending with yesterday
        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(yesterdayDate, "yyyy-MM-dd");
        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          label: "Last 90 days",
          aggregation: "daily" as const,
        };
      }case "last120Days": {
        const yesterdayDate = subDays(new Date(), 1);
        const start = subDays(yesterdayDate, 119); // 30 days ending with yesterday
        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(yesterdayDate, "yyyy-MM-dd");
        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          label: "Last 120 days",
          aggregation: "daily" as const,
        };
      }
      case "everything": {
        const yesterdayDate = subDays(new Date(), 1);
        const startStr = earliestDate || "2023-01-01";
        const endStr = latestDate || format(yesterdayDate, "yyyy-MM-dd");
        let aggregation: "hourly" | "daily" | "weekly" | "monthly" = "daily";

        if (startStr && endStr) {
          const start = new Date(startStr);
          const end = new Date(endStr);
          const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 2) {
            aggregation = "hourly";
          } else if (diffDays <= 60) {
            aggregation = "daily";
          } else if (diffDays <= 180) {
            aggregation = "weekly";
          } else {
            aggregation = "monthly";
          }
        }

        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          label: "Everything",
          aggregation,
        };
      }
      case "thisMonth": {
        const today = new Date();
        const yesterdayDate = subDays(today, 1);
        const monthStart = startOfMonth(today);
        const startStr = format(monthStart, "yyyy-MM-dd");
        const endStr = format(yesterdayDate, "yyyy-MM-dd");
        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          label: "This month",
          aggregation: "daily" as const,
        };
      }
      case "lastMonth": {
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthStart = startOfMonth(lastMonth);
        const lastMonthEnd = endOfMonth(lastMonth);
        const startStr = format(lastMonthStart, "yyyy-MM-dd");
        const endStr = format(lastMonthEnd, "yyyy-MM-dd");
        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          label: "Last month",
          aggregation: "daily" as const,
        };
      }
      case "custom": {
        // Determine appropriate aggregation based on range size
        let aggregation: "hourly" | "daily" | "weekly" | "monthly" = "daily";

        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays <= 2) {
            aggregation = "hourly";
          } else if (diffDays <= 60) {
            aggregation = "daily";
          } else if (diffDays <= 180) {
            aggregation = "weekly";
          } else {
            aggregation = "monthly";
          }
        }

        return {
          start: customStartDate ? setStartOfDay(customStartDate) : "",
          end: customEndDate ? setEndOfDay(customEndDate) : "",
          label: "Custom range",
          aggregation,
        };
      }
      default:
        return {
          start: "",
          end: "",
          label: "",
          aggregation: "daily" as const,
        };
    }
  };

  // Save custom dates to sessionStorage
  useEffect(() => {
    if (!isClient) return;
    
    if (customStartDate) {
      localStorage.setItem(`${page}_start_date`, JSON.stringify(customStartDate));
    }
    if (customEndDate) {
      localStorage.setItem(`${page}_end_date`, JSON.stringify(customEndDate));
    }
  }, [customStartDate, customEndDate, isClient]);

  // Update date range when earliestDate changes
  useEffect(() => {
    if (!isClient || !earliestDate) return;
    if(!latestDate){return}
    
    if (selectedPreset === "everything") {
      if (dateRangeContext) {
        dateRangeContext.updateDateRange("everything", earliestDate, latestDate);
      }
    }
  }, [earliestDate, selectedPreset, dateRangeContext, isClient, latestDate]);

  // Update date range when preset changes
  useEffect(() => {
    if (!isClient) return;
    
    localStorage.setItem(`${page}_select`, JSON.stringify(selectedPreset));
    
    if (selectedPreset === "custom") {
      setShowCustomDates(true);
      if (customStartDate && customEndDate) {
        const { start, end, label, aggregation } = getDatePreset("custom");

        if (dateRangeContext) {
          dateRangeContext.updateDateRange("custom", start, end);
        } else if (onDateRangeChange) {
          onDateRangeChange(start, end, label, aggregation);
        }
      }
    } else {
      setShowCustomDates(false);
      const { start, end, label, aggregation } = getDatePreset(selectedPreset);

      if (dateRangeContext) {
        if (selectedPreset === "everything") {
          dateRangeContext.updateDateRange("everything", start, end);
        } else {
          dateRangeContext.updateDateRange(selectedPreset);
        }
      } else if (onDateRangeChange) {
        onDateRangeChange(start, end, label, aggregation);
      }
    }
  }, [selectedPreset, customStartDate, customEndDate, onDateRangeChange, dateRangeContext, isClient]);

  // Prepare the date preset options
  const datePresetOptions = [
    { key: "yesterday", label: "Yesterday" },
    { key: "last7Days", label: "Last 7 days" },
    { key: "last30Days", label: "Last 30 days" },
    { key: "last60Days", label: "Last 60 days" },
    { key: "last90Days", label: "Last 90 days" },
    { key: "last120Days", label: "Last 120 days" },
    { key: "thisMonth", label: "This month" },
    { key: "lastMonth", label: "Last month" },
    { key: "everything", label: "Everything" },
    { key: "custom", label: "Custom range" },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center">
      <div className="w-full md:w-auto">
        <select
          className="border rounded-md p-2 text-sm w-full"
          value={selectedPreset}
          onChange={(e) => setSelectedPreset(e.target.value)}
        >
          {datePresetOptions.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {showCustomDates && isClient && (
        <>
          <DatePicker
            id="start-date-picker"
            label="Start"
            value={customStartDate}
            onChange={setCustomStartDate}
            max={customEndDate}
          />

          <DatePicker
            id="end-date-picker"
            label="End"
            value={customEndDate}
            onChange={setCustomEndDate}
            max={yesterday}
          />
        </>
      )}
    </div>
  );
}