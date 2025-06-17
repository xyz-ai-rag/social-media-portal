// hooks/useBusinessSelection.js
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export const useBusinessSelection = () => {
  const { clientDetails } = useAuth();
  const params = useParams();
  const [selectedBusinessId, setSelectedBusinessId] = useState('');

  useEffect(() => {
    if (clientDetails?.id && clientDetails?.businesses?.length > 0) {
      const urlBusinessId = params.businessId as string;
      const storageKey = `selectedBusiness_${clientDetails.id}`;
      const storedBusinessId = localStorage.getItem(storageKey);
      
      // Priority: URL param > localStorage > first business alphabetically
      let businessToSelect = urlBusinessId;
      
      if (!businessToSelect && storedBusinessId) {
        // Check if stored business still exists in current businesses
        const businessExists = clientDetails.businesses.some(
          biz => biz.business_id === storedBusinessId
        );
        if (businessExists) {
          businessToSelect = storedBusinessId;
        }
      }
      
      if (!businessToSelect) {
        // Default to first business alphabetically
        const sortedBusinesses = [...clientDetails.businesses].sort((a, b) =>
          a.business_name.localeCompare(b.business_name)
        );
        businessToSelect = sortedBusinesses[0]?.business_id;
      }
      
      setSelectedBusinessId(businessToSelect);
      
      // Store the selection
      if (businessToSelect) {
        localStorage.setItem(storageKey, businessToSelect);
      }
    }
  }, [clientDetails, params.businessId]);

  const updateSelectedBusiness = (businessId:string) => {
    if (businessId && clientDetails?.id) {
      setSelectedBusinessId(businessId);
      const storageKey = `selectedBusiness_${clientDetails.id}`;
      localStorage.setItem(storageKey, businessId);
    }
  };

  return {
    selectedBusinessId,
    updateSelectedBusiness
  };
};