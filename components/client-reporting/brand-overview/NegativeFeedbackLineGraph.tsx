import React, { useEffect, useRef, useState, useMemo } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { setStartOfDay, setEndOfDay } from "@/utils/timeUtils";
import { format } from "date-fns";

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  LineChart,
  CanvasRenderer,
]);

interface TrendSeries {
  businessId: string;
  businessName: string;
  data: { month: string; count: number }[];
}

interface NegativeFeedbackLineGraphProps {
  allBusinessIds: string;
  earliestDate: string;
  latestDate: string;
  businessId: string;
  clientId: string;
}

const NegativeFeedbackLineGraph: React.FC<NegativeFeedbackLineGraphProps> = ({
  allBusinessIds,
  earliestDate,
  latestDate,
  businessId,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [seriesData, setSeriesData] = useState<TrendSeries[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const startDateProcessed = useMemo(
    () => setStartOfDay(earliestDate),
    [earliestDate]
  );
  const endDateProcessed = useMemo(
    () => setEndOfDay(latestDate),
    [latestDate]
  );
  const formattedStart = useMemo(
    () => format(new Date(earliestDate), "MMM yyyy"),
    [earliestDate]
  );
  const formattedEnd = useMemo(
    () => format(new Date(latestDate), "MMM yyyy"),
    [latestDate]
  );

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      try {
        const url = `/api/client-reporting/negative-feedback-trend?all_business_ids=${encodeURIComponent(
          allBusinessIds
        )}&start_date=${encodeURIComponent(
          startDateProcessed
        )}&end_date=${encodeURIComponent(endDateProcessed)}&business_id=${encodeURIComponent(businessId)}`;
        const res = await fetch(url);
        const data = await res.json();
        setSeriesData(data.series || []);
      } catch (err) {
        console.error("Error fetching trend data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [allBusinessIds, startDateProcessed, endDateProcessed]);

  const allMonths = useMemo(() => {
    const monthSet = new Set<string>();
    seriesData.forEach((s) => s.data.forEach((d) => monthSet.add(d.month)));
    return Array.from(monthSet).sort((a, b) => new Date(a + '-01').getTime() - new Date(b + '-01').getTime());
  }, [seriesData]);

  const cumulativeSeriesData = useMemo(() => {
    return seriesData.map((s) => {
      let runningTotal = 0;
      const monthMap = Object.fromEntries(s.data.map(d => [d.month, d.count]));
      const data = allMonths.map(month => {
        runningTotal += monthMap[month] ?? 0;
        return { month, count: runningTotal };
      });
      return { ...s, data };
    });
  }, [seriesData, allMonths]);

  useEffect(() => {
    if (isLoading || !chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const option = {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const sorted = [...params].sort((a, b) => (b.data ?? 0) - (a.data ?? 0));
          let html = `<div><b>${sorted[0].axisValue}</b></div>`;
          sorted.forEach((item: any) => {
            html += `<div>
              <span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background:${item.color}"></span>
              ${item.seriesName}: <b>${item.data}</b>
            </div>`;
          });
          return html;
        },
        backgroundColor: "#37375C",
        borderColor: "#ccc",
        borderWidth: 1,
        textStyle: { color: "#fff" },
      },
      legend: {
        bottom: 0,
        left: 0,
        itemWidth: 10,
        itemHeight: 10,
        icon: "rect",
        data: cumulativeSeriesData.map((s) => s.businessName),
      },
      grid: { left: "3%", right: "4%", top: "8%", bottom: "20%", containLabel: true },
      xAxis: {
        type: "category",
        data: allMonths,
        boundaryGap: false,
        axisLabel: { fontSize: 12 },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed" } },
      },
      series: cumulativeSeriesData.map((s) => ({
        name: s.businessName,
        type: "line",
        data: allMonths.map(
          (m) => s.data.find((d) => d.month === m)?.count ?? 0
        ),
        smooth: false,
        symbol: "none",
        symbolSize: 8,
        lineStyle: { width: 3 },
      })),
    };

    chart.setOption(option);

    // Resize
    const resizeObserver = new window.ResizeObserver(() => {
      chart.resize();
    });
    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [isLoading, cumulativeSeriesData, allMonths]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full min-h-[400px] flex flex-col">
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="h-80 flex items-center justify-center w-full">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
          </div>
        ) : cumulativeSeriesData.length === 0 ? (
          <div className="h-80 flex items-center justify-center w-full">
            <p className="text-gray-500">No negative feedback trend data available</p>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <h2 className="text-base font-medium text-gray-800">
              Negative Feedback/Criticism Trend
              </h2>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Posts from {formattedStart} to {formattedEnd}
            </div>
            <div className="h-80 flex items-center justify-center w-full">
              <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NegativeFeedbackLineGraph;