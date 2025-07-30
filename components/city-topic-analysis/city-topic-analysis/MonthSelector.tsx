"use client";

import { FC, useMemo } from "react";
import { format, subMonths, parseISO } from "date-fns";

interface MonthSelectorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  earliestDate?: string;
  showEverything?: boolean;
  className?: string;
}

const MonthSelector: FC<MonthSelectorProps> = ({
  selectedMonth,
  onMonthChange,
  earliestDate = "2024-06-01",
  showEverything = true,
  className = ""
}) => {
  // Generate month options
  const monthOptions = useMemo(() => {
    const options = [];
    const seenMonths = new Set(); // Track added months to avoid duplicates
    
    // Add "Everything" option if enabled
    if (showEverything) {
      options.push({
        value: 'everything',
        label: 'Everything'
      });
    }
    
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    let currentDate = subMonths(now, 1);
    const startDateObj = parseISO(earliestDate);

    while (currentDate >= startDateObj) {
      const monthStr = format(currentDate, 'yyyy-MM');
      const monthLabel = format(currentDate, 'MMM yyyy');
      
      // Check if month already added to avoid duplicates
      if (monthStr !== currentMonth && !seenMonths.has(monthStr)) {
        options.push({
          value: monthStr,
          label: monthLabel
        });
        seenMonths.add(monthStr);
      }
      
      // Use subMonths to avoid date mutation issues
      currentDate = subMonths(currentDate, 1);
    }

    return options;
  }, [earliestDate, showEverything]);

  // Cache onChange handler
  const handleChange = useMemo(() => (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthChange(e.target.value);
  }, [onMonthChange]);

  return (
    <select
      value={selectedMonth}
      onChange={handleChange}
      className={`px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    >
      {monthOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default MonthSelector; 