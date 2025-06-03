import { useParams } from "next/navigation";

export default function ClientReportingPage() {
  const { clientId, businessId } = useParams();

  return <div>Client Reporting</div>;
}