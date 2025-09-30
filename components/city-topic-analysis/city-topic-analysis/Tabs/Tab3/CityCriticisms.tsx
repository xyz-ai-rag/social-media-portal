"use client";

import { useEffect, useState, FC, useMemo } from "react";
import { format, subMonths } from "date-fns";
import CirclePacking from "../../CirclePacking";
import BarChart from "../../BarChart";
import CriticismLineGraph from "./CriticismLineGraph";
import MonthSelector from "../../MonthSelector";

interface CityCriticismsProps {
  businessId: string;
  clientId: string;
}

const CityCriticisms: FC<CityCriticismsProps> = ({
  businessId,
  clientId,
}) => {
  // Get the last complete month as default (previous month)
  const lastCompleteMonth = useMemo(() => {
    // 临时使用 2024-12 来测试
    return '2025-06';
  }, []);

  const [bubbleData, setBubbleData] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(lastCompleteMonth);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!businessId || !selectedMonth) return;
      
      setIsLoading(true);
      try {
        const url = `/api/city-topics/getCityTopicSMPI?businessId=${businessId}&type=City_Criticisms&month=${selectedMonth}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data?.topics?.length) {
          setBubbleData([]);
          return;
        }

        const totalCount = data.topics.reduce((sum: number, t: any) => sum + t.M, 0);

        const formatted = data.topics.map((item: any) => ({
          topic: item.topic,
          count: item.M,
          percentage: totalCount ? item.M / totalCount : 0,
        }));

        setBubbleData(formatted);
      } catch (error) {
        console.error('[CityCriticisms] Error fetching data:', error);
        setBubbleData([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [businessId, selectedMonth]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex justify-end mb-4">
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          earliestDate="2024-06-01"
          showEverything={true}
        />
      </div>
      
      {isLoading ? (
        <div className="w-full h-64 flex items-center justify-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
        </div>
      ) : (
        <>          
        <div className="w-full">
          <CriticismLineGraph 
            businessId={businessId}
            selectedMonth={selectedMonth}
          />
        </div>
          <div className="w-full h-[600px] flex justify-center items-center">
            <CirclePacking
              topics={bubbleData}
              businessId={businessId}
              clientId={clientId}
              minCount={1}
              maxTopics={30}
              topicType="Criticisms"
            />
          </div>

          <div className="h-16" />
          <div className="w-full">
            <BarChart
              topics={bubbleData}
              businessId={businessId}
              clientId={clientId}
              minCount={1}
              maxTopics={30}
              topicType="City_Criticisms"
            />
          </div>

        </>
      )}
    </div>
  );
};

export default CityCriticisms;
