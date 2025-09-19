import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useUserId() {
  const { user, isAuthenticated } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔍 useUserId hook - using authenticated user:', {
        id: user.id,
        username: user.username,
        email: user.email
      });
      setUserId(user.id);
    } else {
      console.log('🔍 useUserId hook - no authenticated user, using anonymous');
      setUserId(null);
    }
  }, [isAuthenticated, user]);

  console.log('🔍 useUserId hook - current userId state:', userId);
  return userId;
} 