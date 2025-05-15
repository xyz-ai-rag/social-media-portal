"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      // Get the current origin for the redirect URL
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      // Supabase password reset request
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      });

      if (error) {
        console.error("Password reset error:", error);
        setError(error.message);
      } else {
        setMessage(
          "Password reset link sent! Check your email inbox and follow the link to reset your password."
        );
        setEmail(""); // Clear the email field after successful submission
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-700/20 flex items-center justify-center p-4">
      {/* Custom modal instead of using Flowbite to fix styling issues */}
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        {/* Modal body */}
        <div className="p-6">
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
            Reset Password
          </h3>
          
          <p className="text-center text-gray-600 mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {message && (
            <div className="p-4 mb-4 text-sm text-green-800 bg-green-100 rounded-lg">
              {message}
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
                className={`bg-blue-50 border ${
                  error ? "border-red-500" : "border-gray-300"
                } text-gray-900 rounded-lg block w-full p-2.5 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="you@example.com"
                required
              />
            </div>

            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg py-2"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="text-sm text-center text-gray-500">
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}