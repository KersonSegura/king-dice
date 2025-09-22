'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLevelUp } from './LevelUpContext';

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  isAdmin: boolean;
  level?: number;
  xp?: number;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User, token: string) => void;
  logout: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => void;
  syncUserData: (serverUser: any) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  verifyAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showLevelUp } = useLevelUp();

  // Function to award daily login XP
  const awardDailyLoginXP = async (userId: string, username: string) => {
    try {
      const response = await fetch('/api/reputation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          username,
          action: 'DAILY_LOGIN'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          console.log(`🎉 Daily login XP awarded! Level: ${result.user.levelName} (${result.user.xp} XP)`);
          
          // Show level-up notification if user leveled up
          if (result.leveledUp && result.newLevel) {
            console.log(`🎊 Level up notification triggered for level ${result.newLevel}`);
            showLevelUp(result.newLevel);
          }
        }
      }
    } catch (error) {
      console.error('Error awarding daily login XP:', error);
    }
  };

  // Verify authentication on app start
  const verifyAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        // Award daily login XP if user hasn't logged in today
        if (data.user?.id && data.user?.username) {
          awardDailyLoginXP(data.user.id, data.user.username);
        }
      } else {
        // Token is invalid or expired
        setUser(null);
      }
    } catch (error) {
      console.error('Error verifying authentication:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyAuth();
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
    
    // Award daily login XP for new login
    if (userData?.id && userData?.username) {
      awardDailyLoginXP(userData.id, userData.username);
    }
  };

  const logout = async () => {
    try {
      // Call logout API to clear server-side session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear local state regardless of API call result
      setUser(null);
    }
  };

  const updateAvatar = (avatarUrl: string) => {
    console.log('🔄 AuthContext: Updating avatar from', user?.avatar, 'to', avatarUrl);
    if (user) {
      const updatedUser = { ...user, avatar: avatarUrl };
      setUser(updatedUser);
      console.log('✅ AuthContext: Avatar updated successfully to', avatarUrl);
    } else {
      console.log('❌ AuthContext: No user found, cannot update avatar');
    }
  };

  const syncUserData = (serverUser: any) => {
    console.log('🔄 AuthContext: Syncing user data from server:', serverUser);
    if (serverUser) {
      setUser(serverUser);
      console.log('✅ AuthContext: User data synced successfully');
    }
  };

  const value = {
    user,
    login,
    logout,
    updateAvatar,
    syncUserData,
    isAuthenticated: !!user,
    isLoading,
    verifyAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}