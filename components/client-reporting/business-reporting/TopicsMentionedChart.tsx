"use client"
import { constructVercelURL } from "@/utils/generateURL";
import React, { useEffect, useState } from "react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);
export default function TopicsMentionedChart({ businessId }: { businessId: string }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    const response = await fetch(
      constructVercelURL("/api/businesses/getBusinessTopicStats"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: businessId,
          topicType: "General",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch post topics");
    }

    const raw = await response.json();
    const topics = raw.topics;
    const labels = topics.map((item: any) => item.topic);
    const values = topics.map((item: any) => item.count);

    setData({
      labels,
      datasets: [
        {
          label: "General Topics",
          data: values,
          backgroundColor: "rgba(93,95,239,0.2)",
          borderColor: "#5D5FEF",
          pointBackgroundColor: "#5D5FEF"
        }
      ]
    });
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [businessId]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center h-64 w-full">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-auto w-full">
      <h2 className="text-base font-medium text-gray-800 mb-2">Topics Mentioned</h2>
      {data ? <Radar data={data} /> : <div>No data found</div>}
    </div>
  );
}