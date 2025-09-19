'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/users';
import { useLevelUp } from './LevelUpContext';


interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateAvatar: (avatarUrl: string) => void;
  syncUserData: (serverUser: any) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
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

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('kingdice_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        
        // Award daily login XP if user hasn't logged in today
        if (userData?.id && userData?.username) {
          // Initialize last known level from user data if available
          if (userData.level) {
            initializeLevel(userData.level);
          }
          awardDailyLoginXP(userData.id, userData.username);
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('kingdice_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('kingdice_user', JSON.stringify(userData));
    
    // Award daily login XP for new login
    if (userData?.id && userData?.username) {
      // Initialize last known level from user data if available
      if (userData.level) {
        initializeLevel(userData.level);
      }
      awardDailyLoginXP(userData.id, userData.username);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kingdice_user');
  };

  const updateAvatar = (avatarUrl: string) => {
    console.log('🔄 AuthContext: Updating avatar from', user?.avatar, 'to', avatarUrl);
    if (user) {
      const updatedUser = { ...user, avatar: avatarUrl };
      setUser(updatedUser);
      localStorage.setItem('kingdice_user', JSON.stringify(updatedUser));
      console.log('✅ AuthContext: Avatar updated successfully to', avatarUrl);
    } else {
      console.log('❌ AuthContext: No user found, cannot update avatar');
    }
  };

  const syncUserData = (serverUser: any) => {
    console.log('🔄 AuthContext: Syncing user data from server:', serverUser);
    if (serverUser) {
      setUser(serverUser);
      localStorage.setItem('kingdice_user', JSON.stringify(serverUser));
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
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 