"use client";

import { useEffect, useState, FC } from "react";
import CirclePacking from "../../CirclePacking";
import BarChart from "../../BarChart";

interface CityGeneralBubbleProps {
  businessId: string;
  clientId: string;
  selectedMonth: string;
}

const CityGeneralBubble: FC<CityGeneralBubbleProps> = ({
  businessId,
  clientId,
  selectedMonth,
}) => {
  const [bubbleData, setBubbleData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const url = `/api/city-topics/getCityTopicSMPI?businessId=${businessId}&type=City_General&month=${selectedMonth}`;
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
        setBubbleData([]);
      }
    }

    fetchData();
  }, [businessId, selectedMonth]);

  if (!bubbleData.length) return null;

  return (
    <>
      <div className="w-full h-[600px] flex justify-center items-center">
        <CirclePacking
          topics={bubbleData}
          businessId={businessId}
          clientId={clientId}
          minCount={1}
          maxTopics={30}
          topicType="City_General"
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
          topicType="City_General"
        />
      </div>
    </>
  );
};

export default CityGeneralBubble;
