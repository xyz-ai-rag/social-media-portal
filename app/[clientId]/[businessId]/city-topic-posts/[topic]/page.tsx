"use client";
export const dynamic = 'force-dynamic';

import { useParams, useSearchParams, useRouter } from "next/navigation";
import TopicPosts from "@/components/city-topic-analysis/city-topic-analysis/TopicPosts";
import { DateRangeProvider } from "@/context/DateRangeContext";
import { Suspense } from "react";
import { BusinessTierProvider } from "@/context/BusinessTierContext";

export default function CityTopicPostsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Extract parameters from URL
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;
  const topic = decodeURIComponent(params.topic as string);
  const topicType = searchParams.get('topic_type') || '';

  console.log('[CityTopicPostsPage] Page params:', { clientId, businessId, topic, topicType });

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-2">
        <button
          onClick={() => {
            const baseUrl = `/${clientId}/${businessId}/city-topic-analysis`;
            let tabParam = '?tab=2';
            let tabName = 'City General';
            
            if (topicType === 'Criticisms' || topicType === 'Criticism') {
              tabParam = '?tab=2';
              tabName = 'Criticisms';
            } else if (topicType === 'Compliments' || topicType === 'Compliment') {
              tabParam = '?tab=3';
              tabName = 'Compliments';
            }
            
            router.push(baseUrl + tabParam);
          }}
          className="flex items-center text-gray-500 hover:text-blue-600 text-sm font-medium"
        >
          <span className="mr-1">&#8592;</span>
          Back to Topic Analysis: {topicType === 'City_General' ? 'City General' : 
                                  topicType === 'Criticisms' || topicType === 'Criticism' ? 'Criticisms' :
                                  topicType === 'Compliments' || topicType === 'Compliment' ? 'Compliments' : topicType}
        </button>
      </div>
      
      <h1 className="text-[34px] font-bold text-[#5D5FEF] mb-4">
        {`${topic} Posts`}
      </h1>

      <BusinessTierProvider businessId={businessId}>
        <Suspense>
          <DateRangeProvider>
            <TopicPosts 
              clientId={clientId} 
              businessId={businessId} 
              topic={topic} 
              topicType={topicType} 
            />
          </DateRangeProvider>
        </Suspense>
      </BusinessTierProvider>
    </div>
  );
} 