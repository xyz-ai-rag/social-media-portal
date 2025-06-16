"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { Modal, ModalBody } from "flowbite-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [accountDisabled, setAccountDisabled] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, login, logout } = useAuth();

  // Single effect for session-expired + redirect logic
  useEffect(() => {
    const expired = searchParams.get("session_expired") === "true";

    if (expired) {
      setSessionExpired(true);
      setError(
        "Your account was logged in from another device. Please sign in again."
      );

      // Clear both Supabase and our context
      supabase.auth.signOut();
      logout();
    }

    // If auth context is ready, and we have a user (fresh login), redirect
    if (!expired && user && !hasRedirected) {
      setHasRedirected(true);
      router.replace("/businesses");
    }
  }, [searchParams, user, hasRedirected, logout, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAccountDisabled(false);
    setLoading(true);

    try {
      // First check if account is active
      const response = await fetch("/api/auth/validate-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.accountDisabled) {
          setAccountDisabled(true);
          setError(data.error);
          setLoading(false);
          return;
        }
        // For other errors, let normal login flow handle it
      }

      // Proceed with normal login
      const { success, error: loginError } = await login(email, password);
      if (!success) {
        setError(loginError || "Login failed");
        setLoading(false);
        return;
      }
      
      await new Promise((r) => setTimeout(r, 200));
      window.location.href = "/businesses";
    } catch (error) {
      console.error("Login process failed:", error);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // While supabase context is booting, show spinner
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Modal show={true} dismissible={false} size="md" position="center">
        <ModalBody className="pt-6">
          <div className="w-full flex justify-center mb-6">
            <Image
              src="/hyprdata_logo_transparent.svg"
              alt="Logo"
              width={160}
              height={48}
              className="h-12 w-auto"
            />
          </div>

          <h3 className="text-2xl font-bold text-center text-gray-800 mb-4">
            Client Portal
          </h3>

          {sessionExpired && (
            <div className="p-4 mb-4 text-sm text-amber-800 bg-amber-100 rounded-lg">
              <strong>Session expired:</strong> Your account was logged in
              elsewhere.
            </div>
          )}

          {accountDisabled && (
            <div className="p-4 mb-4 text-sm text-red-800 bg-red-100 rounded-lg">
              <strong>Account Disabled:</strong> {error}
            </div>
          )}

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
                className="bg-blue-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5 focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
                required
              />
            </div>

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
                  (error && !sessionExpired && !accountDisabled) ? "border-red-500" : "border-gray-300"
                } text-gray-900 rounded-lg block w-full p-2.5 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="••••••••"
                required
              />
            </div>

            {error && !sessionExpired && !accountDisabled && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <button
              type="submit"
              className="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg py-2"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <div className="text-sm text-center text-gray-500">
              <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>
          </form>
        </ModalBody>
      </Modal>
    </div>
  );
}