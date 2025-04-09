'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is logged in, redirect to businesses page
        router.push('/businesses');
      } else {
        // User is not logged in, redirect to login
        router.push('/auth/login');
      }
    }
  }, [loading, user, router]);

  // Simple loading state while deciding where to redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
    </div>
  );
}