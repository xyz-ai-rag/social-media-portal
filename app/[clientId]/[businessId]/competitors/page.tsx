import CompetitorsPosts from "@/components/competitors/CompetitorsPostList";
export default function PostsPage() {
  return (
    <div className="space-y-6">
      {/* <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Business Posts</h1>
      </div> */}

      <CompetitorsPosts></CompetitorsPosts>
    </div>
  );
}
