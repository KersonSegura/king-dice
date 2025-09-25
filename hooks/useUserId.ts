import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useUserId() {
  const { user, isAuthenticated } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      setUserId(user.id);
    } else {
      setUserId(null);
    }
  }, [isAuthenticated, user]);

  return userId;
} 
