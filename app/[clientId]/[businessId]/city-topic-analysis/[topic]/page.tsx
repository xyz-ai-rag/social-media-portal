"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { format, subMonths, parseISO } from 'date-fns';
import { TopicAnalysisOverviewTierBanner } from '@/components/TierBanner';
import TabSection from '@/components/city-topic-analysis/city-topic-analysis/TabSection';
import { BusinessTierProvider } from '@/context/BusinessTierContext';
import { DateRangeProvider } from '@/context/DateRangeContext';
import SMPIProgressCircle from '@/components/client-reporting/monthly-kpis/SMPIProgressCircle';
import TopicTrendLineGraph from '@/components/city-topic-analysis/city-topic-analysis/TopicTrendLineGraph';
import TopicPosts from '@/components/city-topic-analysis/city-topic-analysis/TopicPosts';

export default function CityTopicDrillDownPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const clientId = params.clientId as string;
  const businessId = params.businessId as string;
  const topic = params.topic as string;
  const topicType = searchParams.get('topic_type');

  console.log('[DrillDown] Page params:', { clientId, businessId, topic, topicType });

  // earliestDate 可通过 API 获取，这里先用 mock
  const [earliestDate, setEarliestDate] = useState('2024-06-01');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(subMonths(now, 1), 'yyyy-MM');
  });
  const [monthlyData, setMonthlyData] = useState({});
  const [totalData, setTotalData] = useState({});
  const [loading, setLoading] = useState(true);


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
        options.push({ value: monthStr, label: monthLabel });
      }
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
    }
    return options;
  }, [earliestDate]);

  // 计算 lastMonthStr
  const lastMonthStr = (() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const lastMonth = month === 1 ? 12 : month - 1;
    const lastYear = month === 1 ? year - 1 : year;
    return `${lastYear}-${String(lastMonth).padStart(2, '0')}`;
  })();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const url = `/api/city-topics/getCityTopicSMPI?businessId=${businessId}&type=${topicType}&month=${selectedMonth}`;
        const res = await fetch(url);
        const data = await res.json();
        
        // 过滤出当前 topic 的数据
        const topicData = data.topics?.find((item: any) => item.topic === topic);
        
        if (topicData) {
          // 转换为 SMPIProgressCircle 期望的格式
          const monthlyDataFormatted = {
            [selectedMonth]: {
              total: topicData.M,
              sentiments: {
                highly_positive: topicData.HP,
                positive: topicData.P,
                negative: topicData.Neg,
                highly_negative: topicData.HN,
                neutral: 0 // API 中没有 neutral 数据
              },
              criticism: topicData.Crit
            }
          };
          
          const totalDataFormatted = {
            totalPosts: topicData.M,
            highly_positive: topicData.HP,
            positive: topicData.P,
            negative: topicData.Neg,
            highly_negative: topicData.HN,
            criticism: topicData.Crit,
            countMonths: 1
          };
          
          console.log('[DrillDown] 格式化后的数据:', { monthlyDataFormatted, totalDataFormatted });
          setMonthlyData(monthlyDataFormatted);
          setTotalData(totalDataFormatted);
        } else {
          setMonthlyData({});
          setTotalData({});
        }
      } catch (error) {
        console.error('[DrillDown] 错误:', error);
        setMonthlyData({});
        setTotalData({});
      }
      setLoading(false);
    }
    fetchData();
  }, [businessId, topic, topicType, selectedMonth]);

  return (
    <BusinessTierProvider>
      <DateRangeProvider>
        <div className="container mx-auto px-4">

        <div className="flex items-center mb-2">
          <button
            onClick={() => {
              const baseUrl = `/${clientId}/${businessId}/city-topic-analysis`;
              const tabParam = topicType === 'City_General' ? '?tab=2' : '';
              router.push(baseUrl + tabParam);
            }}
            className="flex items-center text-gray-500 hover:text-blue-600 text-sm font-medium"
          >
            <span className="mr-1">&#8592;</span>
            Back to Topic Analysis {topicType === 'City_General' ? ': City General' : ': General'}
          </button>
        </div>
        <h1 className="text-[34px] font-bold text-[#5D5FEF] mb-4">
          {`${topic} Posts`}
        </h1>
        <TopicAnalysisOverviewTierBanner />

        <div className="flex justify-end mb-4">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="w-full">
            {loading ? (
              <div className="h-64 flex items-center justify-center">Loading...</div>
            ) : Object.keys(monthlyData).length > 0 ? (
              <SMPIProgressCircle
                selectedMonth={selectedMonth}
                lastMonthStr={lastMonthStr}
                monthlyData={monthlyData}
                totalData={totalData}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <div className="text-lg font-medium">No Data Available</div>
                  <div className="text-sm">No data found for this topic in {selectedMonth}</div>
                </div>
              </div>
            )}
          </div>
          <div className="w-full">
            <TopicTrendLineGraph
              businessId={businessId}
              topic={topic}
              topicType={topicType || ''}
            />
          </div>
        </div>

        {/* Topic Posts Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Posts for Topic: {topic}
          </h2>
          <TopicPosts
            clientId={clientId}
            businessId={businessId}
            topic={topic}
            topicType={topicType || ''}
          />
        </div>
              </div>
      </DateRangeProvider>
      </BusinessTierProvider>
    );
  } 