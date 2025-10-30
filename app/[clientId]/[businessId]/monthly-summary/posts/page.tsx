"use client";
export const dynamic = "force-dynamic";

import { useParams, useSearchParams } from "next/navigation";
import MonthlyTopicPosts from "@/components/credit-cards/MonthlyTopicPosts";
import { DateRangeProvider } from "@/context/DateRangeContext";
import { Suspense } from "react";
import { BusinessTierProvider } from "@/context/BusinessTierContext";

export default function MonthlyTopicPostsPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Extract URL parameters
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;
  const topicId = searchParams.get("topic_id") || "";
  const topicType = searchParams.get("topic_type") || "strength";
  const topicName = searchParams.get("topic_name") || "";
  const month = searchParams.get("month") || "";

  return (
    <div className="space-y-6">
      <BusinessTierProvider businessId={businessId}>
        <Suspense fallback={<div>Loading...</div>}>
          <DateRangeProvider>
            <MonthlyTopicPosts
              clientId={clientId}
              businessId={businessId}
              topicId={topicId}
              topicType={topicType}
              topicName={topicName}
              month={month}
            />
          </DateRangeProvider>
        </Suspense>
      </BusinessTierProvider>
    </div>
  );
}