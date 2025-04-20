"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PostData } from "../SharedPostList";
import PreviewModalNew from "../PreviewModalNew";

interface PaginationInfo {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface PostCardProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: PostData & {
    clientId?: string;
    businessId?: string;
  };
  // Navigation properties
  listData?: PostData[];
  // NEW: Cross-page navigation handlers
  onCrossPageNext?: () => void;
  onCrossPagePrev?: () => void;
  isLoadingAdjacentPages?: boolean;
  pagination?: PaginationInfo;
}

const PostPreviewCard = ({
  isOpen,
  onClose,
  rowData,
  listData = [],
  onCrossPageNext,
  onCrossPagePrev,
  isLoadingAdjacentPages = false,
  pagination,
}: PostCardProps) => {
  // Get auth context
  const { clientDetails } = useAuth();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Find the business and client name when component mounts or rowData changes
  useEffect(() => {
    if (clientDetails && rowData?.businessId) {
      // Find the business with matching ID
      const business = clientDetails.businesses.find(
        (b) => b.business_id === rowData.businessId
      );

      if (business) {
        setBusinessName(business.business_name);
      } else {
        setBusinessName(null);
      }

      // Set client name if client ID matches
      if (clientDetails.id === rowData.clientId) {
        setClientName(clientDetails.client_name);
      }
    }
  }, [clientDetails, rowData?.businessId, rowData?.clientId]);

  // Find current index in the list data when rowData changes
  useEffect(() => {
    if (rowData && rowData.id && listData && listData.length > 0) {
      const index = listData.findIndex((item) => item.id === rowData.id);
      setCurrentIndex(index);
    } else {
      setCurrentIndex(-1);
    }
  }, [rowData, listData]);

  // Navigate to previous post (with cross-page support)
  const handlePrevious = () => {
    if (listData && listData.length > 0) {
      // If we're at the first item and there's a cross-page handler
      if (
        currentIndex === 0 &&
        onCrossPagePrev &&
        pagination &&
        pagination.currentPage > 1
      ) {
        onCrossPagePrev();
        return;
        // If we're at the first item and need to loop to the last page
      } else if (
        currentIndex === 0 &&
        onCrossPagePrev &&
        pagination &&
        pagination.currentPage === 1 &&
        pagination.totalPages > 1
      ) {
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
        // Add clientId and businessId if they were in rowData
        const updatedItem = {
          ...previousItem,
          clientId: rowData.clientId,
          businessId: rowData.businessId,
        };

        // Update the current index directly
        setCurrentIndex(newIndex);

        // Dispatch event to update modal
        const event = new CustomEvent("updatePostModal", {
          detail: { data: updatedItem },
        });
        document.dispatchEvent(event);
      }
    }
  };

  // Navigate to next post (with cross-page support)
  const handleNext = () => {
    if (listData && listData.length > 0) {
      // If we're at the last item and there's a cross-page handler
      if (
        currentIndex === listData.length - 1 &&
        onCrossPageNext &&
        pagination &&
        pagination.currentPage < pagination.totalPages
      ) {
        onCrossPageNext();
        return;
        // If we're at the last item and need to loop to the first page
      } else if (
        currentIndex === listData.length - 1 &&
        onCrossPageNext &&
        pagination &&
        pagination.currentPage === pagination.totalPages &&
        pagination.totalPages > 1
      ) {
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
        // Add clientId and businessId if they were in rowData
        const updatedItem = {
          ...nextItem,
          clientId: rowData.clientId,
          businessId: rowData.businessId,
        };

        // Update the current index directly
        setCurrentIndex(newIndex);

        // Dispatch event to update modal
        const event = new CustomEvent("updatePostModal", {
          detail: { data: updatedItem },
        });
        document.dispatchEvent(event);
      }
    }
  };

  // Handle case where rowData might be empty or undefined
  if (!rowData) return null;

  // Message in case of adjacent pages loading
  const loadingMessage = isLoadingAdjacentPages ? (
    <div className="text-xs text-gray-500 mr-4">Loading...</div>
  ) : null;

  return (
    <PreviewModalNew
      isOpen={isOpen}
      onClose={onClose}
      rowData={rowData}
      headerTitle={rowData?.platform || "Post Details"}
      showCompetitiveInsights={false}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={true} // Always enable - will handle circular navigation
      hasNext={true} // Always enable - will handle circular navigation
      additionalContent={loadingMessage}
    />
  );
};

export default PostPreviewCard;
