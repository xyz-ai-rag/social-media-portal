"use client";

import ClientReporting from "@/components/client-reporting/ClientReporting";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { useParams } from "next/navigation";

export default function ClientReportingPage() {
  const params = useParams();

  // Extract clientId and businessId from URL parameters
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;

  return (
    <div className="">
      <ClientReporting clientId={clientId} businessId={businessId} />
    </div>
  );
}
