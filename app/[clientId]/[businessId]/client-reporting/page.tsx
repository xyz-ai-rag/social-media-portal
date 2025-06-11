"use client";

import ClientReporting from "@/components/client-reporting/ClientReporting";
import { useParams } from "next/navigation";
import { Suspense } from "react";

export default function ClientReportingPage() {
  const params = useParams();

  // Extract clientId and businessId from URL parameters
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;

  return (
    <div className="">
      <Suspense>
        <ClientReporting clientId={clientId} businessId={businessId} />
      </Suspense>
    </div>
  );
}
