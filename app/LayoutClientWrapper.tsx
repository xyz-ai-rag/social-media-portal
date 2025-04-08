'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { ReactNode } from 'react';

export default function LayoutClientWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  if (isAuthPage) {
    return <>{children}</>; // Only return page (no header/sidebar) for /auth
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar /> {/* Left Sidebar */}
      <div className="flex flex-col flex-1">
        <Header /> {/* Top Header */}
        <main className="flex-grow p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
