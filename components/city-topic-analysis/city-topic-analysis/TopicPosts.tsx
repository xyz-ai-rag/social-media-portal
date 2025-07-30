"use client";

import { FC, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import SharedPostTable from "../../business-posts/SharedPostTable";
import PostCard from "../../business-posts/business-posts/PostCard";
import { constructVercelURL } from "@/utils/generateURL";
import { PostData } from "../../business-posts/SharedFilter";
import PostPreviewCard from "../../business-posts/PostPreviewCard";
import { useDateRange } from "@/context/DateRangeContext";
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

const TopicPosts: FC<TopicPostsProps> = ({ clientId, businessId, topic, topicType }) => {
  const { clientDetails } = useAuth();
  const { isFreeTier } = useBusinessTier();
  const [businessName, setBusinessName] = useState("");
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

  const [currentPage, setCurrentPage] = useState(1);

  // Get date range from context
  const { dateRange } = useDateRange();

  // setting default date
  const [dateRangeOfPosts, setDateRangeOfPosts] = useState({
    startDate: "",
    endDate: "",
  });

  // Process dates using helper functions from timeUtils
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

  // Helper function to fetch posts for any page
  const fetchPostsForPage = useCallback(
    async (pageNumber: number) => {
      if (!businessId) {
        return { posts: [], pagination: null };
      }

      try {
        // Ensure endDate is not after yesterday
        const endDate =
          new Date(dateRangeOfPosts.endDate) > new Date(yesterday)
            ? yesterday
            : dateRangeOfPosts.endDate;
        
        // Check if current business is free tier and override businessId
        let effectiveBusinessId = businessId;
        if (isFreeTier) {
          effectiveBusinessId = 'a7b6c5d4-e3f2-1a0b-9c8d-7e6f5a4b3c2d';
        }

        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append("businessId", effectiveBusinessId);
        queryParams.append("topic", topic);
        queryParams.append("topicType", topicType);

        if (dateRangeOfPosts.startDate)
          queryParams.append("startDate", dateRangeOfPosts.startDate);
        queryParams.append("endDate", endDate);
        queryParams.append("sortOrder", "desc");
        queryParams.append("page", pageNumber.toString());

        // Make the API call
        const response = await fetch(
          constructVercelURL(
            `/api/businesses/getBusinessPostsByTopic?${queryParams.toString()}`
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
        };
      } catch (error: any) {
        console.error(`Error fetching posts for page ${pageNumber}:`, error);
        return { posts: [], pagination: null };
      }
    },
    [businessId, dateRangeOfPosts, yesterday, topic, topicType, isFreeTier]
  );

  // Main fetch function for current page
  const fetchPosts = useCallback(async () => {
    if (!businessId) {
      return { posts: [], pagination: null };
    }

    try {
      setIsLoading(true);
      setError(null);

      const { posts, pagination } = await fetchPostsForPage(currentPage);



      if (posts.length >= 0) {
        setPosts(posts);
        if (pagination) setPagination(pagination);
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
  }, [businessId, currentPage, fetchPostsForPage]);

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

  // Fetch posts when filters or businessId changes
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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

  // Handle closing the modal
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

  // Handle closing the modal
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

        setCurrentPage(newPage);
      }
    },
    [pagination, prevPagePosts, nextPagePosts, clientId, businessId]
  );

  // Handle page change specifically
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <>
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
        sortOrder="desc"
        onSortOrderChange={() => {}} // No-op since we don't have filters
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
    </>
  );
};

export default TopicPosts; 