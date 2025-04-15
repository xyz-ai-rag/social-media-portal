"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "flowbite-react";
import { useAuth } from '@/context/AuthContext';
import { PostData } from "../SharedPostList";
import SharedPostModal from "../SharedPostModal";
interface PostCardProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: PostData & {
    clientId?: string;
    businessId?: string;
  };
}

const PostCard = ({ isOpen, onClose, rowData }: PostCardProps) => {
  // Get auth context
  const { clientDetails } = useAuth();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

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

  // Handle case where rowData might be empty or undefined
  if (!rowData) return null;

  return (
    <SharedPostModal
      isOpen={isOpen}
      onClose={onClose}
      rowData={rowData}
      headerTitle={rowData?.platform || "Post Details"}
      // additionalContent={businessClientInfo}
      showCompetitiveInsights={false}
    />
  );
};

export default PostCard;