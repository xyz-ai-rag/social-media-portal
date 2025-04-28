"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoginPage from "../auth/login/page";
import Link from "next/link";

export default function Home() {
  const { user, loading, clientDetails } = useAuth();
  const router = useRouter();

  // If we're not loading and the user is not logged in, redirect to login
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, user, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  // If the user is not logged in, directly show the login page
  if (!user) {
    return <LoginPage />;
  }

  // If the user is logged in but has no businesses, show an error
  if (
    !clientDetails ||
    !clientDetails.businesses ||
    clientDetails.businesses.length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="text-xl font-semibold mb-4">No Businesses Found</h2>
          <p className="mb-6">
            Your account is authenticated, but we couldn't find any associated
            business data. This might happen if your account was recently
            created.
          </p>
          <p className="text-gray-600">
            Please contact support at{" "}
            <span className="font-medium">support@hyprdata.ai</span> for
            assistance.
          </p>
        </div>
      </div>
    );
  }

  // If the user is logged in and has businesses, show a business selection screen
  // NOTE: Removed the duplicate header that was causing issues
  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="rounded-lg bg-white shadow px-5 py-6 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Select a Business
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Please select a business to view its dashboard:
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {clientDetails.businesses
              .sort((a, b) => a.business_name.localeCompare(b.business_name))
              .map((business) => (
                <Link
                  href={`/${clientDetails.id}/${business.business_id}/dashboard`}
                  key={business.business_id}
                >
                  <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                          <span className="text-blue-700 text-xl">
                            {business.business_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-5">
                          <h3 className="text-lg leading-6 font-medium text-gray-900">
                            {business.business_name}
                          </h3>
                          <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            {business.business_city || ""}
                            {business.business_type &&
                              business.business_city &&
                              " | "}
                            {business.business_type || ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-4 sm:px-6">
                      <div className="text-sm text-blue-600 font-medium">
                        View Dashboard →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
