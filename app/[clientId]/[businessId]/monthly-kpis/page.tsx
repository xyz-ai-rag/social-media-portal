// app/[clientId]/[businessId]/monthly-kpis/page.tsx
"use client";

import MonthlyReporting from "@/components/client-reporting/monthly-kpis/MonthlyKPIS";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BusinessTierProvider } from "@/context/BusinessTierContext";
export default function MonthlyKPIsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;
  
  // Use URL search params to determine level (e.g., ?level=client or ?level=business)
  const levelFromParams = searchParams.get('level') as 'client' | 'business' | null;
  
  // Default to business level if no level specified
  const level: 'client' | 'business' = levelFromParams || 'business';

  return (
    <div className="container mx-auto px-4">
      <BusinessTierProvider businessId={businessId}>
        <Suspense>
          <MonthlyReporting 
            clientId={clientId} 
            businessId={businessId} 
            level={level}
          />
        </Suspense>
      </BusinessTierProvider>
      
    </div>
  );
}