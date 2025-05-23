"use client";
import CompetitorPosts from "@/components/business-posts/competitors-posts/CompetitorPosts";
import { DateRangeProvider } from "@/context/DateRangeContext";
import { useParams } from "next/navigation";
export default function CompetitorsPostsPage() {
  const params = useParams();

  const clientId = params.clientId as string;
  const businessId = params.businessId as string;
  return (
    <div className="space-y-6">
      <DateRangeProvider>
        <CompetitorPosts clientId={clientId} businessId={businessId} />
      </DateRangeProvider>
    </div>
  );
}
