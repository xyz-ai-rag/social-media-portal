"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { FiChevronDown } from "react-icons/fi";
import { useRouter, useParams, usePathname } from "next/navigation";

export default function Header() {
  const { user, clientDetails } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only show business selector on dashboard pages
  const showBusinessSelector = pathname.includes("/dashboard");

  // Get the current business ID from params
  const currentBusinessId = params.businessId as string;

  // Find current business name
  const currentBusiness = clientDetails?.businesses?.find(
    (biz) => biz.business_id === currentBusinessId
  );
  const currentBusinessName = currentBusiness?.business_name || "";

  // Handle business selection
  const handleBusinessSelect = (businessId: string) => {
    if (businessId && clientDetails?.id) {
      router.push(`/${clientDetails.id}/${businessId}/dashboard`);
      setIsDropdownOpen(false);
    }
  };

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

  // Check if we have business data to show in the dropdown
  const hasBusinesses =
    clientDetails &&
    clientDetails.businesses &&
    clientDetails.businesses.length > 0;

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      {/* Left side (Logo and Business Info) */}
      <div className="flex items-center space-x-4">
        {/* Business Logo */}
        <div className="bg-orange-100 rounded-full p-2">🍔</div>

        {/* Custom Business Dropdown - only on dashboard pages with available businesses */}
        {showBusinessSelector && hasBusinesses && (
          <div className="relative" ref={dropdownRef}>
            {/* Dropdown trigger */}
            <div
              onClick={toggleDropdown}
              className="flex items-center cursor-pointer py-1 px-2 hover:bg-gray-50 rounded-md transition-colors duration-150"
            >
              <span className="text-gray-800 font-medium text-sm mr-1.5">
                {currentBusinessName}
              </span>
              <FiChevronDown
                className={`text-gray-500 transform transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white shadow-lg rounded-md py-1 z-50 min-w-[180px] border border-gray-100 overflow-hidden">
                {clientDetails.businesses.map((biz) => (
                  <div
                    key={biz.business_id}
                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors duration-150 ${
                      biz.business_id === currentBusinessId
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => handleBusinessSelect(biz.business_id)}
                  >
                    {biz.business_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side (Company Name and User Info) */}
      <div className="flex items-center space-x-4">
        <span className="text-gray-800 font-semibold">Hyprdata.ai</span>
        {user?.email && (
          <div className="text-sm text-gray-600 hidden md:block">
            <span className="font-medium">Logged in as: </span>
            {user.email}
          </div>
        )}
      </div>
    </header>
  );
}
