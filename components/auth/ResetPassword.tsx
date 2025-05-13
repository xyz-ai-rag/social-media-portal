"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  
  const router = useRouter();

  // This effect disables the auth state change listener temporarily
  // to prevent automatic sign-out during the reset process
  useEffect(() => {
    // Set a flag in localStorage to indicate we're on reset page
    localStorage.setItem('is_password_reset_flow', 'true');
    
    return () => {
      // Clean up the flag when component unmounts
      localStorage.removeItem('is_password_reset_flow');
    };
  }, []);

  // Process the token when the component mounts
  useEffect(() => {
    const processToken = async () => {
    //   console.log("Starting token processing...");
      setIsProcessingToken(true);
      
      try {
        // Extract token from URL hash or query params
        let token = null;
        let type = null;
        
        if (typeof window !== 'undefined') {
          const fullUrl = window.location.href;
        //   console.log("Processing URL:", fullUrl);
          
          // First check if we already have a valid session
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            // console.log("Valid session already exists");
            setHasValidSession(true);
            setIsProcessingToken(false);
            return;
          }
          
          // Get hash and search params
          const hash = window.location.hash;
          const search = window.location.search;
          
        //   console.log("Hash:", hash, "Search:", search);
          
          // Try to extract token from hash
          if (hash && hash.includes('access_token')) {
            try {
              const hashParams = new URLSearchParams(hash.substring(1));
              token = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token') || '';
              type = hashParams.get('type');
              
              // Store for persistence
              if (token) {
                localStorage.setItem('supabase_reset_token', token);
                if (refreshToken) {
                  localStorage.setItem('supabase_reset_refresh_token', refreshToken);
                }
              }
            } catch (err) {
              console.error('Error parsing hash:', err);
            }
          }
          
          // If no token in hash, try query params
          if (!token && search) {
            try {
              const searchParams = new URLSearchParams(search);
              const queryToken = searchParams.get('token') || searchParams.get('access_token');
              if (queryToken) {
                token = queryToken;
                type = 'recovery';
              }
            } catch (err) {
              console.error('Error parsing search params:', err);
            }
          }
          
          // If we found a token, try to use it
          if (token) {
            // console.log("Found token, attempting to use it");
            
            try {
              // IMPORTANT: Disable auth listeners before setting session
              const prevEventListeners = disableAuthListeners();
              
              // Try OTP verification first (more reliable for reset)
              try {
                const { data, error } = await supabase.auth.verifyOtp({
                  token_hash: token,
                  type: 'recovery',
                });
                
                if (error) {
                  console.error("OTP verification failed:", error);
                } else if (data.session) {
                //   console.log("Successfully verified OTP");
                  setHasValidSession(true);
                  setIsProcessingToken(false);
                  
                  // Clean URL without redirecting
                  window.history.replaceState({}, document.title, "/auth/reset-password");
                  
                  // Restore listeners
                  restoreAuthListeners(prevEventListeners);
                  return;
                }
              } catch (err) {
                console.error("OTP verification error:", err);
              }
              
              // If OTP fails, try direct session setting
              try {
                const { data, error } = await supabase.auth.setSession({
                  access_token: token,
                  refresh_token: localStorage.getItem('supabase_reset_refresh_token') || '',
                });
                
                if (error) {
                  console.error("Session setting failed:", error);
                } else if (data.session) {
                //   console.log("Successfully set session directly");
                  setHasValidSession(true);
                  setIsProcessingToken(false);
                  
                  // Clean URL without redirecting
                  window.history.replaceState({}, document.title, "/auth/reset-password");
                  
                  // Restore listeners
                  restoreAuthListeners(prevEventListeners);
                  return;
                }
              } catch (err) {
                console.error("Session setting error:", err);
              }
              
              // Restore listeners if both methods fail
              restoreAuthListeners(prevEventListeners);
            } catch (err) {
              console.error("Error in token processing:", err);
            }
          }
          
          // If we reach here, the token processing failed
          setError("Your reset link has expired. Please request a new password reset link.");
        }
      } catch (err) {
        console.error('Error in processToken:', err);
        setError('An error occurred. Please request a new password reset link.');
      } finally {
        setIsProcessingToken(false);
      }
    };
    
    processToken();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    setLoading(true);
    
    try {
      // Check for valid session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        setError("Your session has expired. Please request a new password reset link.");
        setLoading(false);
        return;
      }
      
      // Disable auth listeners during password update
      const prevEventListeners = disableAuthListeners();
      
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      // Restore auth listeners
      restoreAuthListeners(prevEventListeners);
      
      if (error) {
        console.error("Password update error:", error);
        setError(error.message);
      } else {
        // Clean up
        localStorage.removeItem('supabase_reset_token');
        localStorage.removeItem('supabase_reset_refresh_token');
        localStorage.removeItem('is_password_reset_flow');
        
        setMessage("Password has been successfully reset! Redirecting to login...");
        
        // Sign out and redirect
        await supabase.auth.signOut();
        
        setTimeout(() => {
          router.replace("/auth/login");
        }, 2000);
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to temporarily disable auth event listeners
  function disableAuthListeners() {
    try {
      // Try to access _supabaseClient and its listeners
      // @ts-ignore - Accessing internal property
      const client = supabase._supabaseClient;
      if (client && client.auth && client.auth.onAuthStateChange) {
        // @ts-ignore - Accessing internal property
        const listeners = client.auth.listenersCount;
        // console.log("Temporarily disabling auth listeners");
        // @ts-ignore - Accessing internal property
        client.auth.listenersCount = 0;
        return listeners;
      }
    } catch (err) {
      console.error("Failed to disable auth listeners:", err);
    }
    return null;
  }

  // Helper function to restore auth event listeners
  function restoreAuthListeners(prevListeners: any) {
    try {
      if (prevListeners !== null) {
        // @ts-ignore - Accessing internal property
        const client = supabase._supabaseClient;
        if (client && client.auth) {
        //   console.log("Restoring auth listeners");
          // @ts-ignore - Accessing internal property
          client.auth.listenersCount = prevListeners;
        }
      }
    } catch (err) {
      console.error("Failed to restore auth listeners:", err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-700/20 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
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
            Set New Password
          </h3>
          
          <p className="text-center text-gray-600 mb-6">
            Please enter your new password below.
          </p>

          {isProcessingToken && (
            <div className="flex flex-col items-center justify-center my-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-r-transparent mb-4" />
              <p className="text-sm text-gray-600">Processing your reset link...</p>
            </div>
          )}

          {message && (
            <div className="p-4 mb-4 text-sm text-green-800 bg-green-100 rounded-lg">
              {message}
            </div>
          )}

          {!isProcessingToken && (
            <>
              {error ? (
                <>
                  <div className="p-4 mb-4 text-sm text-red-600 bg-red-50 rounded-lg">
                    {error}
                  </div>
                  <div className="text-center mt-4">
                    <Link 
                      href="/auth/forgot-password" 
                      className="inline-block px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      Request a new password reset link
                    </Link>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="password"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      New Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-blue-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      disabled={!hasValidSession}
                    />
                  </div>
                  
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-blue-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      disabled={!hasValidSession}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg py-2"
                    disabled={loading || !hasValidSession}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}