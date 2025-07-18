"use client";

import React, { useState, useEffect } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface DateRangePickerProps {
  page: string;
  businessId?: string;
  onDateRangeChange?: (
    startDate: string,
    endDate: string,
    label: string,
    aggregation: "monthly"
  ) => void;
}

export default function DateRangePicker({
  page,
  businessId,
  onDateRangeChange,
}: DateRangePickerProps) {
  // 默认选中本月
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, "yyyy-MM");
  });

  useEffect(() => {
    // 计算本月起止
    const [year, month] = selectedMonth.split("-");
    const firstDay = startOfMonth(new Date(Number(year), Number(month) - 1));
    const lastDay = endOfMonth(new Date(Number(year), Number(month) - 1));
    const start = format(firstDay, "yyyy-MM-dd");
    const end = format(lastDay, "yyyy-MM-dd");
    const label = format(firstDay, "MMMM yyyy");
    if (onDateRangeChange) {
      onDateRangeChange(start, end, label, "monthly");
    }
    // 如果用 context，也可以在这里 update
  }, [selectedMonth, onDateRangeChange]);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="month-picker" className="text-sm font-medium"></label>
      <input
        id="month-picker"
        type="month"
        value={selectedMonth}
        onChange={e => setSelectedMonth(e.target.value)}
        className="border rounded-md p-2 text-sm"
      />
    </div>
  );
}