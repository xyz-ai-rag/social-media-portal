"use client";

import { useParams } from "next/navigation";
import CityTopicAnalysis from "@/components/city-topic-analysis/city-topic-analysis/CityTopicAnalysis";
import { DateRangeProvider } from "@/context/DateRangeContext";
import { BusinessTierProvider } from "@/context/BusinessTierContext";

export default function CityTopicAnalysisPage() {
  const params = useParams();

  // Extract clientId and businessId from URL parameters
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;

  return (
    <div className="space-y-6">
      <BusinessTierProvider businessId={businessId}>
        <DateRangeProvider>
          <CityTopicAnalysis clientId={clientId} businessId={businessId} />
        </DateRangeProvider>
      </BusinessTierProvider>
    </div>
  );
} 