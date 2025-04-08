'use client';

import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { FiChevronDown } from 'react-icons/fi';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      {/* Left side (Business Info) */}
      <div className="flex items-center space-x-4">
        {/* Business Logo (small emoji-style) */}
        <div className="bg-orange-100 rounded-full p-2">
          🍔
        </div>

        {/* Business Name */}
        <div className="flex items-center space-x-1">
          <span className="text-gray-800 font-semibold text-sm">Business Name</span>
          <FiChevronDown className="text-gray-500 text-sm" />
        </div>
      </div>

      {/* Split Line */}
      <div className="h-8 border-l border-gray-300 mx-6"></div>

      {/* Right side (Company Name) */}
      <div className="flex items-center">
        <span className="text-gray-800 font-semibold text-sm">Hyprdata.ai</span>
      </div>
    </header>
  );
}
