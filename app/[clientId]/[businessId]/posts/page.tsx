"use client";

import { useParams } from "next/navigation";
import BusinessPosts from "@/components/business-posts/business-posts/BusinessPosts";
import { DateRangeProvider } from "@/context/DateRangeContext";
import { BusinessTierProvider } from "@/context/BusinessTierContext";
export default function PostsPage() {
  const params = useParams();

  // Extract clientId and businessId from URL parameters
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;

  return (
    <div className="space-y-6">
      <BusinessTierProvider businessId={businessId}>
        <DateRangeProvider>
          <BusinessPosts clientId={clientId} businessId={businessId} />
        </DateRangeProvider>
      </BusinessTierProvider>
      
    </div>
  );
}
