"use client";

import { FC, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import SharedFilter from "@/components/business-posts/SharedFilter";
import SharedPostTable from "@/components/business-posts/SharedPostTable";
import PostCard from "@/components/business-posts/business-posts/PostCard";
import { constructVercelURL } from "@/utils/generateURL";
import { PostData } from "@/components/business-posts/SharedFilter";
import PostPreviewCard from "@/components/business-posts/PostPreviewCard";
import { IoArrowBack } from "react-icons/io5";
import Link from "next/link";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { useBusinessTier } from "@/context/BusinessTierContext";

interface MonthlyTopicPostsProps {
  clientId: string;
  businessId: string;
  topicId: string;
  topicType: string;
  topicName: string;
  month: string;
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

const MonthlyTopicPosts: FC<MonthlyTopicPostsProps> = ({
  clientId,
  businessId,
  topicId,
  topicType,
  topicName,
  month,
}) => {
  const { isFreeTier } = useBusinessTier();

  const [posts, setPosts] = useState<PostData[]>([]);
  const [allNoteIds, setAllNoteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
  });

  // State for the modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [modalRowData, setModalRowData] = useState<any>({});

  // State to store adjacent pages' posts
  const [prevPagePosts, setPrevPagePosts] = useState<PostData[]>([]);
  const [nextPagePosts, setNextPagePosts] = useState<PostData[]>([]);
  const [adjacentPagesLoading, setAdjacentPagesLoading] = useState(false);

  // Calculate yesterday's date for date limits
  const yesterday = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
  }, []);

  const [filters, setFilters] = useState(() => {
    if (typeof window !== "undefined") {
      const savedFilters = sessionStorage.getItem(`monthly_topic_posts_filters`);
      return savedFilters
        ? JSON.parse(savedFilters)
        : {
            platform: "",
            sentiment: "",
            relevance: "",
            hasCriticism: "",
            search: "",
            sortOrder: "desc",
            page: 1,
          };
    }
    return {
      platform: "",
      sentiment: "",
      relevance: "",
      hasCriticism: "",
      search: "",
      sortOrder: "desc",
      page: 1,
    };
  });

  useEffect(() => {
    sessionStorage.setItem(`monthly_topic_posts_filters`, JSON.stringify(filters));
  }, [filters]);

  // Date range based on month
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: "",
    endDate: "",
  });

  // Set date range based on month parameter
  useEffect(() => {
    if (month) {
      const [year, monthNum] = month.split("-");
      const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();

      setDateRange({
        startDate: `${month}-01`,
        endDate: `${month}-${lastDay}`,
      });
    }
  }, [month]);

  // Track filters returned from API to keep UI in sync
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);

  // Fetch note_ids for this topic
  useEffect(() => {
    const fetchTopicData = async () => {
      if (!topicId || !businessId) return;

      try {
        const response = await fetch(
          constructVercelURL(
            `/api/businesses/credit-cards/getTopicQuotes?topicId=${topicId}&businessId=${businessId}`
          )
        );

        if (!response.ok) {
          throw new Error("Failed to fetch topic data");
        }

        const result = await response.json();

        if (result.success && result.data.note_ids) {
          setAllNoteIds(result.data.note_ids);
        }
      } catch (error: any) {
        console.error("Error fetching topic data:", error);
      }
    };

    fetchTopicData();
  }, [topicId, businessId]);

  // Helper function to fetch posts for any page
  const fetchPostsForPage = useCallback(
    async (pageNumber: number) => {
      if (!businessId || allNoteIds.length === 0) {
        return { posts: [], pagination: null, appliedFilters: null };
      }

      try {
        // Ensure endDate is not after yesterday
        const endDate =
          new Date(dateRange.endDate) > new Date(yesterday)
            ? yesterday
            : dateRange.endDate;

        // Check if current business is free tier
        let effectiveBusinessId = businessId;
        if (isFreeTier) {
          effectiveBusinessId = "a7b6c5d4-e3f2-1a0b-9c8d-7e6f5a4b3c2d";
        }

        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append("businessId", effectiveBusinessId);

        // Pass note_ids as comma-separated string
        queryParams.append("note_ids", allNoteIds.join(","));

        if (dateRange.startDate)
          queryParams.append("startDate", dateRange.startDate);
        queryParams.append("endDate", endDate);
        if (filters.platform) queryParams.append("platform", filters.platform);
        if (filters.sentiment) queryParams.append("sentiment", filters.sentiment);
        if (filters.relevance) queryParams.append("relevance", filters.relevance);
        if (filters.hasCriticism)
          queryParams.append("hasCriticism", filters.hasCriticism);
        if (filters.search) queryParams.append("search", filters.search);
        if (filters.sortOrder) queryParams.append("sortOrder", filters.sortOrder);
        queryParams.append("page", pageNumber.toString());

        // Make the API call to business posts endpoint
        const response = await fetch(
        constructVercelURL(
            `/api/businesses/credit-cards/getMonthlyTopicPosts?${queryParams.toString()}`
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
          throw new Error(errorData.error || "Failed to fetch posts");
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
    [businessId, allNoteIds, filters, dateRange, yesterday, isFreeTier]
  );

  // Main fetch function for current page
  const fetchPosts = useCallback(async () => {
    if (!businessId || allNoteIds.length === 0) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { posts, pagination, appliedFilters } = await fetchPostsForPage(
        filters.page
      );

      if (posts.length >= 0) {
        setPosts(posts);
        if (pagination) setPagination(pagination);
        if (appliedFilters) setAppliedFilters(appliedFilters);
      } else {
        setPosts([]);
        setError("No posts found");
      }
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      setError(error.message || "An error occurred while fetching posts");
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPostsForPage, filters.page, businessId, allNoteIds]);

  useEffect(() => {
    if (allNoteIds.length > 0) {
      fetchPosts();
    }
  }, [fetchPosts, allNoteIds]);

  // Fetch adjacent pages for cross-page navigation in modals
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

    const [prevData, nextData] = await Promise.all([
      fetchPostsForPage(prevPage),
      fetchPostsForPage(nextPage),
    ]);

    setPrevPagePosts(prevData.posts);
    setNextPagePosts(nextData.posts);
    setAdjacentPagesLoading(false);
  }, [pagination.currentPage, pagination.totalPages, fetchPostsForPage]);

  // Fetch adjacent pages when modal is opened or current page changes
  useEffect(() => {
    if ((isModalOpen || isPreviewModalOpen) && pagination.totalPages > 1) {
      fetchAdjacentPages();
    }
  }, [isModalOpen, isPreviewModalOpen, pagination.currentPage, fetchAdjacentPages]);

  // Handle opening the modal
  const openModal = (row: any) => {
    setModalRowData({
      ...row,
      clientId,
      businessId,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openPreviewModal = (row: any) => {
    setModalRowData({
      ...row,
      clientId,
      businessId,
    });
    setIsPreviewModalOpen(true);
  };

  const closePreviewModal = () => {
    setIsPreviewModalOpen(false);
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
      const newPage =
        direction === "prev"
          ? pagination.currentPage > 1
            ? pagination.currentPage - 1
            : pagination.totalPages
          : pagination.currentPage < pagination.totalPages
          ? pagination.currentPage + 1
          : 1;

      const newPagePosts = direction === "prev" ? prevPagePosts : nextPagePosts;
      const newRowData =
        direction === "prev"
          ? newPagePosts[newPagePosts.length - 1]
          : newPagePosts[0];

      if (newRowData) {
        const updatedData = {
          ...newRowData,
          clientId,
          businessId,
        };

        const event = new CustomEvent("updatePostModal", {
          detail: { data: updatedData },
        });
        document.dispatchEvent(event);

        handleFilterChange({ page: newPage });
      }
    },
    [pagination, prevPagePosts, nextPagePosts, clientId, businessId]
  );

  // Handle filter changes
  const handleFilterChange = (newFilters: any) => {
    if (
      newFilters.endDate &&
      new Date(newFilters.endDate) > new Date(yesterday)
    ) {
      newFilters.endDate = yesterday;
    }

    const { startDate, endDate, ...otherFilters } = newFilters;

    if (endDate || startDate) {
      setDateRange((prevdate: object) => ({
        ...prevdate,
        ...(startDate && { startDate: startDate }),
        ...(endDate && { endDate: endDate }),
      }));
    }

    setFilters((prev: any) => ({
      ...prev,
      ...otherFilters,
      page: newFilters.hasOwnProperty("page") ? newFilters.page : 1,
    }));
  };

  const handlePageChange = (page: number) => {
    handleFilterChange({ page });
  };

  const handleSortOrderChange = (order: string) => {
    handleFilterChange({ sortOrder: order });
  };

  // Format month for display
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header Section */}
      <div className="flex flex-col mb-4">
        <div className="flex items-center gap-3 mb-2">
          {topicType === "strength" ? (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          )}
          <h1 className="text-[34px] font-bold text-[#5D5FEF]">
            {decodeURIComponent(topicName)}
          </h1>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatMonth(month)}</span>
          <span className="mx-2">•</span>
          <span className="capitalize">{topicType}</span>
          <span className="mx-2">•</span>
          <span>{allNoteIds.length} posts mentioning this topic</span>
        </div>
      </div>

      {/* Back button */}
      <div className="flex items-center -mt-4 mb-4">
        <Link
          href={`/${clientId}/${businessId}/dashboard?tab=monthly-summary`}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <IoArrowBack className="h-5 w-5 mr-1" />
          Back to Monthly Summary
        </Link>
      </div>

      {/* Filters */}
      <SharedFilter
        title="monthly_topic_posts"
        clientId={clientId}
        businessId={businessId}
        isLoading={isLoading}
        error={error}
        appliedFilters={appliedFilters}
        onFilterChange={handleFilterChange}
        onRefresh={fetchPosts}
        onSortOrderChange={handleSortOrderChange}
      />

      {/* Posts Table */}
      <SharedPostTable
        listData={posts}
        isLoading={isLoading}
        postCardComponent={PostCard}
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

      {/* Modals */}
      <PostCard
        isOpen={isModalOpen}
        onClose={closeModal}
        rowData={modalRowData}
        listData={posts}
        onCrossPageNext={() => handleCrossPageNavigation("next")}
        onCrossPagePrev={() => handleCrossPageNavigation("prev")}
        isLoadingAdjacentPages={adjacentPagesLoading}
        pagination={pagination}
      />

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
    </div>
  );
};

export default MonthlyTopicPosts;