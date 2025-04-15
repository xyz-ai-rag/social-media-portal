"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from '@/context/AuthContext';
import { PostData } from "../SharedPostList";
import { constructVercelURL } from "@/utils/generateURL";
import SharedPostModal from "../SharedPostModal";

interface CompetitorPostCardProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: PostData & {
    clientId?: string;
    businessId?: string;
    competitorId?: string;
  };
}

interface BusinessInfo {
  business_id: string;
  business_name: string;
  business_city?: string;
  business_type?: string;
}

const CompetitorPostCard = ({ isOpen, onClose, rowData }: CompetitorPostCardProps) => {
  // Get auth context
  const { clientDetails } = useAuth();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [competitorInfo, setCompetitorInfo] = useState<BusinessInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
  // Uncomment this section if you want to show competitor info
  // const competitorInfoContent = (
  //   <div className="bg-blue-50 p-4 rounded-md mb-6">
  //     {isLoading ? (
  //       <div className="flex items-center">
  //         <div className="w-4 h-4 border-2 border-gray-200 border-t-[#5D5FEF] rounded-full animate-spin mr-2"></div>
  //         <p className="text-sm text-gray-500">Fetching competitor details...</p>
  //       </div>
  //     ) : (
  //       <>
  //         {competitorInfo && (
  //           <div className="mb-2">
  //             <p className="text-sm text-gray-500">Competitor</p>
  //             <p className="font-medium text-red-700">{competitorInfo.business_name}</p>
  //             {competitorInfo.business_city && (
  //               <p className="text-sm text-gray-600">{competitorInfo.business_city}</p>
  //             )}
  //             {competitorInfo.business_type && (
  //               <p className="text-xs text-gray-500">{competitorInfo.business_type}</p>
  //             )}
  //             <p className="text-xs text-gray-400 mt-1">ID: {competitorInfo.business_id}</p>
  //           </div>
  //         )}
        
  //         {businessName && (
  //           <div>
  //             <p className="text-sm text-gray-500">Compared to Your Business</p>
  //             <p className="font-medium text-blue-700">{businessName}</p>
  //             {rowData.businessId && (
  //               <p className="text-xs text-gray-400">ID: {rowData.businessId}</p>
  //             )}
  //           </div>
  //         )}
  //       </>
  //     )}
  //   </div>
  // );

  // Create custom competitive insights section based on business info
  const competitiveInsights = competitorInfo && businessName;

  return (
    <SharedPostModal
      isOpen={isOpen}
      onClose={onClose}
      rowData={rowData}
      headerTitle={headerTitle}
      // additionalContent={competitorInfoContent} 
      showCompetitiveInsights={false}
    />
  );
};

export default CompetitorPostCard;