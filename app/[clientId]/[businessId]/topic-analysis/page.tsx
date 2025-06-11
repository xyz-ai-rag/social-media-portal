"use client";
import TopicAnalysis from "@/components/topic-analysis/topic-analysis/TopicAnalysis";
import { useParams } from "next/navigation";
import { Suspense } from "react";
export default function TopicAnalysisPage() {
  const params = useParams();

  const clientId = params.clientId as string;
  const businessId = params.businessId as string;
  return (
    <div className="space-y-6">
      <Suspense>
        <TopicAnalysis clientId={clientId} businessId={businessId} />
      </Suspense>
    </div>
  );
}
