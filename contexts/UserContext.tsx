'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@/lib/config';
import { getCurrentUser } from '@/lib/auth';
import { 
  getUserPreferences, 
  updateUserPreferences, 
  UserPreferences, 
  UpdatePreferencesRequest 
} from '@/lib/api';

// Re-export User type for convenience
export type { User };

// Re-export preferences types
export type { UserPreferences, UpdatePreferencesRequest };

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Preferences
  preferences: UserPreferences | null;
  preferencesLoading: boolean;
  preferencesError: string | null;
  fetchPreferences: () => Promise<void>;
  savePreferences: (prefs: UpdatePreferencesRequest) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState<boolean>(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    console.log('[UserContext] Fetching current user from JWT token');
    setLoading(true);
    setError(null);
    try {
      const currentUser = getCurrentUser();
      console.log('[UserContext] Current user from token:', currentUser);
      if (currentUser) {
        // Map the token payload to User interface
        const mappedUser = {
          user_id: currentUser.id || '',
          id: currentUser.id,
          user_name: currentUser.name || currentUser.email || 'User',
          name: currentUser.name,
          email: currentUser.email,
          user_type: 'User', // Default type, can be enhanced if token has role info
        };
        console.log('[UserContext] Setting user state:', mappedUser);
        setUser(mappedUser);
      } else {
        console.log('[UserContext] No user found in JWT token');
        setUser(null);
        setError('No user logged in');
      }
    } catch (err: any) {
      console.error('[UserContext] Failed to get current user:', err);
      setError(err.message || 'Failed to get user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  const fetchPreferences = useCallback(async () => {
    if (!user?.user_id && !user?.id) {
      console.log('[UserContext] Cannot fetch preferences - no user ID');
      return;
    }
    
    const userId = String(user.user_id || user.id);
    console.log('[UserContext] Fetching preferences for user:', userId);
    setPreferencesLoading(true);
    setPreferencesError(null);
    
    try {
      const prefs = await getUserPreferences(userId);
      console.log('[UserContext] Preferences fetched:', prefs);
      setPreferences(prefs);
    } catch (err: any) {
      console.error('[UserContext] Failed to fetch user preferences:', err);
      setPreferencesError(err.message || 'Failed to fetch preferences');
    } finally {
      setPreferencesLoading(false);
    }
  }, [user]);

  const savePreferences = useCallback(async (prefs: UpdatePreferencesRequest) => {
    if (!user?.user_id && !user?.id) {
      throw new Error('No user logged in');
    }
    
    const userId = String(user.user_id || user.id);
    setPreferencesLoading(true);
    setPreferencesError(null);
    
    try {
      const updated = await updateUserPreferences(userId, prefs);
      setPreferences(updated);
    } catch (err: any) {
      console.error('Failed to update user preferences:', err);
      setPreferencesError(err.message || 'Failed to update preferences');
      throw err;
    } finally {
      setPreferencesLoading(false);
    }
  }, [user]);

  // Fetch preferences when user changes
  useEffect(() => {
    console.log('[UserContext] User changed, checking if we should fetch preferences:', user);
    if (user?.user_id || user?.id) {
      console.log('[UserContext] User has ID, fetching preferences');
      fetchPreferences();
    } else {
      console.log('[UserContext] No user ID, skipping preferences fetch');
    }
  }, [user, fetchPreferences]);

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      error, 
      refetch,
      preferences,
      preferencesLoading,
      preferencesError,
      fetchPreferences,
      savePreferences,
    }}>
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

/**
 * Convenience hook to get user preferences
 * 
 * @returns Object containing preferences and related functions
 * @throws Error if used outside of UserProvider
 */
export function useUserPreferences() {
  const { 
    preferences, 
    preferencesLoading, 
    preferencesError, 
    fetchPreferences, 
    savePreferences 
  } = useUser();
  
  return {
    preferences,
    loading: preferencesLoading,
    error: preferencesError,
    refetch: fetchPreferences,
    save: savePreferences,
  };
}
