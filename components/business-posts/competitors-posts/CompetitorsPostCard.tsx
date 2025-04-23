"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from '@/context/AuthContext';
import { PostData } from "../SharedPostList";
import { constructVercelURL } from "@/utils/generateURL";
import SharedPostModal from "../SharedPostModal";

interface PaginationInfo {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface CompetitorPostCardProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: PostData & {
    clientId?: string;
    businessId?: string;
    competitorId?: string;
  };
  // NEW: Navigation properties
  listData?: PostData[];
  onCrossPageNext?: () => void;
  onCrossPagePrev?: () => void;
  isLoadingAdjacentPages?: boolean;
  pagination?: PaginationInfo;
}

interface BusinessInfo {
  business_id: string;
  business_name: string;
  business_city?: string;
  business_type?: string;
}

const CompetitorPostCard = ({ 
  isOpen, 
  onClose, 
  rowData,
  listData = [],
  onCrossPageNext,
  onCrossPagePrev,
  isLoadingAdjacentPages = false,
  pagination
}: CompetitorPostCardProps) => {
  // Get auth context
  const { clientDetails } = useAuth();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [competitorInfo, setCompetitorInfo] = useState<BusinessInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Fetch the competitor's business information
  useEffect(() => {
    const fetchCompetitorInfo = async () => {
      if (!rowData?.competitorId) return;
      
      try {
        setIsLoading(true);
        
        // Check if business exists in client details first
        if (clientDetails?.businesses) {
          // This is for the current business
          if (rowData.businessId) {
            const business = clientDetails.businesses.find(
              (b) => b.business_id === rowData.businessId
            );
            
            if (business) {
              setBusinessName(business.business_name);
            }
          }
          
          // Check if competitor is in our list (unlikely, but we check anyway)
          const competitor = clientDetails.businesses.find(
            (b) => b.business_id === rowData.competitorId
          );
          
          if (competitor) {
            setCompetitorInfo({
              business_id: competitor.business_id,
              business_name: competitor.business_name,
              business_city: competitor.business_city,
              business_type: competitor.business_type
            });
            return;
          }
        }
        
        // If not found in client details, fetch from API
        const response = await fetch(
          constructVercelURL(`/api/businesses/getBusinessName?businessId=${rowData.competitorId}`)
        );
        
        if (!response.ok) {
          throw new Error("Failed to fetch competitor information");
        }
        
        const data = await response.json();
        setCompetitorInfo(data);
        
      } catch (error) {
        console.error("Error fetching competitor info:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCompetitorInfo();
  }, [rowData?.competitorId, rowData?.businessId, clientDetails]);

  // Find current index in the list data when rowData changes
  useEffect(() => {
    if (rowData && rowData.id && listData && listData.length > 0) {
      const index = listData.findIndex(item => item.id === rowData.id);
      setCurrentIndex(index);
    } else {
      setCurrentIndex(-1);
    }
  }, [rowData, listData]);

  // Create header title without loading state
  const headerTitle = useMemo(() => {
    // Use competitorInfo if available
    if (competitorInfo?.business_name) {
      return `${competitorInfo.business_name} - ${rowData.platform || "Post"}`;
    }
    
    // If not available, use platform name
    return rowData?.platform || "Competitor Post";
  }, [competitorInfo, rowData?.platform]);

  // Optional competitor info section
  // This could be re-enabled if desired
  const competitorInfoContent = isLoadingAdjacentPages ? (
    <div className="flex items-center">
      <div className="w-4 h-4 border-2 border-gray-200 border-t-[#5D5FEF] rounded-full animate-spin mr-2"></div>
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  ) : null;

  // NEW: Navigation to previous post (with cross-page support)
  const handlePrevious = () => {
    if (listData && listData.length > 0) {
      // If we're at the first item and there's a cross-page handler
      if (currentIndex === 0 && onCrossPagePrev && pagination && pagination.currentPage > 1) {
        onCrossPagePrev();
        return;
      // If we're at the first item and need to loop to the last page
      } else if (currentIndex === 0 && onCrossPagePrev && pagination && pagination.currentPage === 1 && pagination.totalPages > 1) {
        onCrossPagePrev();
        return;
      }
      
      // Regular navigation within the current page
      let newIndex = currentIndex - 1;
      
      // If at the beginning and no cross-page navigation, loop to the end of current page
      if (newIndex < 0) {
        newIndex = listData.length - 1;
      }
      
      const previousItem = listData[newIndex];
      if (previousItem) {
        // Add clientId, businessId and competitorId if they were in rowData
        const updatedItem = {
          ...previousItem,
          clientId: rowData.clientId,
          businessId: rowData.businessId,
          competitorId: rowData.competitorId
        };
        
        // Update the current index directly
        setCurrentIndex(newIndex);
        
        // Dispatch event to update modal
        const event = new CustomEvent('updatePostModal', { 
          detail: { data: updatedItem } 
        });
        document.dispatchEvent(event);
      }
    }
  };

  // NEW: Navigation to next post (with cross-page support)
  const handleNext = () => {
    if (listData && listData.length > 0) {
      // If we're at the last item and there's a cross-page handler
      if (currentIndex === listData.length - 1 && onCrossPageNext && pagination && pagination.currentPage < pagination.totalPages) {
        onCrossPageNext();
        return;
      // If we're at the last item and need to loop to the first page
      } else if (currentIndex === listData.length - 1 && onCrossPageNext && pagination && pagination.currentPage === pagination.totalPages && pagination.totalPages > 1) {
        onCrossPageNext();
        return;
      }
      
      // Regular navigation within the current page
      let newIndex = currentIndex + 1;
      
      // If at the end and no cross-page navigation, loop to the beginning of current page
      if (newIndex >= listData.length) {
        newIndex = 0;
      }
      
      const nextItem = listData[newIndex];
      if (nextItem) {
        // Add clientId, businessId and competitorId if they were in rowData
        const updatedItem = {
          ...nextItem,
          clientId: rowData.clientId,
          businessId: rowData.businessId,
          competitorId: rowData.competitorId
        };
        
        // Update the current index directly
        setCurrentIndex(newIndex);
        
        // Dispatch event to update modal
        const event = new CustomEvent('updatePostModal', { 
          detail: { data: updatedItem } 
        });
        document.dispatchEvent(event);
      }
    }
  };

  // Create custom competitive insights section based on business info
  const competitiveInsights = competitorInfo && businessName;

  // Handle case where rowData might be empty or undefined
  if (!rowData) return null;

  return (
    <SharedPostModal
      isOpen={isOpen}
      onClose={onClose}
      rowData={rowData}
      headerTitle={headerTitle}
      additionalContent={competitorInfoContent}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={true} // Always enable - will handle circular navigation
      hasNext={true} // Always enable - will handle circular navigation
      isNavigating={isLoadingAdjacentPages}
    />
  );
};

export default CompetitorPostCard;