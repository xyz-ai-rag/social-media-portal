"use client";

import BrandOverview from "@/components/client-reporting/brand-overview/BrandOverview";
import { useParams } from "next/navigation";
import { Suspense } from "react";

export default function ClientBusinessOverviewPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  // No businessId needed - this is CLIENT-LEVEL reporting

  return (
    <div className="container mx-auto px-4">
      <Suspense>
        <BrandOverview clientId={clientId} />
      </Suspense>
    </div>
  );
}