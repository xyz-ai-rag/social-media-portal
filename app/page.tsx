'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    } else if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  // This content will briefly flash before redirect happens
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h1 className="text-4xl font-bold mb-8 text-center">Welcome to Social Media Portal</h1>
      <p className="text-xl mb-8 text-center max-w-2xl">
        Your centralized platform for social media analytics, business posts, and performance reports.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link href="/dashboard" className="btn btn-primary">
          View Dashboard
        </Link>
        <Link href="/posts" className="btn btn-primary">
          Business Posts
        </Link>
        <Link href="/reports" className="btn btn-primary">
          Email Reports
        </Link>
      </div>
    </div>
  );
}