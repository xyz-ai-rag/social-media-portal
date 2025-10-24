"use client";

import { FC, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import SharedFilter from "@/components/business-posts/SharedFilter";
import SharedPostTable from "@/components/business-posts/SharedPostTable";
import PostCard from "@/components/business-posts/business-posts/PostCard";
import { constructVercelURL } from "@/utils/generateURL";
import { PostData } from "@/components/business-posts/SharedFilter";
import PostPreviewCard from "@/components/business-posts/PostPreviewCard";
import TopicPostTrendChart from "./TopicPostsTrendChart";
import { IoArrowBack } from "react-icons/io5";
import Link from "next/link";
import { TopicAnalysisDrillDownTierBanner } from "@/components/TierBanner";
import { useBusinessTier } from '@/context/BusinessTierContext';

interface TopicPostsProps {
  clientId: string;
  businessId: string;
  topic: string;
  topicType: string;
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

const TopicPosts: FC<TopicPostsProps> = ({
  clientId,
  businessId,
  topic,
  topicType,
}) => {
  const { isFreeTier } = useBusinessTier();
  const searchParams = useSearchParams();
  
  // Check if this is a radar chart grouped topic
  const isRadarGrouped = topicType === 'credit_card_radar';
  const categoryName = searchParams.get('category') || '';
  const isGroupedTopic = topic.includes(',');
  
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteIds, setNoteIds] = useState<any[]>([]);
  const [title, setTitle] = useState<string>("topic-analysis");
  const [pagination, setPagination] = useState<PaginationInfo>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
  });

  // State for the modal
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
      const savedFilters = sessionStorage.getItem(`${title}_filters`);
      return savedFilters
        ? JSON.parse(savedFilters)
        : {
            platform: searchParams.get('platform') || "",
            sentiment: "",
            relevance: "",
            hasCriticism: "",
            search: "",
            sortOrder: "desc",
            page: 1,
          };
    }
    return {
      platform: searchParams.get('platform') || "",
      sentiment: "",
      relevance: "",
      hasCriticism: "",
      search: "",
      sortOrder: "desc",
      page: 1,
    };
  });

  useEffect(() => {
    sessionStorage.setItem(`${title}_filters`, JSON.stringify(filters));
  }, [filters, title]);

  // Setting default date range - check URL params first
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: searchParams.get('startDate') || "",
    endDate: searchParams.get('endDate') || "",
  });

  useEffect(() => {
    if (noteIds.length > 0 && !dateRange.startDate) {
      // Find the earliest date in the noteIds
      let earliestDate = new Date(noteIds[0].last_update_time);

      noteIds.forEach((note) => {
        const noteDate = new Date(note.last_update_time);
        if (noteDate < earliestDate) {
          earliestDate = noteDate;
        }
      });

      const formattedEarliestDate = earliestDate.toISOString().split("T")[0];
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const formattedYesterday = yesterday.toISOString().split("T")[0];

      setDateRange({
        startDate: formattedEarliestDate,
        endDate: formattedYesterday,
      });
    }
  }, [noteIds, dateRange.startDate]);

  // Track filters returned from API to keep UI in sync
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(
    null
  );

  // Helper function to fetch posts for any page
  const fetchPostsForPage = useCallback(
    async (pageNumber: number) => {
      if (!businessId) {
        return { posts: [], pagination: null, appliedFilters: null };
      }

      try {
        // Ensure endDate is not after yesterday
        const endDate =
          new Date(dateRange.endDate) > new Date(yesterday)
            ? yesterday
            : dateRange.endDate;

        // Check if current business is free tier and use sample businessId
        let effectiveBusinessId = businessId;
        let apiEndpoint = `/api/businesses/getBusinessPostsByTopic`;
        
        if (isFreeTier) {
          effectiveBusinessId = 'a7b6c5d4-e3f2-1a0b-9c8d-7e6f5a4b3c2d';
          apiEndpoint = `/api/businesses/getBusinessPosts`;
        }

        // Build query parameters
        const queryParams = new URLSearchParams();
  
        queryParams.append("businessId", effectiveBusinessId);
        
        // Only add topic parameter if not free tier
        if (!isFreeTier) {
          queryParams.append("topic", topic);
        }

        if (dateRange.startDate)
          queryParams.append("startDate", dateRange.startDate);
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

        // Make the API call
        const response = await fetch(
          constructVercelURL(
            `${apiEndpoint}?${queryParams.toString()}`
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
    [businessId, topic, filters, dateRange, yesterday, isFreeTier]
  );

  // Main fetch function for current page
  const fetchPosts = useCallback(async () => {
    if (!businessId) {
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
  }, [fetchPostsForPage, filters.page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Fetch adjacent pages for cross-page navigation in modals
  const fetchAdjacentPages = useCallback(async () => {
    setAdjacentPagesLoading(true);

    const prevPage = pagination.currentPage > 1 ? pagination.currentPage - 1 : pagination.totalPages;
    const nextPage = pagination.currentPage < pagination.totalPages ? pagination.currentPage + 1 : 1;

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
  }, [
    isModalOpen,
    isPreviewModalOpen,
    pagination.currentPage,
    fetchAdjacentPages,
  ]);

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

  // Fetch raw data from backend for trend chart
  useEffect(() => {
    // Skip trend data for grouped topics since it doesn't make sense
    if (isGroupedTopic) return;
    
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/businesses/getTopicPostsTrend?businessId=${businessId}&topic=${topic}`
        );
        const res = await response.json();
        setNoteIds(res.postRows || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [topic, businessId, isGroupedTopic]);

  // Generate the display title
  const getDisplayTitle = () => {
    if (isRadarGrouped && categoryName) {
      return `${categoryName} Posts`;
    }
    return `${decodeURIComponent(topic)} Posts`;
  };

  // Generate the subtitle for grouped topics
  const getSubtitle = () => {
    if (isGroupedTopic) {
      const topics = topic.split(',').map(t => t.trim());
      return `Including: ${topics.join(', ')}`;
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col mb-4">
        <h1 className="text-[34px] font-bold text-[#5D5FEF]">
          {getDisplayTitle()}
        </h1>
        {getSubtitle() && (
          <p className="text-sm text-gray-600 mt-1">
            {getSubtitle()}
          </p>
        )}
      </div>

      {/* Back button */}
      <div className="flex items-center -mt-4">
        <Link
          href={`/${clientId}/${businessId}/topic-analysis?topic_type=${topicType}`}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <IoArrowBack className="h-5 w-5 mr-1" />
          {`Back to Topic Analysis ${
            topicType == undefined ? "" : `: ${topicType}`
          }`}
        </Link>
      </div>
      <TopicAnalysisDrillDownTierBanner/>

      {/* Trend Chart - only show for single topics */}
      {topicType !== "General" && !isGroupedTopic && (
        <TopicPostTrendChart businessId={businessId} noteIds={noteIds} />
      )}

      {/* Filters */}
      <SharedFilter
        title={title}
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

export default TopicPosts;