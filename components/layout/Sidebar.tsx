"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  FiChevronLeft,
  FiChevronRight,
  FiSettings,
  FiLogOut,
  FiGrid,
  FiList,
  FiUsers,
  FiAlertCircle,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";

type MenuItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  disabled?: boolean;
  collapsed: boolean;
  onClick?: (e: React.MouseEvent) => void;
};

// Reusable MenuItem component
const MenuItem: React.FC<MenuItemProps> = ({
  href,
  icon,
  label,
  isActive,
  disabled = false,
  collapsed,
  onClick,
}) => {
  if (disabled) {
    return (
      <div
        className={`flex items-center p-2 rounded-md cursor-not-allowed ${collapsed ? "justify-center" : ""
          } text-gray-400`}
        onClick={onClick}
      >
        <span className="flex items-center relative group">
          <span className="inline-flex items-center justify-center w-6 h-6">
            {icon}
          </span>
          {!collapsed && (
            <span className="ml-3 text-sm font-medium flex items-center justify-between w-full">
              <span>{label}</span>
              <FiAlertCircle className="h-4 w-4 ml-2" />
            </span>
          )}
          {collapsed && (
            <div className="absolute left-full ml-2 whitespace-nowrap bg-gray-800 text-white text-xs rounded py-1 px-2 hidden group-hover:block z-50 w-max">
              {label} - Select a business first
            </div>
          )}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center p-2 rounded-md ${collapsed ? "justify-center" : ""
        } ${isActive
          ? "bg-[#5A67BA]/10 text-[#5A67BA]"
          : "text-gray-700/60 hover:bg-[#5A67BA]/10"
        }`}
    >
      <span className="flex items-center relative group">
        <span className="inline-flex items-center justify-center w-6 h-6">
          {icon}
        </span>
        {!collapsed && (
          <span className="ml-3 text-sm font-medium">{label}</span>
        )}
        {collapsed && !disabled && (
          <div className="absolute left-full ml-2 whitespace-nowrap bg-gray-800 text-white text-xs rounded py-1 px-2 hidden group-hover:block z-50 w-max">
            {label}
          </div>
        )}
      </span>
    </Link>
  );
};

export default function Sidebar() {
  // Use localStorage to persist the collapsed state
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { logout, clientDetails } = useAuth();
  const pathname = usePathname();

  // Extract client and business ID from URL for dynamic routing
  const urlParts = pathname.split("/").filter(Boolean);
  const currentClientId = urlParts.length >= 2 ? urlParts[0] : null;
  const currentBusinessId = urlParts.length >= 2 ? urlParts[1] : null;

  // Check if we're on the business selection page
  const isBusinessSelectionPage = pathname === "/businesses";
  const isSettingsPage = pathname === "/settings";
  
  // Check if a business is selected or retrieve from localStorage
  const [hasSelectedBusiness, setHasSelectedBusiness] = useState<boolean>(false);
  const [lastClientId, setLastClientId] = useState<string | null>(null);
  const [lastBusinessId, setLastBusinessId] = useState<string | null>(null);
  
  // Initialize states from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) {
      setCollapsed(JSON.parse(savedState));
    }
    
    // Retrieve last selected business from localStorage
    const savedClientId = localStorage.getItem("lastClientId");
    const savedBusinessId = localStorage.getItem("lastBusinessId");
    
    if (savedClientId && savedBusinessId) {
      setLastClientId(savedClientId);
      setLastBusinessId(savedBusinessId);
    }
  }, []);
  
  // Save current business selection to localStorage when navigating
  useEffect(() => {
    // Only update if we're on a business-specific page
    if (currentClientId && currentBusinessId && !isBusinessSelectionPage && !isSettingsPage) {
      localStorage.setItem("lastClientId", currentClientId);
      localStorage.setItem("lastBusinessId", currentBusinessId);
      setLastClientId(currentClientId);
      setLastBusinessId(currentBusinessId);
      setHasSelectedBusiness(true);
    }
  }, [currentClientId, currentBusinessId, isBusinessSelectionPage, isSettingsPage]);
  
  // Determine if we have a business selected (either current or from history)
  const effectiveClientId = currentClientId || lastClientId;
  const effectiveBusinessId = currentBusinessId || lastBusinessId;
  const hasBusiness = Boolean(effectiveClientId && effectiveBusinessId);

  // Save state to localStorage when it changes
  const toggleCollapsed = (): void => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  // Function to check if a route is active
  const isActive = (path: string): boolean => {
    if (
      path.includes("[clientId]") &&
      path.includes("[businessId]") &&
      currentClientId &&
      currentBusinessId
    ) {
      const dynamicPath = path
        .replace("[clientId]", currentClientId)
        .replace("[businessId]", currentBusinessId);
      return pathname.includes(dynamicPath);
    }
    return pathname === path;
  };

  // Handle click on disabled menu items
  const handleDisabledClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    // console.log("Please select a business first");
  };

  // Get current business name
  const currentBusiness = hasBusiness
    ? clientDetails?.businesses?.find(
      (biz) => biz.business_id === effectiveBusinessId
    )
    : null;
    
  // Build destination URLs based on effective IDs
  const getDashboardUrl = () => {
    if (hasBusiness) {
      return `/${effectiveClientId}/${effectiveBusinessId}/dashboard`;
    }
    return "/businesses";
  };
  
  const getPostsUrl = () => {
    if (hasBusiness) {
      return `/${effectiveClientId}/${effectiveBusinessId}/posts`;
    }
    return "/businesses";
  };
  
  const getCompetitorsUrl = () => {
    if (hasBusiness) {
      return `/${effectiveClientId}/${effectiveBusinessId}/competitors`;
    }
    return "/businesses";
  };

  return (
    <aside
      className={`bg-[#F1F2F7] border-r border-gray-200 fixed top-0 bottom-0 left-0 flex flex-col ${collapsed ? "w-20 overflow-visible" : "w-60"
        } transition-all duration-300 z-10`}
    >
      {/* Top:  Logo */}
      <div className="h-20 border-b border-gray-200 flex items-center">
        {collapsed ? (
          <div className="p-4 flex justify-center w-full">
            <img
              src="/hyprdata_icon_transparent.svg"
              className="h-10 object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center p-4">
            <img
              src="/hyprdata_logo_transparent.svg"
              className="h-10 object-contain px-2"
            />
          </div>
        )}
      </div>


      {/* Middle: Menu Section with scrolling */}
      <div
        className={`flex-1 ${collapsed ? "" : "overflow-y-auto overflow-x-hidden"
          }`}
      >
        <div className="p-4">
          {!collapsed && (
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-2">
              MENU
            </div>
          )}
          <nav className="space-y-2">
            <MenuItem
              href={getDashboardUrl()}
              icon={<FiGrid />}
              label="Dashboard"
              isActive={isActive("/[clientId]/[businessId]/dashboard")}
              disabled={!hasBusiness && !isSettingsPage}
              collapsed={collapsed}
              onClick={!hasBusiness ? handleDisabledClick : undefined}
            />

            <MenuItem
              href={getPostsUrl()}
              icon={<FiList />}
              label="All Posts"
              isActive={isActive("/[clientId]/[businessId]/posts")}
              disabled={!hasBusiness && !isSettingsPage}
              collapsed={collapsed}
              onClick={!hasBusiness ? handleDisabledClick : undefined}
            />

            <MenuItem
              href={getCompetitorsUrl()}
              icon={<FiUsers />}
              label="Competitors"
              isActive={isActive("/[clientId]/[businessId]/competitors")}
              disabled={!hasBusiness && !isSettingsPage}
              collapsed={collapsed}
              onClick={!hasBusiness ? handleDisabledClick : undefined}
            />
          </nav>
        </div>
      </div>

      {/* Bottom: Others Section - fixed at bottom */}
      <div className="border-t border-gray-200 p-4">
        {!collapsed && (
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-2">
            OTHERS
          </div>
        )}
        <nav className="space-y-2">
          <MenuItem
            href="/settings"
            icon={<FiSettings />}
            label="Settings"
            isActive={isActive("/settings")}
            collapsed={collapsed}
          />

          <div
            onClick={logout}
            className={`flex items-center cursor-pointer p-2 rounded-md ${collapsed ? "justify-center" : ""
              } text-gray-700/60 hover:bg-[#5A67BA]/10`}
          >
            <span className="flex items-center relative group">
              <span className="inline-flex items-center justify-center w-6 h-6">
                <FiLogOut />
              </span>
              {!collapsed && (
                <span className="ml-3 text-sm font-medium">Logout</span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 whitespace-nowrap bg-gray-800 text-white text-xs rounded py-1 px-2 hidden group-hover:block z-50 w-max">
                  Logout
                </div>
              )}
            </span>
          </div>
        </nav>
      </div>

      {/* Change Business Link - only when a business is selected */}
      {hasBusiness && !collapsed && (
        <div className="border-t border-gray-200 p-4">
          <Link
            href="/businesses"
            className="flex items-center justify-between text-gray-800/60 hover:bg-[#5A67BA]/10 p-2 rounded-md text-sm font-medium"
          >
            <span>Change Business</span>
            <FiChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Change Business Icon - when collapsed */}
      {hasBusiness && collapsed && (
        <div className="border-t border-gray-200 p-4 flex justify-center">
          <Link href="/businesses" className="relative group">
            <FiChevronRight className="text-blue-600" />
            <div className="absolute left-full ml-2 whitespace-nowrap bg-[#5A67BA]/10 text-white text-xs rounded py-1 px-2 hidden group-hover:block z-50 w-max">
              Change Business
            </div>
          </Link>
        </div>
      )}

      {/* Middle: Collapse/Expand Control */}
      <div className="absolute -right-3 top-1/2 transform -translate-y-1/2">
        <button
          onClick={toggleCollapsed}
          className="bg-white p-1 rounded-full border border-gray-200 shadow-md flex items-center justify-center"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <FiChevronRight className="text-gray-600" />
          ) : (
            <FiChevronLeft className="text-gray-600" />
          )}
        </button>
      </div>
    </aside>
  );
}