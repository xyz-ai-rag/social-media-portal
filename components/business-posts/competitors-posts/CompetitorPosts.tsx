"use client";

import { FC, useState, useEffect, useCallback, useMemo } from "react";
import { Select } from "flowbite-react";
import SharedPostList from "../SharedPostList";
import CompetitorPostCard from "./CompetitorsPostCard";
import { useAuth } from "@/context/AuthContext";
import { constructVercelURL } from "@/utils/generateURL";
import { PostData } from "../SharedPostList";
import { useFilters } from "@/context/FilterSelectContext";

interface CompetitorPostsProps {
  clientId: string;
  businessId: string;
}

interface Competitor {
  id: string;
  name: string;
}

interface PaginationInfo {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface AppliedFilters {
  startDate: string;
  endDate: string;
  platform: string;
  sentiment: string;
  relevance: string;
  hasCriticism: string;
  search: string;
  sortOrder: string;
}

const CompetitorPosts: FC<CompetitorPostsProps> = ({
  clientId,
  businessId,
}) => {
  // Get auth context to access similar businesses
  const { clientDetails } = useAuth();

  // Competitor selection state
  const [competitorId, setCompetitorId] = useState<string>("");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState<boolean>(false);

  // Posts data state
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
  });

  // State for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRowData, setModalRowData] = useState<any>({});

  // NEW: State to store adjacent pages' posts
  const [prevPagePosts, setPrevPagePosts] = useState<PostData[]>([]);
  const [nextPagePosts, setNextPagePosts] = useState<PostData[]>([]);
  const [adjacentPagesLoading, setAdjacentPagesLoading] = useState(false);

  // Calculate yesterday's date for date limits
  const yesterday = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  }, []);

  // Calculate default 7 days ago date
  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  }, []);

  // Initialize with empty filters - the API will apply defaults (last 7 days)
  // const [filters, setFilters] = useState({
  //   startDate: sevenDaysAgo,
  //   endDate: yesterday,
  //   platform: '',
  //   sentiment: '',
  //   relevance: '',
  //   hasCriticism: '',
  //   search: '',
  //   sortOrder: 'desc',
  //   page: 1
  // });

  // Use context useFilters(), when filters components changed, also can use same setFilters function build before.
  const { filters, setFilters } = useFilters();
  // If startDate and EndDate both empty, give the default date. So whatever page user opened at fist time, the page will have default date. Avoid page cannot update state because of setting date in api part.
  useEffect(() => {
    if (filters.startDate === "" && filters.endDate === "") {
      setFilters({ ...filters, startDate: sevenDaysAgo, endDate: yesterday });
    }
  }, []);

  // Track filters returned from API to keep UI in sync
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(
    null
  );

  // Fetch competitor data from similar_businesses
  useEffect(() => {
    const fetchCompetitors = async () => {
      try {
        if (!clientDetails || !businessId) return;

        // Find the current business
        const currentBusiness = clientDetails.businesses.find(
          (b) => b.business_id === businessId
        );

        if (
          !currentBusiness ||
          !currentBusiness.similar_businesses ||
          currentBusiness.similar_businesses.length === 0
        ) {
          console.log("No similar businesses found");
          return;
        }

        setLoadingCompetitors(true);

        // Fetch competitor details using the batch API
        const response = await fetch(
          constructVercelURL("/api/businesses/getBusinessName/batch"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessIds: currentBusiness.similar_businesses,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch competitors");
        }

        const data = await response.json();

        // Map the response to the Competitor interface
        const fetchedCompetitors = data.businesses.map((business: any) => ({
          id: business.business_id,
          name: business.business_name,
        }));

        setCompetitors(fetchedCompetitors);

        // Set the first competitor as default if available and no competitor is selected yet
        if (fetchedCompetitors.length > 0 && !competitorId) {
          setCompetitorId(fetchedCompetitors[0].id);
        }
      } catch (error) {
        console.error("Error fetching competitors:", error);
        setError("Failed to load competitors data");
      } finally {
        setLoadingCompetitors(false);
      }
    };

    fetchCompetitors();
  }, [clientDetails, businessId]);

  // Get the competitor name directly from the state without showing loading
  const competitorName = useMemo(() => {
    if (!competitorId) return "Competitor Analysis";
    const competitor = competitors.find((c) => c.id === competitorId);
    return competitor ? competitor.name : "Competitor Analysis";
  }, [competitorId, competitors]);

  // Helper function to fetch posts for any page
  const fetchPostsForPage = useCallback(
    async (pageNumber: number) => {
      if (!competitorId) {
        return { posts: [], pagination: null, appliedFilters: null };
      }

      try {
        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append("businessId", competitorId); // Use competitorId as businessId for API
        const endDate =
          new Date(filters.endDate) > new Date(yesterday)
            ? yesterday
            : filters.endDate;
        if (filters.startDate)
          queryParams.append("startDate", filters.startDate);
        queryParams.append("endDate", endDate);
        if (filters.platform) queryParams.append("platform", filters.platform);
        if (filters.sentiment)
          queryParams.append("sentiment", filters.sentiment);
        if (filters.relevance)
          queryParams.append("relevance", filters.relevance);
        if (filters.hasCriticism)
          queryParams.append("hasCriticism", filters.hasCriticism);
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.sortOrder)
          queryParams.append("sortOrder", filters.sortOrder);
        queryParams.append("page", pageNumber.toString());

        // Make the API call - use the same endpoint as business posts
        const response = await fetch(
          constructVercelURL(
            `/api/businesses/getBusinessPosts?${queryParams.toString()}`
          ),
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to fetch competitor posts"
          );
        }

        const data = await response.json();
        // console.log(data);
        return {
          posts: data.posts || [],
          pagination: data.pagination,
          appliedFilters: data.appliedFilters,
        };
      } catch (error: any) {
        console.error(`Error fetching posts for page ${pageNumber}:`, error);
        return { posts: [], pagination: null, appliedFilters: null };
      }
    },
    [competitorId, filters, yesterday]
  );

  // Main fetch function for competitor posts
  const fetchCompetitorPosts = useCallback(async () => {
    if (!competitorId) {
      setPosts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { posts, pagination, appliedFilters } = await fetchPostsForPage(
        filters.page
      );

      // If no posts, the filters components should still have filters value and filters tag should be also display
      if (posts.length >= 0) {
        setPosts(posts);
        if (pagination) setPagination(pagination);
        if (appliedFilters) setAppliedFilters(appliedFilters);
      } else {
        setPosts([]);
        setError("No posts found for this competitor");
      }
    } catch (error: any) {
      console.error("Error fetching competitor posts:", error);
      setError(
        error.message || "An error occurred while fetching competitor posts"
      );
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [competitorId, filters.page, fetchPostsForPage]);

  // NEW: Function to fetch adjacent pages
  const fetchAdjacentPages = useCallback(async () => {
    if (pagination.totalPages <= 1) return;

    setAdjacentPagesLoading(true);

    const prevPage =
      pagination.currentPage > 1
        ? pagination.currentPage - 1
        : pagination.totalPages;

    const nextPage =
      pagination.currentPage < pagination.totalPages
        ? pagination.currentPage + 1
        : 1;

    const [prevResult, nextResult] = await Promise.all([
      fetchPostsForPage(prevPage),
      fetchPostsForPage(nextPage),
    ]);

    setPrevPagePosts(prevResult.posts);
    setNextPagePosts(nextResult.posts);
    setAdjacentPagesLoading(false);
  }, [pagination, fetchPostsForPage]);

  // Fetch posts when competitorId or filters change
  useEffect(() => {
    fetchCompetitorPosts();
  }, [fetchCompetitorPosts]);

  // NEW: Fetch adjacent pages when modal is opened or current page changes
  useEffect(() => {
    if (isModalOpen && pagination.totalPages > 1) {
      fetchAdjacentPages();
    }
  }, [isModalOpen, pagination.currentPage, fetchAdjacentPages]);

  // NEW: Handle opening the modal
  const openModal = (row: any) => {
    // Add contextual IDs to row data for the modal
    setModalRowData({
      ...row,
      clientId,
      businessId,
      competitorId,
    });
    setIsModalOpen(true);
  };

  // NEW: Handle closing the modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // NEW: Add event listener to update the modal content without closing it
  useEffect(() => {
    const handleUpdateModal = (event: CustomEvent<{ data: any }>) => {
      if (event.detail && event.detail.data) {
        setModalRowData(event.detail.data);
      }
    };

    document.addEventListener(
      "updatePostModal",
      handleUpdateModal as EventListener
    );

    return () => {
      document.removeEventListener(
        "updatePostModal",
        handleUpdateModal as EventListener
      );
    };
  }, []);

  // NEW: Function to handle cross-page navigation
  const handleCrossPageNavigation = useCallback(
    (direction: "prev" | "next") => {
      // Calculate the new page number
      const newPage =
        direction === "prev"
          ? pagination.currentPage > 1
            ? pagination.currentPage - 1
            : pagination.totalPages
          : pagination.currentPage < pagination.totalPages
          ? pagination.currentPage + 1
          : 1;

      // Get posts from the appropriate page
      const newPagePosts = direction === "prev" ? prevPagePosts : nextPagePosts;

      // Get the post from the beginning or end of the adjacent page
      const newRowData =
        direction === "prev"
          ? newPagePosts[newPagePosts.length - 1]
          : newPagePosts[0];

      if (newRowData) {
        // Update modal data
        const updatedData = {
          ...newRowData,
          clientId,
          businessId,
          competitorId,
        };

        // Dispatch event to update modal
        const event = new CustomEvent("updatePostModal", {
          detail: { data: updatedData },
        });
        document.dispatchEvent(event);

        // Change the page (this will also fetch new set of posts)
        handleFilterChange({ page: newPage });
      }
    },
    [
      pagination,
      prevPagePosts,
      nextPagePosts,
      clientId,
      businessId,
      competitorId,
    ]
  );

  // Handle competitor change
  const handleCompetitorChange = (selectedId: string) => {
    setCompetitorId(selectedId);
    // Reset to page 1 when changing competitor
    setFilters((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // Handle filter changes from the SharedPostList component
  const handleFilterChange = (newFilters: any) => {
    // Ensure we never send a date after yesterday
    if (
      newFilters.endDate &&
      new Date(newFilters.endDate) > new Date(yesterday)
    ) {
      newFilters.endDate = yesterday;
    }
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      // If filters other than page change, reset to page 1
      page: newFilters.hasOwnProperty("page") ? newFilters.page : 1,
    }));
  };

  // Handle page change specifically
  const handlePageChange = (page: number) => {
    handleFilterChange({ page });
  };

  // Competitor dropdown component
  const CompetitorFilter = (
    <Select
      id="competitor"
      required
      value={competitorId}
      onChange={(e) => handleCompetitorChange(e.target.value)}
      className="min-w-40"
      disabled={loadingCompetitors || competitors.length === 0}
    >
      {loadingCompetitors ? (
        <option value="">Loading...</option>
      ) : competitors.length === 0 ? (
        <option value="">No competitors available</option>
      ) : (
        <>
          <option value="">Select Competitor</option>
          {competitors.map((comp) => (
            <option key={comp.id} value={comp.id}>
              {comp.name}
            </option>
          ))}
        </>
      )}
    </Select>
  );

  return (
    <>
      <SharedPostList
        title={competitorName}
        clientId={clientId}
        businessId={businessId}
        competitorId={competitorId}
        additionalFilters={CompetitorFilter}
        postCardComponent={CompetitorPostCard}
        onFilterChange={handleFilterChange}
        initialData={posts}
        isLoading={isLoading}
        error={error}
        appliedFilters={appliedFilters}
        pagination={{
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          onPageChange: handlePageChange,
        }}
        onRefresh={fetchCompetitorPosts}
        openModal={openModal} // NEW: Pass the openModal function
      />

      {/* NEW: Render CompetitorPostCard independently */}
      <CompetitorPostCard
        isOpen={isModalOpen}
        onClose={closeModal}
        rowData={modalRowData}
        listData={posts} // Pass the list data for navigation
        onCrossPageNext={() => handleCrossPageNavigation("next")}
        onCrossPagePrev={() => handleCrossPageNavigation("prev")}
        isLoadingAdjacentPages={adjacentPagesLoading}
        pagination={pagination}
      />
    </>
  );
};

export default CompetitorPosts;
