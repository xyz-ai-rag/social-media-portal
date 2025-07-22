"use client";

import { FC, useState, useMemo } from "react";
import { format, subMonths } from "date-fns";
import GroupedBarChart from '../../GroupedBarChart/GroupedBarChart';
import CityGeneralBubble from "./CityGeneralBubble";
import MonthSelector from "../../MonthSelector";

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

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
      <div className="w-full max-w-4xl">
        <div className="flex justify-end mb-4">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            earliestDate="2024-06-01"
            showEverything={false}
          />
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
