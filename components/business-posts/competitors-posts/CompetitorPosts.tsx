"use client";

import { FC, useState, useEffect, useCallback, useMemo } from "react";
import { Select, Button } from "flowbite-react";
import SharedFilter from "../SharedFilter";
import SharedPostTable from "../SharedPostTable";
import CompetitorPostCard from "./CompetitorsPostCard";
import { useAuth } from "@/context/AuthContext";
import { constructVercelURL } from "@/utils/generateURL";
import { PostData } from "../SharedFilter";
import CompetitorStatsCard from "./CompetitorStatsCard";
import PostPreviewCard from "../PostPreviewCard";
import { FaSync } from "react-icons/fa";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { useDateRange } from "@/context/DateRangeContext";

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
  postCategory: string;
}

const CompetitorPosts: FC<CompetitorPostsProps> = ({
  clientId,
  businessId,
}) => {
  // Get auth context to access similar businesses
  const { clientDetails } = useAuth();

  // Add state for active tab
  const [activeTab, setActiveTab] = useState(0);

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
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  // State to store adjacent pages' posts
  const [prevPagePosts, setPrevPagePosts] = useState<PostData[]>([]);
  const [nextPagePosts, setNextPagePosts] = useState<PostData[]>([]);
  const [adjacentPagesLoading, setAdjacentPagesLoading] = useState(false);

  // Calculate yesterday's date for date limits
  const yesterday = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  }, []);

  // Calculate default 30 days ago date
  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  }, []);

  const [filters, setFilters] = useState(() => {
    if (typeof window !== "undefined") {
      const savedFilters = localStorage.getItem("competitors_page_filters");
      return savedFilters
        ? JSON.parse(savedFilters)
        : {
            platform: "",
            sentiment: "",
            relevance: "",
            hasCriticism: "",
            search: "",
            sortOrder: "desc",
            postCategory: "",
            page: 1,
          };
    }
    return {
      platform: "",
      sentiment: "",
      relevance: "",
      hasCriticism: "",
      search: "",
      postCategory: "",
      sortOrder: "desc",
      page: 1,
    };
  });

  // Add this effect to save filters to session storage when they change
  useEffect(() => {
    localStorage.setItem("competitors_page_filters", JSON.stringify(filters));
  }, [filters]);

  // Get date range from context.
  const { dateRange } = useDateRange();

  // setting default date
  const [dateRangeOfPosts, setDateRangeOfPosts] = useState({
    startDate: "",
    endDate: "",
  });

  // Process dates using helper functions from timeUtils.
  const startDateProcessed = useMemo(
    () => dateRange.startDate.split("T")[0],
    [dateRange.startDate]
  );
  const endDateProcessed = useMemo(
    () => dateRange.endDate.split("T")[0],
    [dateRange.endDate]
  );
  useEffect(() => {
    setDateRangeOfPosts({
      startDate: startDateProcessed,
      endDate: endDateProcessed,
    });
  }, [startDateProcessed, endDateProcessed]);

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
          // console.log("No similar businesses found");
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
        // Don't set an error message for users to see
      } finally {
        setLoadingCompetitors(false);
      }
    };

    fetchCompetitors();
  }, [clientDetails, businessId, competitorId]);

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
          new Date(dateRangeOfPosts.endDate) > new Date(yesterday)
            ? yesterday
            : dateRangeOfPosts.endDate;
        if (dateRangeOfPosts.startDate)
          queryParams.append("startDate", dateRangeOfPosts.startDate);
        queryParams.append("endDate", endDate);
        if (filters.platform) queryParams.append("platform", filters.platform);
        if (filters.sentiment)
          queryParams.append("sentiment", filters.sentiment);
        if (filters.relevance)
          queryParams.append("relevance", filters.relevance);
        if (filters.hasCriticism)
          queryParams.append("hasCriticism", filters.hasCriticism);
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.postCategory)
          queryParams.append("postCategory", filters.postCategory);
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
    [competitorId, filters, dateRangeOfPosts, yesterday]
  );

  // Main fetch function for competitor posts
  const fetchCompetitorPosts = useCallback(async () => {
    if (!competitorId) {
      setPosts([]);
      // Don't set an error message for no competitor selected
      setError(null);
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
        // Use a more neutral message
        setError("No posts found for this selection");
      }
    } catch (error: any) {
      console.error("Error fetching competitor posts:", error);
      // Use a more neutral message
      setError("Unable to load data for this selection");
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [competitorId, filters.page, fetchPostsForPage]);

  // Function to fetch adjacent pages
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

  // Fetch adjacent pages when modal is opened or current page changes
  useEffect(() => {
    if (isModalOpen && pagination.totalPages > 1) {
      fetchAdjacentPages();
    }
  }, [isModalOpen, pagination.currentPage, fetchAdjacentPages]);

  // Handle opening the modal
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

  // Handle closing the modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Add event listener to update the modal content without closing it
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

  // Function to handle cross-page navigation
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
    setFilters((prev: any) => ({
      ...prev,
      page: 1,
    }));
  };

  const openPreviewModal = (row: any) => {
    setModalRowData({
      ...row,
      clientId,
      businessId,
      competitorId,
    });
    setIsPreviewModalOpen(true);
  };

  const closePreviewModal = () => {
    setIsPreviewModalOpen(false);
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
    // Extract startDate / endDate and save to local dateRange
    const { startDate, endDate, ...otherFilters } = newFilters;

    if (endDate || startDate) {
      setDateRangeOfPosts((prevdate: object) => ({
        ...prevdate,
        ...(startDate && { startDate: startDate }),
        ...(endDate && { endDate: endDate }),
      }));
    }

    // Pass non-date fields to context management
    setFilters((prev: any) => ({
      ...prev,
      ...otherFilters,
      // If filters other than page change, reset to page 1
      page: newFilters.hasOwnProperty("page") ? newFilters.page : 1,
    }));
  };

  // Handle page change specifically
  const handlePageChange = (page: number) => {
    handleFilterChange({ page });
  };

  // Handle sort order change
  const handleSortOrderChange = (order: string) => {
    handleFilterChange({ sortOrder: order });
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-[34px] font-bold text-[#5D5FEF]">
          {competitorName}
        </h1>
        <DateRangePicker page="competitors_page" businessId={businessId} />
      </div>
      {/* Filters */}
      <SharedFilter
        title=""
        clientId={clientId}
        businessId={businessId}
        competitorId={competitorId}
        additionalFilters={CompetitorFilter}
        isLoading={isLoading}
        // Don't pass the "No competitor selected" error to the filter
        error={error === "No competitor selected" ? null : error}
        appliedFilters={appliedFilters}
        onFilterChange={handleFilterChange}
        onRefresh={fetchCompetitorPosts}
        onSortOrderChange={handleSortOrderChange}
      />

      {/* Tabs Section */}
      <div className="mt-6">
        <div className="mb-4 border-b border-gray-200">
          <ul
            className="flex flex-wrap -mb-px text-sm font-medium text-center"
            role="tablist"
          >
            <li className="mr-2" role="presentation">
              <button
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                  activeTab === 0
                    ? "text-blue-600 border-blue-600"
                    : "hover:text-gray-600 hover:border-gray-300 border-transparent"
                }`}
                type="button"
                role="tab"
                onClick={() => setActiveTab(0)}
              >
                Overview
              </button>
            </li>
            <li className="mr-2" role="presentation">
              <button
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                  activeTab === 1
                    ? "text-blue-600 border-blue-600"
                    : "hover:text-gray-600 hover:border-gray-300 border-transparent"
                }`}
                type="button"
                role="tab"
                onClick={() => setActiveTab(1)}
              >
                Competitor Posts
              </button>
            </li>
          </ul>
        </div>

        {/* Tab content */}
        <div className="tab-content">
          {activeTab === 0 && (
            // Overview Tab Content
            <>
              {!competitorId ? (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <div className="text-center p-8 text-gray-500">
                    <p className="mb-2 text-lg">
                      Select a competitor from the dropdown above to view
                      comparison statistics.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <CompetitorStatsCard
                    competitorId={competitorId}
                    competitorName={competitorName}
                    businessId={businessId}
                    startDate={dateRangeOfPosts.startDate}
                    endDate={dateRangeOfPosts.endDate}
                  />
                </div>
              )}
            </>
          )}

          {activeTab === 1 && (
            // Competitor Posts Tab Content
            <div>
              {!competitorId ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-center p-8 text-gray-500">
                    <p className="mb-2 text-lg">
                      Select a competitor from the dropdown above to view their
                      posts.
                    </p>
                  </div>
                </div>
              ) : (
                <SharedPostTable
                  listData={posts}
                  isLoading={isLoading}
                  postCardComponent={CompetitorPostCard}
                  pagination={{
                    currentPage: pagination.currentPage,
                    totalPages: pagination.totalPages,
                    onPageChange: handlePageChange,
                  }}
                  sortOrder={filters.sortOrder}
                  onSortOrderChange={handleSortOrderChange}
                  openModal={openModal}
                  openPreviewModal={openPreviewModal}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <PostPreviewCard
        isOpen={isPreviewModalOpen}
        onClose={closePreviewModal}
        rowData={modalRowData}
        listData={posts}
        onCrossPageNext={() => handleCrossPageNavigation("next")}
        onCrossPagePrev={() => handleCrossPageNavigation("prev")}
        isLoadingAdjacentPages={adjacentPagesLoading}
        pagination={pagination}
      />

      <CompetitorPostCard
        isOpen={isModalOpen}
        onClose={closeModal}
        rowData={modalRowData}
        listData={posts}
        onCrossPageNext={() => handleCrossPageNavigation("next")}
        onCrossPagePrev={() => handleCrossPageNavigation("prev")}
        isLoadingAdjacentPages={adjacentPagesLoading}
        pagination={pagination}
      />
    </>
  );
};

export default CompetitorPosts;
