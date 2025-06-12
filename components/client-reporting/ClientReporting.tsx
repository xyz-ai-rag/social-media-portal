"use client";
export const dynamic = 'force-dynamic';

import React from "react";
import { DateRangeProvider } from "@/context/DateRangeContext";
import { useSearchParams } from "next/navigation";
import BrandOverview from "./brand-overview/BrandOverview";
import MonthlyReporting from "./monthly-kpis/MonthlyKPIS";
import BusinessReporting from "./business-reporting/BusinessReporting";

interface ClientReportingProps {
    clientId: string;
    businessId: string;
}

export default function ClientReporting({ clientId, businessId }: ClientReportingProps) {

    // Find current business name from clientDetails
    //   useEffect(() => {
    //     if (clientDetails?.businesses?.length) {
    //       const currentBusiness = clientDetails.businesses.find(
    //         (biz) => biz.business_id === businessId
    //       );

    //       if (currentBusiness) {
    //         // TODO: add limitation to only show 1 business
    //       }
    //     }
    //   }, [clientDetails, businessId]);

    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'business-reporting';

    return (
        <div className="container mx-auto px-4">

            {tab === 'brand-overview' && (
                <BrandOverview clientId={clientId} businessId={businessId} />
            )}

            {tab === 'monthly-kpis' && (
                <MonthlyReporting clientId={clientId} businessId={businessId} />
            )}

            {tab === 'business-reporting' && (
                <DateRangeProvider>
                    <BusinessReporting clientId={clientId} businessId={businessId} />
                </DateRangeProvider>
            )}
        </div>
    );
}
