'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
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
  // TODO: Remove temporary hardcoded user and restore API call to getCurrentUser
  const [user, setUser] = useState<User | null>({
    user_id: 'admin',
    user_name: 'admin',
    user_type: 'Admin',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    // TODO: Restore API call to getCurrentUser when ready
    // No-op for now
  };

  return (
    <UserContext.Provider value={{ user, loading, error, refetch }}>
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
