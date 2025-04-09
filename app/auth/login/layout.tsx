
'use client';
import { ReactNode } from 'react';
// This creates a separate layout for all auth pages
export default function AuthLayout({ children }: { children: ReactNode }){
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-gray-50">
      {children}
    </div>
  );
}