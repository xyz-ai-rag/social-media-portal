import { FC, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { constructVercelURL } from "@/utils/generateURL";
import CirclePacking from './CirclePacking';
import TabSection from './TabSection';
import { convertTopicsToTree } from "@/utils/topicTree";

interface AnalysisProps {
  clientId: string;
  businessId: string;
}

const Analysis: FC<AnalysisProps> = ({
  clientId,
  businessId,
}) => {
  // Get auth context to access similar businesses
  const { clientDetails } = useAuth();

  // Add state for active tab
  const [activeTab, setActiveTab] = useState(0);

  // business name state
  const [businessName, setBusinessName] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);

  // topics state
  const [topics, setTopics] = useState<any[]>([]);

  // Update business name when business ID changes
  useEffect(() => {
    if (clientDetails && businessId) {
      const business = clientDetails.businesses.find(
        (b) => b.business_id === businessId
      );
      if (business) {
        setBusinessName(business.business_name);
      }
    }
  }, [clientDetails, businessId]);

  // Fetch topic data
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!clientDetails || !businessId) return;

        setIsLoading(true);

        // Fetch competitor details using the batch API
        const response = await fetch(
          constructVercelURL("/api/businesses/getBusinessTopicStats"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessId: businessId,
              topicType: "General",
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch post topics");
        }

        const data = await response.json();
        setTopics(data.topics);

      } catch (error) {
        console.error("Error fetching competitors:", error);
        // Don't set an error message for users to see
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientDetails, businessId]);

  // Helper function to fetch posts for any page
  // const fetchPostsForPage = useCallback(
  //   async (pageNumber: number) => {
  //     if (!businessId) {
  //       return { posts: [], pagination: null, appliedFilters: null };
  //     }

  //     try {
  //       // Build query parameters
  //       const queryParams = new URLSearchParams();
  //       queryParams.append("businessId", businessId); // Use competitorId as businessId for API
  //       const endDate =
  //         new Date(dateRange.endDate) > new Date(yesterday)
  //           ? yesterday
  //           : dateRange.endDate;
  //       if (dateRange.startDate)
  //         queryParams.append("startDate", dateRange.startDate);
  //       queryParams.append("endDate", endDate);
  //       if (filters.platform) queryParams.append("platform", filters.platform);
  //       if (filters.sentiment)
  //         queryParams.append("sentiment", filters.sentiment);
  //       if (filters.relevance)
  //         queryParams.append("relevance", filters.relevance);
  //       if (filters.hasCriticism)
  //         queryParams.append("hasCriticism", filters.hasCriticism);
  //       if (filters.search) queryParams.append("search", filters.search);
  //       if (filters.sortOrder)
  //         queryParams.append("sortOrder", filters.sortOrder);
  //       queryParams.append("page", pageNumber.toString());

  //       // Make the API call - use the same endpoint as business posts
  //       const response = await fetch(
  //         constructVercelURL(
  //           `/api/businesses/getBusinessPosts?${queryParams.toString()}`
  //         ),
  //         {
  //           method: "GET",
  //           headers: {
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );

  //       if (!response.ok) {
  //         const errorData = await response.json();
  //         throw new Error(
  //           errorData.error || "Failed to fetch competitor posts"
  //         );
  //       }

  //       const data = await response.json();
  //       return {
  //         posts: data.posts || [],
  //         pagination: data.pagination,
  //         appliedFilters: data.appliedFilters,
  //       };
  //     } catch (error: any) {
  //       console.error(`Error fetching posts for page ${pageNumber}:`, error);
  //       return { posts: [], pagination: null, appliedFilters: null };
  //     }
  //   },
  //   [filters, dateRange, yesterday]
  // );

  // Main fetch function for competitor posts
  // const fetchCompetitorPosts = useCallback(async () => {
  //   if (!businessId) {
  //     setPosts([]);
  //     // Don't set an error message for no competitor selected
  //     setError(null);
  //     setIsLoading(false);
  //     return;
  //   }

  //   try {
  //     setIsLoading(true);
  //     setError(null);

  //     const { posts, pagination, appliedFilters } = await fetchPostsForPage(
  //       filters.page
  //     );

  //     // If no posts, the filters components should still have filters value and filters tag should be also display
  //     if (posts.length >= 0) {
  //       setPosts(posts);
  //       if (pagination) setPagination(pagination);
  //       if (appliedFilters) setAppliedFilters(appliedFilters);
  //     } else {
  //       setPosts([]);
  //       // Use a more neutral message
  //       setError("No posts found for this selection");
  //     }
  //   } catch (error: any) {
  //     console.error("Error fetching competitor posts:", error);
  //     // Use a more neutral message
  //     setError("Unable to load data for this selection");
  //     setPosts([]);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [filters.page, fetchPostsForPage]);

  // Function to fetch adjacent pages
  // const fetchAdjacentPages = useCallback(async () => {
  //   if (pagination.totalPages <= 1) return;


  //   const prevPage =
  //     pagination.currentPage > 1
  //       ? pagination.currentPage - 1
  //       : pagination.totalPages;

  //   const nextPage =
  //     pagination.currentPage < pagination.totalPages
  //       ? pagination.currentPage + 1
  //       : 1;

  //   const [prevResult, nextResult] = await Promise.all([
  //     fetchPostsForPage(prevPage),
  //     fetchPostsForPage(nextPage),
  //   ]);

  // }, [pagination, fetchPostsForPage]);

  // Fetch posts when competitorId or filters change
  // useEffect(() => {
  //   fetchCompetitorPosts();
  // }, [fetchCompetitorPosts]);

  // Fetch adjacent pages when modal is opened or current page changes
  // useEffect(() => {
  //   if (isModalOpen && pagination.totalPages > 1) {
  //     fetchAdjacentPages();
  //   }
  // }, [isModalOpen, pagination.currentPage, fetchAdjacentPages]);

  // Handle filter changes from the SharedPostList component
  // const handleFilterChange = (newFilters: any) => {
  //   // Ensure we never send a date after yesterday
  //   if (
  //     newFilters.endDate &&
  //     new Date(newFilters.endDate) > new Date(yesterday)
  //   ) {
  //     newFilters.endDate = yesterday;
  //   }
  //   // Extract startDate / endDate and save to local dateRange
  //   const { startDate, endDate, ...otherFilters } = newFilters;

  //   if (endDate || startDate) {
  //     setDateRange((prevdate: object) => ({
  //       ...prevdate,
  //       ...(startDate && { startDate: startDate }),
  //       ...(endDate && { endDate: endDate }),
  //     }));
  //   }

  //   // Pass non-date fields to context management
  //   setFilters((prev: any) => ({
  //     ...prev,
  //     ...otherFilters,
  //     // If filters other than page change, reset to page 1
  //     page: newFilters.hasOwnProperty("page") ? newFilters.page : 1,
  //   }));
  // };

  // Handle page change specifically
  // const handlePageChange = (page: number) => {
  //   handleFilterChange({ page });
  // };

  // Handle sort order change
  // const handleSortOrderChange = (order: string) => {
  //   handleFilterChange({ sortOrder: order });
  // };


  return (
    <>
      <h1 className="text-[34px] font-bold text-[#5D5FEF] mb-4">
        {`Analysis for ${businessName || "Business"}`}
      </h1>

      {/* Tab Section */}
      <TabSection
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        businessId={businessId}
        isLoading={isLoading}
      />  
      {/* Bubble Chart */}
      <CirclePacking data={convertTopicsToTree(topics)} />
    </>
  );
};

export default Analysis;
