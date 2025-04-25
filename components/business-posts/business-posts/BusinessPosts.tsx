"use client";

import { FC, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import SharedFilter from "../SharedFilter";
import SharedPostTable from "../SharedPostTable";
import PostCard from "./PostCard";
import { constructVercelURL } from "@/utils/generateURL";
import { PostData } from "../SharedFilter";
import PostPreviewCard from "../PostPreviewCard";

interface BusinessPostsProps {
  clientId: string;
  businessId: string;
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

const BusinessPosts: FC<BusinessPostsProps> = ({ clientId, businessId }) => {
  const { clientDetails } = useAuth();
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
      const savedFilters = sessionStorage.getItem("business_page_filters");
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
    sessionStorage.setItem("business_page_filters", JSON.stringify(filters));
  }, [filters]);
  
  // setting default date
  const [dateRange, setDateRange] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("business_page_date");
      return saved
        ? JSON.parse(saved)
        : { startDate: thirtyDaysAgo, endDate: yesterday };
    }
    return { startDate: thirtyDaysAgo, endDate: yesterday };
  });

  useEffect(() => {
    sessionStorage.setItem("business_page_date", JSON.stringify(dateRange));
  }, [dateRange]);
  
  // Track filters returned from API to keep UI in sync
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(
    null
  );

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
        return { posts: [], pagination: null, appliedFilters: null };
      }

      try {
        // Ensure endDate is not after yesterday
        const endDate =
          new Date(dateRange.endDate) > new Date(yesterday)
            ? yesterday
            : dateRange.endDate;

        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append("businessId", businessId);

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
    [businessId, filters, dateRange, yesterday]
  );

  // Main fetch function for current page
  const fetchPosts = useCallback(async () => {
    if (!businessId) {
      return { posts: [], pagination: null, appliedFilters: null };
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
        setError("No posts found");
      }
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      setError(error.message || "An error occurred while fetching posts");
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, filters.page, fetchPostsForPage]);

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
  }, [isModalOpen, isPreviewModalOpen, pagination.currentPage, fetchAdjacentPages]);

  // Handle opening the modal
  const openModal = (row: any) => {
    // Add contextual IDs to row data for the modal
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
    // Add contextual IDs to row data for the modal
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
    [pagination, prevPagePosts, nextPagePosts, clientId, businessId]
  );

  // Handle filter changes
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
      setDateRange((prevdate: object) => ({
        ...prevdate,
        ...(startDate && { startDate: startDate }),
        ...(endDate && { endDate: endDate }),
      }));
    }

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

  return (
    <>
      {/* Title */}
      <h1 className="text-[34px] font-bold text-[#5D5FEF] mb-4">
        {`Posts for ${businessName || "Business"}`}
      </h1>
      
      {/* Filters */}
      <SharedFilter
        title=""
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
    </>
  );
};

export default BusinessPosts;