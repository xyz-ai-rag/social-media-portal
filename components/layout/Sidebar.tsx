'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { FiChevronLeft, FiChevronRight, FiSettings, FiLogOut, FiGrid, FiList, FiUsers } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  // Use localStorage to persist the collapsed state
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const pathname = usePathname();
  
  // Initialize state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setCollapsed(JSON.parse(savedState));
    }
  }, []);
  
  // Save state to localStorage when it changes
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  // Function to check if a route is active
  const isActive = (path: string): boolean => {
    return pathname === path;
  };

  return (
    <aside className={`bg-gray-50 border-r border-gray-200 fixed top-0 bottom-0 left-0 flex flex-col ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 z-10`}>
      {/* Top: Client Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 bg-blue-500 text-white rounded-full h-10 w-10 flex items-center justify-center">
            G
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold text-blue-700">Client Name</div>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Menu Section with scrolling */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {!collapsed && (
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-2">
              MENU
            </div>
          )}
          <nav className="space-y-2">
            <Link href="/dashboard" 
              className={`flex items-center p-2 rounded-md ${
                isActive('/dashboard') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:bg-blue-50'
              }`}
            >
              <FiGrid className="text-xl" />
              {!collapsed && <span className="ml-3 text-sm font-medium">Dashboard</span>}
            </Link>
            <Link href="/posts" 
              className={`flex items-center p-2 rounded-md ${
                isActive('/posts') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:bg-blue-50'
              }`}
            >
              <FiList className="text-xl" />
              {!collapsed && <span className="ml-3 text-sm font-medium">All Posts</span>}
            </Link>
            <Link href="/competitors" 
              className={`flex items-center p-2 rounded-md ${
                isActive('/competitors') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:bg-blue-50'
              }`}
            >
              <FiUsers className="text-xl" />
              {!collapsed && <span className="ml-3 text-sm font-medium">Competitors</span>}
            </Link>
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
          <Link href="/settings" 
            className={`flex items-center p-2 rounded-md ${
              isActive('/settings') 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-700 hover:bg-blue-50'
            }`}
          >
            <FiSettings className="text-xl" />
            {!collapsed && <span className="ml-3 text-sm font-medium">Settings</span>}
          </Link>
          <button 
            onClick={logout} 
            className="flex items-center w-full text-gray-700 hover:bg-blue-50 p-2 rounded-md"
          >
            <FiLogOut className="text-xl" />
            {!collapsed && <span className="ml-3 text-sm font-medium">Logout</span>}
          </button>
        </nav>
      </div>

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