//app/[clientId]/[businessId]/business-reporting/page.tsx
"use client";

import BusinessReporting from "@/components/client-reporting/business-reporting/BusinessReporting";
import { DateRangeProvider } from "@/context/DateRangeContext";
import { useParams } from "next/navigation";
import { Suspense } from "react";

export default function BusinessReportingPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;

  return (
    <div className="container mx-auto px-4">
      <Suspense>
        <DateRangeProvider>
          <BusinessReporting clientId={clientId} businessId={businessId} />
        </DateRangeProvider>
      </Suspense>
    </div>
  );
}
