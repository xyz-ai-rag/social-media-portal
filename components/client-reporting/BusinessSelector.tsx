"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FiChevronDown } from 'react-icons/fi';

interface BusinessSelectorProps {
  currentBusinessId: string;
  clientId: string;
  basePath: string; // e.g., "/monthly-kpis" or "/business-reporting"
}

export default function BusinessSelector({ 
  currentBusinessId, 
  clientId, 
  basePath 
}: BusinessSelectorProps) {
  const { clientDetails } = useAuth();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Early return AFTER all hooks have been called
  if (!clientDetails?.businesses || clientDetails.businesses.length <= 1) {
    return null; // Don't show selector if only one or no businesses
  }

  const currentBusiness = clientDetails.businesses.find(
    (biz) => biz.business_id === currentBusinessId
  );

  const handleBusinessSelect = (newBusinessId: string) => {
    if (newBusinessId !== currentBusinessId) {
      router.push(`/${clientId}/${newBusinessId}${basePath}`);
      setIsDropdownOpen(false);
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger - matching header style and date picker height */}
      <div
        onClick={toggleDropdown}
        className="flex items-center cursor-pointer px-4 py-2 hover:bg-gray-50 rounded-md transition-colors duration-150 border border-gray-300 h-10"
      >
        <span className="text-gray-800 font-medium text-sm mr-2">
          {currentBusiness?.business_name || 'Select Business'}
        </span>
        <FiChevronDown
          className={`text-gray-500 transform transition-transform duration-200 ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown menu - matching header style */}
      {isDropdownOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white shadow-lg rounded-md py-1 z-50 min-w-[200px] border border-gray-100 overflow-hidden">
          {clientDetails.businesses
            .sort((a, b) => a.business_name.localeCompare(b.business_name))
            .map((business) => (
              <div
                key={business.business_id}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors duration-150 ${
                  business.business_id === currentBusinessId
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => handleBusinessSelect(business.business_id)}
              >
                {business.business_name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}