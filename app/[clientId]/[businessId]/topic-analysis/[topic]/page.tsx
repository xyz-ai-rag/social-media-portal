"use client";

import { useParams, useSearchParams } from "next/navigation";
import TopicPosts from "@/components/topic-analysis/topic-posts/TopicPosts";

export default function PostsPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Extract clientId and businessId from URL parameters
  const clientId = params.clientId as string;
  const businessId = params.businessId as string;
  const topic = params.topic as string;
  const topicType = searchParams.get('topic_type') || '';
  return (
    <div className="space-y-6">
      <TopicPosts clientId={clientId} businessId={businessId} topic={topic} topicType={topicType}/>
    </div>
  );
}
