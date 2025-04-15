"use client";

import { FC, useEffect, useState, useCallback,useMemo } from "react";
import { useAuth } from '@/context/AuthContext';
import SharedPostList from "../SharedPostList";
import PostCard from './PostCard';
import { constructVercelURL } from "@/utils/generateURL";
import { PostData } from "../SharedPostList";

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
    pageSize: 10
  });
  // Calculate yesterday's date for date limits
  const yesterday = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }, []);

  // Calculate default 7 days ago date
  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }, []);
  // Initialize with empty filters - the API will apply defaults (last 7 days)
  const [filters, setFilters] = useState({
    startDate: sevenDaysAgo,
    endDate: yesterday,
    platform: '',
    sentiment: '',
    relevance: '',
    hasCriticism: '',
    search: '',
    sortOrder: 'desc',
    page: 1
  });
  
  // Track filters returned from API to keep UI in sync
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);

  // Update business name when business ID changes
  useEffect(() => {
    if (clientDetails && businessId) {
      const business = clientDetails.businesses.find(b => b.business_id === businessId);
      if (business) {
        setBusinessName(business.business_name);
      }
    }
  }, [clientDetails, businessId]);

  // Fetch posts with current filters
  const fetchPosts = useCallback(async () => {
    if (!businessId) {
      setError("Business ID is required");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      // Ensure endDate is not after yesterday
      const endDate = new Date(filters.endDate) > new Date(yesterday) 
        ? yesterday 
        : filters.endDate;

      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('businessId', businessId);
      
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
        queryParams.append('endDate', endDate);
      if (filters.platform) queryParams.append('platform', filters.platform);
      if (filters.sentiment) queryParams.append('sentiment', filters.sentiment);
      if (filters.relevance) queryParams.append('relevance', filters.relevance);
      if (filters.hasCriticism) queryParams.append('hasCriticism', filters.hasCriticism);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
      queryParams.append('page', filters.page.toString());

      // Make the API call
      const response = await fetch(
        constructVercelURL(`/api/businesses/getBusinessPosts?${queryParams.toString()}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch posts');
      }

      const data = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
      setAppliedFilters(data.appliedFilters);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      setError(error.message || 'An error occurred while fetching posts');
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, filters]);

  // Fetch posts when filters or businessId changes
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Handle filter changes from the SharedPostList component
  const handleFilterChange = (newFilters: any) => {

    // Ensure we never send a date after yesterday
    if (newFilters.endDate && new Date(newFilters.endDate) > new Date(yesterday)) {
        newFilters.endDate = yesterday;
      }
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      // If filters other than page change, reset to page 1
      page: newFilters.hasOwnProperty('page') ? newFilters.page : 1
    }));
  };

  // Handle page change specifically
  const handlePageChange = (page: number) => {
    handleFilterChange({ page });
  };

  return (
    <SharedPostList
      title={`Posts for ${businessName || "Business"}`}
      clientId={clientId}
      businessId={businessId}
      postCardComponent={PostCard}
      onFilterChange={handleFilterChange}
      initialData={posts}
      isLoading={isLoading}
      error={error}
      appliedFilters={appliedFilters}
      pagination={{
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        onPageChange: handlePageChange
      }}
      onRefresh={fetchPosts}
    />
  );
};

export default BusinessPosts;