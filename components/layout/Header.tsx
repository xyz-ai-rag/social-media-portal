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
  const showBusinessSelector =
    pathname.includes("/dashboard") ||
    pathname.includes("/posts") ||
    pathname.includes("/competitors") ||
    pathname.includes("/topic-analysis");

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
      // Get the current path segments
      const pathSegments = pathname.split("/");

      // The current page type is typically the 4th segment in the URL: /clientId/businessId/pageType
      // If there are more segments (like /clientId/businessId/pageType/subpage), we preserve them
      const currentPagePath = pathSegments.slice(3).join("/");

      // Build the new URL with the same page type but new business ID
      const newPath = `/${clientDetails.id}/${businessId}/${
        currentPagePath || "dashboard"
      }`;

      router.push(newPath);
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

  // Avatar Change
  interface AvatarProps {
    name: string;
  }
  const Avatar = ({ name }: AvatarProps) => {
    const initails = name
      .split(" ")
      .map((word: string) => word[0])
      .join("")
      .toUpperCase();

    console.log();

    return (
      <div className="w-10 h-10 flex items-center justify-center bg-[#5A67BA] text-white text-sm font-bold rounded-full">
        {initails}
      </div>
    );
  };
  return (
    <header className="flex h-20 items-center bg-white border-b border-gray-200">
      {/* Right side */}
      <div className="ml-auto flex flex-col items-end space-y-1 px-4">
        {/* (Logo and Business Info)  */}
        <div className="flex ml-auto space-x-4 items-center">
          {/* Business Logo */}
          <Avatar name={currentBusinessName}></Avatar>
          {/* <div className="bg-orange-100 rounded-full p-2">🍔</div> */}

          {/* Custom Business Dropdown - only on dashboard pages with available businesses */}
          {showBusinessSelector && hasBusinesses && (
            <div className="relative" ref={dropdownRef}>
              {/* Dropdown trigger */}
              <div
                onClick={toggleDropdown}
                className="flex items-center cursor-pointer py-1 px-2 hover:bg-gray-50 rounded-sm transition-colors duration-150"
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
                <div className="absolute top-full right-0 mt-2 bg-white shadow-lg rounded-md py-1 z-50 min-w-[200px] border border-gray-100 overflow-hidden">
                  {clientDetails.businesses
                    .sort((a, b) =>
                      a.business_name.localeCompare(b.business_name)
                    )
                    .map((biz) => (
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
        {/* User Info */}
        <div>
          {user?.email && (
            <div className="text-sm text-gray-600 hidden md:block px-2">
              <span className="font-medium">Logged in as: </span>
              {user.email}
            </div>
          )}
        </div>
      </div>

      {/* Right side (Company Name and User Info) */}
      {/* <div className="items-center space-x-4 text-right py-2">
        <span className="text-gray-800 font-semibold text-2xl">
          Hyprdata.ai
        </span>
        {user?.email && (
          <div className="text-sm text-gray-600 hidden md:block mt-1">
            <span className="font-medium">Logged in as: </span>
            {user.email}
          </div>
        )}
      </div> */}
    </header>
  );
}
