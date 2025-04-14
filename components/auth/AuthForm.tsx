"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { Modal, ModalBody } from "flowbite-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [openModal, setOpenModal] = useState(true);

  const router = useRouter();
  const { login, user } = useAuth();

  useEffect(() => {
    // Check if user is already logged in
    if (user) {
      // Redirect to businesses selection page rather than dashboard
      router.push("/businesses");
    } else {
      setAuthLoading(false);
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { success, error } = await login(email, password);
      if (!success) {
        throw new Error(error || "Failed to login");
      }
      // Redirect to businesses selection page on successful login
      router.push("/businesses");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Modal
        show={openModal}
        dismissible={false}
        size="md"
        position="center"
        onClose={() => setOpenModal(false)}
        popup={false}
        theme={{
          root: {
            base: "fixed top-0 right-0 left-0 z-50 h-modal h-screen overflow-y-auto overflow-x-hidden md:inset-0 md:h-full",
            show: {
              on: "flex bg-black bg-opacity-50 backdrop-blur-sm dark:bg-opacity-80",
            },
          },
          content: {
            base: "relative h-full w-full p-4 md:h-auto",
            inner:
              "relative rounded-lg bg-white shadow dark:bg-gray-700 flex flex-col max-h-[90vh]",
          },
          header: {
            base: "flex items-start justify-between rounded-t border-b p-5 dark:border-gray-600",
            title: "text-xl font-medium text-gray-900 dark:text-white",
            close: {
              base: "ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white hidden",
              icon: "h-5 w-5",
            },
          },
        }}
      >
        <ModalBody className="pt-6">
          <div className="w-full flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Hyprdata.ai Logo"
              width={160}
              height={48}
              className="h-12 w-auto"
            />
          </div>

          <div className="space-y-6 px-6 pb-4 sm:pb-6 lg:px-8 xl:pb-8">
            <h3 className="text-2xl font-bold text-center text-gray-800">
              Sign in to Social Media Portal
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-blue-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm font-medium">{error}</div>
              )}

              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`bg-blue-50 border ${
                    error ? "border-red-500" : "border-gray-300"
                  } text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5`}
                  placeholder="••••••••••"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 text-sm font-medium text-gray-900"
                >
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <div className="text-sm font-medium text-center text-gray-500">
                <Link
                  href="/auth/forgot-password"
                  className="text-blue-600 hover:underline"
                >
                  I seem to have forgotten my password
                </Link>
              </div>
            </form>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}
