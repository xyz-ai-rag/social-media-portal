// app/[clientId]/[businessId]/monthly-kpis/page.tsx
"use client";

import MonthlyReporting from "@/components/client-reporting/monthly-kpis/MonthlyKPIS";
import { useParams } from "next/navigation";
import { Suspense } from "react";

export default function MonthlyKPIsPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;

  return (
    <div className="container mx-auto px-4">
      <Suspense>
        <MonthlyReporting clientId={clientId} businessId={businessId} />
      </Suspense>
    </div>
  );
}