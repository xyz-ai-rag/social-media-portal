// app/[clientId]/[businessId]/credit-cards/page.tsx
"use client";

import { use } from "react";
import CreditCardDashboard from "@/components/credit-cards/CreditCardDashboard";

interface CreditCardPageProps {
  params: Promise<{
    clientId: string;
    businessId: string;
  }>;
}

export default function CreditCardPage({ params }: CreditCardPageProps) {
  const resolvedParams = use(params);
  const { clientId, businessId } = resolvedParams;

  return (
    <CreditCardDashboard 
      clientId={clientId} 
      businessId={businessId} 
    />
  );
}