'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { ReactNode, useState, useEffect } from 'react';

export default function LayoutClientWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Check sidebar collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Listen for changes to localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState !== null) {
        setSidebarCollapsed(JSON.parse(savedState));
      }
    };

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Also set up an interval to check for changes (for same-window updates)
    const interval = setInterval(() => {
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState !== null && JSON.parse(savedState) !== sidebarCollapsed) {
        setSidebarCollapsed(JSON.parse(savedState));
      }
    }, 200);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [sidebarCollapsed]);

  // Let the auth layout handle auth pages with its own styling
  if (isAuthPage) {
    return <>{children}</>; 
  }

  // Main app layout for non-auth pages
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar /> {/* Left Sidebar */}
      <div 
        className={`${sidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}
      >
        <Header /> {/* Top Header */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}