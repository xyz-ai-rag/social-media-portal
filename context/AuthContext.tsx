'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { constructVercelURL } from "@/utils/generateURL";
interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

interface Business {
  business_id: string;
  business_name: string;
  search_keywords: string[];
  business_city: string;
  business_type: string;
  similar_businesses: string[];
}

interface ClientDetails {
  id: string;
  client_name: string;
  registered_email: string;
  businesses: Business[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  clientDetails: ClientDetails | null;
  login: (email: string, password: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [clientDetails, setClientDetails] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch client details from our API based on user email.
  const fetchClientDetails = async (email: string) => {
    try {
      const response = await fetch(constructVercelURL(`/api/client-details?email=${encodeURIComponent(email)}`));
      const data = await response.json();
      if (response.ok) {
        setClientDetails(data);
      } else {
        console.error('Error fetching client details:', data.error);
      }
    } catch (error: any) {
      console.error('Error fetching client details:', error.message);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user as User);
        // Guard: Check if email exists before calling fetchClientDetails.
        if (session.user.email) {
          fetchClientDetails(session.user.email);
        }
      } else {
        setUser(null);
        setClientDetails(null);
      }
      setLoading(false);
    });

    // Check for an existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user as User);
        if (session.user.email) {
          fetchClientDetails(session.user.email);
        }
      }
      setLoading(false);
    };
    
    checkSession();

    // Cleanup: unsubscribe the listener on unmount.
    return () => {
      if (data && data.subscription) {
        data.subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // Auth state change listener will trigger and fetch client details.
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/auth/login');
    } catch (error: any) {
      console.error('Error logging out:', error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, clientDetails, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
