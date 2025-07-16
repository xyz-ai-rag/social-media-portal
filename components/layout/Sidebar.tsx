import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  FiChevronLeft,
  FiChevronRight,
  FiSettings,
  FiLogOut,
  FiGrid,
  FiList,
  FiUsers,
  FiAlertCircle,
  FiBarChart,
  FiTrendingUp,
} from "react-icons/fi";
import { TbReportAnalytics } from "react-icons/tb";
import { IoAnalyticsOutline } from "react-icons/io5";

import { useAuth } from "@/context/AuthContext";
import { useBusinessSelection } from "@/hooks/useBusinesSelction";

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
  const [isClient, setIsClient] = useState(false);
  const { logout, clientDetails } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Use the shared business selection hook
  const { selectedBusinessId } = useBusinessSelection();
  
  // Force re-render when URL changes by including pathname in dependency
  const [currentPath, setCurrentPath] = useState(pathname);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  useEffect(() => {
    setCurrentPath(pathname);
    // Force re-render when pathname or search params change
    setForceUpdate(prev => prev + 1);
  }, [pathname, searchParams]);

  // Handle client-side hydration and localStorage
  useEffect(() => {
    setIsClient(true);
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState) {
      setCollapsed(JSON.parse(savedState));
    }
  }, []);
  // Get client and business IDs using the shared hook
  const effectiveClientId = clientDetails?.id || null;
  const effectiveBusinessId = selectedBusinessId; // Use selected business from hook

  // Check if we're on special pages
  const isBusinessSelectionPage = pathname === "/businesses";
  const isSettingsPage = pathname === "/settings";

  // Get user permissions from clientDetails with safe defaults
  const canViewClientReporting = clientDetails?.can_view_client_reporting || false;
  const canViewBusinessReporting = clientDetails?.can_view_business_reporting || false;

  // Simple permission logic:
  // - can_view_client_reporting = true -> show Brand Overview, Monthly KPIs, Business Reporting
  // - can_view_business_reporting = true -> show Dashboard, All Posts, Analysis, Competitors, Monthly KPIs
  // - If only client reporting (no business reporting) -> don't show business selection

  // Determine if we need business selection
  const needsBusinessSelection = canViewBusinessReporting;
  const hasBusiness = Boolean(effectiveClientId && effectiveBusinessId);
  const hasBusinesses = Boolean(clientDetails?.businesses && clientDetails.businesses.length > 0);

  // Save state to localStorage when it changes
  const toggleCollapsed = (): void => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  // Function to check if a route is active (simplified)
  const isActive = (path: string): boolean => {
    // For monthly-kpis, check both pathname and level parameter
    if (path.includes("monthly-kpis")) {
      const isMonthlyKpisPath = pathname.includes('/monthly-kpis');
      if (!isMonthlyKpisPath) return false;
      
      // Get the current level from URL - check if window exists first
      let currentLevel = 'business'; // default
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        currentLevel = urlParams.get('level') || 'business';
      } else {
        // Fallback to searchParams hook for SSR
        currentLevel = searchParams.get('level') || 'business';
      }
      
      // Debug logging (remove in production)
      if (typeof window !== 'undefined') {
        console.log('isActive debug:', {
          path,
          currentLevel,
          isClientPath: path.includes("client-monthly-kpis"),
          isBusinessPath: path.includes("business-monthly-kpis"),
          shouldBeActive: path.includes("client-monthly-kpis") ? currentLevel === 'client' : currentLevel === 'business'
        });
      }
      
      // Determine which level this menu item represents and match correctly
      if (path.includes("client-monthly-kpis")) {
        // This is the BRAND section Monthly KPIs - should be active when level=client
        return currentLevel === 'client';
      } else if (path.includes("business-monthly-kpis")) {
        // This is the BUSINESS section Monthly KPIs - should be active when level=business
        return currentLevel === 'business';
      }
      
      return false;
    }
    
    // Simple pathname matching for other routes
    if (path.includes("[clientId]/business-overview")) {
      return pathname === `/${effectiveClientId}/business-overview`;
    }
    if (path.includes("[clientId]/[businessId]/business-reporting")) {
      return pathname === `/${effectiveClientId}/${effectiveBusinessId}/business-reporting`;
    }
    if (path.includes("[clientId]/[businessId]/dashboard")) {
      return pathname === `/${effectiveClientId}/${effectiveBusinessId}/dashboard`;
    }
    if (path.includes("[clientId]/[businessId]/posts")) {
      return pathname === `/${effectiveClientId}/${effectiveBusinessId}/posts`;
    }
    if (path.includes("[clientId]/[businessId]/topic-analysis")) {
      return pathname === `/${effectiveClientId}/${effectiveBusinessId}/topic-analysis`;
    }
    if (path.includes("[clientId]/[businessId]/city-topic-analysis")) {
      return pathname === `/${effectiveClientId}/${effectiveBusinessId}/city-topic-analysis`;
    }
    if (path.includes("[clientId]/[businessId]/competitors")) {
      return pathname === `/${effectiveClientId}/${effectiveBusinessId}/competitors`;
    }
    return pathname === path;
  };

  // Handle click on disabled menu items
  const handleDisabledClick = (e: React.MouseEvent): void => {
    e.preventDefault();
  };

  // Build destination URLs
  const getClientOverviewUrl = () => `/${effectiveClientId}/business-overview`;
  const getBusinessReportingUrl = () => `/${effectiveClientId}/${effectiveBusinessId}/business-reporting`;
  const getClientMonthlyKPIsUrl = () => `/${effectiveClientId}/${effectiveBusinessId}/monthly-kpis?level=client`;
  const getBusinessMonthlyKPIsUrl = () => `/${effectiveClientId}/${effectiveBusinessId}/monthly-kpis?level=business`;
  const getDashboardUrl = () => `/${effectiveClientId}/${effectiveBusinessId}/dashboard`;
  const getPostsUrl = () => `/${effectiveClientId}/${effectiveBusinessId}/posts`;
  const getCompetitorsUrl = () => `/${effectiveClientId}/${effectiveBusinessId}/competitors`;
  const getAnalyticsUrl = () => `/${effectiveClientId}/${effectiveBusinessId}/topic-analysis`;
  const getCityAnalyticsUrl = () => `/${effectiveClientId}/${effectiveBusinessId}/city-topic-analysis`;

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutModal(false);
  };

  return (
    <>
      <aside
        className={`bg-[#F1F2F7] border-r border-gray-200 fixed top-0 bottom-0 left-0 flex flex-col ${collapsed ? "w-20" : "w-60"
          } transition-all duration-300 z-10`}
      >
        {/* Top: Logo */}
        <div className="h-20 border-b border-gray-200 flex items-center">
          {collapsed ? (
            <Link href="/businesses" className="p-4 flex justify-center w-full hover:bg-gray-100 transition-colors duration-150">
              <img
                src="/hyprdata_icon_transparent.svg"
                className="h-10 object-contain cursor-pointer"
              />
            </Link>
          ) : (
            <Link href="/businesses" className="flex items-center p-4 w-full hover:bg-gray-100 transition-colors duration-150">
              <img
                src="/hyprdata_logo_transparent.svg"
                className="h-10 object-contain px-2 cursor-pointer"
              />
            </Link>
          )}
        </div>

        {/* Middle: Menu Section - removed scrolling */}
        <div className="flex-1">
          <div className="p-4">
            {/* Brand Section */}
            {canViewClientReporting && (
              <>
                {!collapsed && (
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-2">
                    Brand Portfolio
                  </div>
                )}
                <nav className="space-y-2">
                  <MenuItem
                    href={getClientOverviewUrl()}
                    icon={<FiBarChart />}
                    label="Brand Overview"
                    isActive={isActive("/[clientId]/business-overview")}
                    disabled={!effectiveClientId}
                    collapsed={collapsed}
                    onClick={!effectiveClientId ? handleDisabledClick : undefined}
                  />

                  <MenuItem
                    href={getClientMonthlyKPIsUrl()}
                    icon={<FiTrendingUp />}
                    label="Monthly KPIs"
                    isActive={isActive("/[clientId]/[businessId]/client-monthly-kpis")}
                    disabled={!hasBusiness && needsBusinessSelection}
                    collapsed={collapsed}
                    onClick={(!hasBusiness && needsBusinessSelection) ? handleDisabledClick : undefined}
                  />

                  {/* Hide Business Reporting when can_view_business_reporting is true */}
                  {!canViewBusinessReporting && (
                    <MenuItem
                      href={getBusinessReportingUrl()}
                      icon={<TbReportAnalytics />}
                      label="Business Reporting"
                      isActive={isActive("/[clientId]/[businessId]/business-reporting")}
                      disabled={!hasBusiness && needsBusinessSelection}
                      collapsed={collapsed}
                      onClick={(!hasBusiness && needsBusinessSelection) ? handleDisabledClick : undefined}
                    />
                  )}
                </nav>
              </>
            )}

            {/* Business Section */}
            {canViewBusinessReporting && (
              <>
                {!collapsed && (
                  <div className={`text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-2 ${canViewClientReporting ? 'mt-6' : ''}`}>
                    BUSINESS
                  </div>
                )}
                <nav className="space-y-2">
                  <MenuItem
                    href={getDashboardUrl()}
                    icon={<FiGrid />}
                    label="Dashboard"
                    isActive={isActive("/[clientId]/[businessId]/dashboard")}
                    disabled={!hasBusiness}
                    collapsed={collapsed}
                    onClick={!hasBusiness ? handleDisabledClick : undefined}
                  />

                  <MenuItem
                    href={getAnalyticsUrl()}
                    icon={<IoAnalyticsOutline />}
                    label="Topic Analysis"
                    isActive={isActive("/[clientId]/[businessId]/topic-analysis")}
                    disabled={!hasBusiness}
                    collapsed={collapsed}
                    onClick={!hasBusiness ? handleDisabledClick : undefined}
                  />

                  <MenuItem
                    href={getCityAnalyticsUrl()}
                    icon={<IoAnalyticsOutline />}
                    label="City Topic Analysis"
                    isActive={isActive("/[clientId]/[businessId]/city-topic-analysis")}
                    disabled={!hasBusiness}
                    collapsed={collapsed}
                    onClick={!hasBusiness ? handleDisabledClick : undefined}
                  />
                  
                  {/* Add Monthly KPIs to Business section as well */}
                  <MenuItem
                    href={getBusinessMonthlyKPIsUrl()}
                    icon={<FiTrendingUp />}
                    label="Monthly KPIs"
                    isActive={isActive("/[clientId]/[businessId]/business-monthly-kpis")}
                    disabled={!hasBusiness}
                    collapsed={collapsed}
                    onClick={!hasBusiness ? handleDisabledClick : undefined}
                  />
                  
                  <MenuItem
                    href={getPostsUrl()}
                    icon={<FiList />}
                    label="All Posts"
                    isActive={isActive("/[clientId]/[businessId]/posts")}
                    disabled={!hasBusiness}
                    collapsed={collapsed}
                    onClick={!hasBusiness ? handleDisabledClick : undefined}
                  />

                  <MenuItem
                    href={getCompetitorsUrl()}
                    icon={<FiUsers />}
                    label="Competitors"
                    isActive={isActive("/[clientId]/[businessId]/competitors")}
                    disabled={!hasBusiness}
                    collapsed={collapsed}
                    onClick={!hasBusiness ? handleDisabledClick : undefined}
                  />

                </nav>
              </>
            )}
          </div>
        </div>

        {/* Bottom: Others Section */}
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
              onClick={handleLogout}
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

        {/* Collapse/Expand Control */}
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

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
            <h3 className="mb-5 text-lg font-normal text-gray-700">
              Logout?
            </h3>
            <p className="text-sm text-gray-500 mb-7">
              Are you sure you want to logout?
            </p>
            <div className="flex justify-center gap-4 px-8">
              <button
                onClick={confirmLogout}
                className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 w-32"
              >
                Yes, logout
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 w-32"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}