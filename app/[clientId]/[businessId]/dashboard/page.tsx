'use client';

import Dashboard from "@/components/dashboard/Dashboard";
import { useParams } from "next/navigation";

export default function DashboardPage() {
  const params = useParams();
  
  // Extract clientId and businessId from URL parameters
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;

  return (
    <div className="p-4 md:p-6">
      <Dashboard clientId={clientId} businessId={businessId} />
    </div>
  );
}