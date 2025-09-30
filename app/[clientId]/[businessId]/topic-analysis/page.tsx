"use client";
import TopicAnalysis from "@/components/topic-analysis/topic-analysis/TopicAnalysis";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { BusinessTierProvider } from "@/context/BusinessTierContext";
import { DateRangeProvider } from "@/context/DateRangeContext";

export default function TopicAnalysisPage() {
  const params = useParams();

  const clientId = params.clientId as string;
  const businessId = params.businessId as string;
  
  return (
    <BusinessTierProvider businessId={businessId}>
      <DateRangeProvider>
        <div className="space-y-6">
          <Suspense>
            <TopicAnalysis clientId={clientId} businessId={businessId} />
          </Suspense>
        </div>
      </DateRangeProvider>
    </BusinessTierProvider>
  );
}