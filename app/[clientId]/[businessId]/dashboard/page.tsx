"use client";

import Dashboard from "@/components/dashboard/Dashboard";
import { useParams } from "next/navigation";
import { BusinessTierProvider } from "@/context/BusinessTierContext";
import { DashboardTierBanner } from "@/components/TierBanner";

export default function DashboardPage() {
  const params = useParams();

  // Extract clientId and businessId from URL parameters
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;

  return (
    <BusinessTierProvider businessId={businessId}>
      <div className="">
        {/* Tier-aware banner - only shows for free tier */}
        {/* <DashboardTierBanner /> */}
        
        {/* Main dashboard content */}
        <Dashboard clientId={clientId} businessId={businessId} />
      </div>
    </BusinessTierProvider>
  );
}