"use client";

import React, { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { setStartOfDay, setEndOfDay } from "../../utils/timeUtils";
import { useDateRange } from "@/context/DateRangeContext";
import DatePicker from "../business-posts/DatePicker";

interface DateRangePickerProps {
  onDateRangeChange?: (
    startDate: string,
    endDate: string,
    label: string,
    aggregation: "hourly" | "daily" | "weekly" | "monthly"
  ) => void;
}

export default function DateRangePicker({
  onDateRangeChange,
}: DateRangePickerProps) {
  // Try to use context if available
  const dateRangeContext = useDateRange();

  const [selectedPreset, setSelectedPreset] = useState(() => {
    if (typeof window !== "undefined") {
      const savedSelected = sessionStorage.getItem("dashboard_select");
      return savedSelected ? JSON.parse(savedSelected) : "last30Days";
    }
    return "last30Days";
  });

  const [showCustomDates, setShowCustomDates] = useState<boolean>(
    selectedPreset === "custom"
  );

  // Calculate date limits - use yesterday as the maximum selectable date
  const yesterday = subDays(new Date(), 1).toISOString().split("T")[0];
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];

  // Define preset date ranges
  const datePresets = {
    yesterday: {
      label: "Yesterday",
      getRange: () => {
        const yesterdayDate = subDays(new Date(), 1);
        const yesterdayStr = format(yesterdayDate, "yyyy-MM-dd");
        return {
          start: setStartOfDay(yesterdayStr),
          end: setEndOfDay(yesterdayStr),
          aggregation: "hourly" as const,
        };
      },
    },
    last7Days: {
      label: "Last 7 days",
      getRange: () => {
        const yesterdayDate = subDays(new Date(), 1);
        const start = subDays(yesterdayDate, 6); // 7 days ending with yesterday

        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(yesterdayDate, "yyyy-MM-dd");

        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          aggregation: "daily" as const,
        };
      },
    },
    last30Days: {
      label: "Last 30 days",
      getRange: () => {
        const yesterdayDate = subDays(new Date(), 1);
        const start = subDays(yesterdayDate, 29); // 30 days ending with yesterday

        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(yesterdayDate, "yyyy-MM-dd");

        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          aggregation: "daily" as const,
        };
      },
    },
    thisMonth: {
      label: "This month",
      getRange: () => {
        const today = new Date();
        const yesterdayDate = subDays(today, 1);
        const monthStart = startOfMonth(today);

        const startStr = format(monthStart, "yyyy-MM-dd");
        const endStr = format(yesterdayDate, "yyyy-MM-dd");

        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          aggregation: "daily" as const,
        };
      },
    },
    lastMonth: {
      label: "Last month",
      getRange: () => {
        const today = new Date();
        const lastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        const lastMonthStart = startOfMonth(lastMonth);
        const lastMonthEnd = endOfMonth(lastMonth);

        const startStr = format(lastMonthStart, "yyyy-MM-dd");
        const endStr = format(lastMonthEnd, "yyyy-MM-dd");

        return {
          start: setStartOfDay(startStr),
          end: setEndOfDay(endStr),
          aggregation: "daily" as const,
        };
      },
    },
    custom: {
      label: "Custom range",
      getRange: () => {
        // Determine appropriate aggregation based on range size
        let aggregation: "hourly" | "daily" | "weekly" | "monthly" = "daily";

        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          const diffDays = Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
          );

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
          aggregation,
        };
      },
    },
  };

  const [customStartDate, setCustomStartDate] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("dashboard_start_date");
      return saved ? JSON.parse(saved) : thirtyDaysAgo;
    }
    return thirtyDaysAgo;
  });

  const [customEndDate, setCustomEndDate] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("dashboard_end_date");
      return saved ? JSON.parse(saved) : yesterday;
    }
    return yesterday;
  });

  useEffect(() => {
    sessionStorage.setItem(
      "dashboard_start_date",
      JSON.stringify(customStartDate)
    );
    sessionStorage.setItem("dashboard_end_date", JSON.stringify(customEndDate));
  }, [customStartDate, customEndDate]);

  // Update date range when preset changes
  useEffect(() => {
    sessionStorage.setItem("dashboard_select", JSON.stringify(selectedPreset));
    if (selectedPreset === "custom") {
      setShowCustomDates(true);
      if (customStartDate && customEndDate) {
        const { start, end, aggregation } = datePresets.custom.getRange();

        // Use context if available, otherwise use prop
        if (dateRangeContext) {
          dateRangeContext.updateDateRange("custom", start, end);
        } else if (onDateRangeChange) {
          onDateRangeChange(start, end, "Custom range", aggregation);
        }
      }
    } else {
      setShowCustomDates(false);
      const preset = datePresets[selectedPreset as keyof typeof datePresets];
      const { start, end, aggregation } = preset.getRange();

      // Use context if available, otherwise use prop
      if (dateRangeContext) {
        dateRangeContext.updateDateRange(selectedPreset);
      } else if (onDateRangeChange) {
        onDateRangeChange(start, end, preset.label, aggregation);
      }
    }
  }, [
    selectedPreset,
    customStartDate,
    customEndDate,
    onDateRangeChange,
    dateRangeContext,
  ]);

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center">
      <div className="w-full md:w-auto">
        <select
          className="border rounded-md p-2 text-sm w-full"
          value={selectedPreset}
          onChange={(e) => setSelectedPreset(e.target.value)}
        >
          {Object.entries(datePresets).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {showCustomDates && (
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