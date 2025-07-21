"use client";

import { FC, useState, useMemo } from "react";
import { format, subMonths, parseISO } from "date-fns";
import GroupedBarChart from '../../GroupedBarChart/GroupedBarChart';
import CityGeneralBubble from "./CityGeneralBubble";

interface Props {
  clientId: string;
  businessId: string;
}

const CitySpecificAnalysis: FC<Props> = ({ clientId, businessId }) => {
  // Get the last complete month as default (previous month)
  const lastCompleteMonth = useMemo(() => {
    return format(subMonths(new Date(), 1), 'yyyy-MM');
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(lastCompleteMonth);
  const [earliestDate, setEarliestDate] = useState<string>("2024-06-01");

  // 生成月份选项
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    let currentDate = subMonths(now, 1);
    const startDateObj = parseISO(earliestDate);

    while (currentDate >= startDateObj) {
      const monthStr = format(currentDate, 'yyyy-MM');
      const monthLabel = format(currentDate, 'MMM yyyy');
      if (monthStr !== currentMonth) {
        options.push({
          value: monthStr,
          label: monthLabel
        });
      }
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
    }

    return options;
  }, [earliestDate]);

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
      <div className="w-full max-w-4xl">
        <div className="flex justify-end mb-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-8">
          <GroupedBarChart 
            clientId={clientId} 
            businessId={businessId} 
            selectedMonth={selectedMonth}
          />
        </div>
        <div className="mt-32">
          <CityGeneralBubble 
            businessId={businessId} 
            clientId={clientId} 
            selectedMonth={selectedMonth}
          />
        </div>
      </div>
    </div>
  );
};

export default CitySpecificAnalysis;
