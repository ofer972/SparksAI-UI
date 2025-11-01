'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ApiService } from '@/lib/api';
import { User } from '@/lib/config';

// Re-export User type for convenience
export type { User };

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiService = new ApiService();
      const userData = await apiService.getCurrentUser();
      // Debug: Log the actual user data structure from API
      console.log('Current user data from API:', userData);
      setUser(userData);
    } catch (err) {
      console.error('Error fetching current user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch current user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, refetch: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Custom hook to access the current user throughout the application.
 * 
 * @returns Object containing user data, loading state, error state, and refetch function
 * @throws Error if used outside of UserProvider
 * 
 * @example
 * ```tsx
 * const { user, loading, error } = useUser();
 * if (user) {
 *   console.log('Current user ID:', user.id);
 *   console.log('Current user name:', user.name);
 * }
 * ```
 */
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

/**
 * Convenience hook to get just the current user ID.
 * 
 * @returns The user ID (string | number | null), or null if not loaded/error
 * @throws Error if used outside of UserProvider
 * 
 * @example
 * ```tsx
 * const userId = useUserId();
 * if (userId) {
 *   console.log('User ID:', userId);
 * }
 * ```
 */
export function useUserId(): string | number | null {
  const { user } = useUser();
  if (user?.user_id) {
    return user.user_id;
  }
  // Fallback for backward compatibility
  if (user?.id) {
    return user.id;
  }
  return null;
}
