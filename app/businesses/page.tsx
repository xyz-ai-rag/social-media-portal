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
            Your account is authenticated, but we couldn&apos;t find any associated
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

  // Get user permissions
  const canViewClientReporting = clientDetails.can_view_client_reporting || false;
  const canViewBusinessReporting = clientDetails.can_view_business_reporting || false;

  // If user has no permissions at all
  if (!canViewClientReporting && !canViewBusinessReporting) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="text-xl font-semibold mb-4">Access Restricted</h2>
          <p className="mb-6">
            Your account doesn&apos;t have permission to view any reporting features.
          </p>
          <p className="text-gray-600">
            Please contact your administrator or support at{" "}
            <span className="font-medium">support@hyprdata.ai</span> for
            assistance.
          </p>
        </div>
      </div>
    );
  }

  // Show selection screen for users who have any reporting permissions
  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="rounded-lg bg-white shadow px-5 py-6 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Welcome to Your Dashboard
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Choose how you'd like to view your data:
          </p>

          {/* Client-level overview option (only show if user has client reporting permissions) */}
          {canViewClientReporting && (
            <div className="mb-8">
              <h3 className="text-md font-medium text-gray-800 mb-3">Client Overview</h3>
              <Link href={`/${clientDetails.id}/business-overview`}>
                <div className="bg-blue-50 border border-blue-200 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                        <span className="text-white text-xl">📊</span>
                      </div>
                      <div className="ml-5">
                        <h4 className="text-lg leading-6 font-medium text-gray-900">
                          View All Businesses Combined
                        </h4>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                          See aggregated data and insights across all your businesses
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-100 px-4 py-4 sm:px-6">
                    <div className="text-sm text-blue-700 font-medium">
                      View Client Overview →
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Individual business selection (only show if user has business reporting permissions) */}
          {canViewBusinessReporting && (
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Individual Business Analysis</h3>
              <p className="text-sm text-gray-500 mb-4">
                Select a specific business to view detailed analytics:
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
                            <div className="flex-shrink-0 bg-gray-100 rounded-md p-3">
                              <span className="text-gray-700 text-xl">
                                {business.business_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-5">
                              <h4 className="text-lg leading-6 font-medium text-gray-900">
                                {business.business_name}
                              </h4>
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
                            View Business Dashboard →
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}