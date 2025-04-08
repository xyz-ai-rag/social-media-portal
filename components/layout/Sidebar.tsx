'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FiMenu, FiSettings, FiLogOut, FiGrid, FiList, FiUsers } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();

  return (
    <aside className={`bg-gray-50 border-r border-gray-200 h-screen p-4 flex flex-col ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300`}>
      {/* Top: Client Info */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex-shrink-0 bg-blue-500 text-white rounded-full h-10 w-10 flex items-center justify-center">
          G
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-blue-700">Client Name</div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-2"></div>

      {/* Menu Section */}
      <div className="flex-1">
        <nav className="space-y-2">
          <Link href="/dashboard" className="flex items-center text-gray-700 hover:bg-blue-100 p-2 rounded-md">
            <FiGrid className="text-xl" />
            {!collapsed && <span className="ml-3 text-sm font-medium">Dashboard</span>}
          </Link>
          <Link href="/posts" className="flex items-center text-gray-700 hover:bg-blue-100 p-2 rounded-md">
            <FiList className="text-xl" />
            {!collapsed && <span className="ml-3 text-sm font-medium">All Posts</span>}
          </Link>
          <Link href="/competitors" className="flex items-center text-gray-700 hover:bg-blue-100 p-2 rounded-md">
            <FiUsers className="text-xl" />
            {!collapsed && <span className="ml-3 text-sm font-medium">Competitors</span>}
          </Link>
        </nav>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* Others Section */}
        <nav className="space-y-2">
          <Link href="/settings" className="flex items-center text-gray-700 hover:bg-blue-100 p-2 rounded-md">
            <FiSettings className="text-xl" />
            {!collapsed && <span className="ml-3 text-sm font-medium">Settings</span>}
          </Link>
          <button onClick={logout} className="flex items-center w-full text-gray-700 hover:bg-blue-100 p-2 rounded-md">
            <FiLogOut className="text-xl" />
            {!collapsed && <span className="ml-3 text-sm font-medium">Logout</span>}
          </button>
        </nav>
      </div>

      {/* Bottom: Collapse/Expand Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full text-gray-600 hover:text-gray-900"
        >
          <FiMenu className="text-2xl" />
        </button>
      </div>
    </aside>
  );
}
