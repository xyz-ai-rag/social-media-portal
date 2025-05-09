"use client";

import { useParams } from "next/navigation";
// import BusinessPosts from "@/components/business-posts/business-posts/BusinessPosts";

export default function PostsPage() {
  const params = useParams();

  // Extract clientId and businessId from URL parameters
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;
  const topic = params.topic as string;

  return (
    <div className="space-y-6">
      {/* <BusinessPosts clientId={clientId} businessId={businessId} /> */}
      <div>
        <h1>Topic: {topic}</h1>
      </div>
    </div>
  );
}
