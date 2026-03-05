/**
 * Context for managing unread chat message counts across the app.
 * The BottomNav displays the badge, and this context allows any component
 * (like the WebView chat) to trigger a refresh of the count.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '../lib/api-client';

type ChatUnreadContextType = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const ChatUnreadContext = createContext<ChatUnreadContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
});

export function ChatUnreadProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastFetchRef = useRef<number>(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    // Debounce: don't fetch more than once per second
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) {
      return;
    }
    lastFetchRef.current = now;

    try {
      const res = await apiClient.get<{ unreadCount?: number; success?: boolean }>(
        `/api/messages/unread?userId=${user.id}`
      );
      setUnreadCount(res.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread chat count:', error);
    }
  }, [user?.id]);

  // Initial fetch and polling
  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    // Fetch immediately
    refreshUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(refreshUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user?.id, refreshUnreadCount]);

  return (
    <ChatUnreadContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  return useContext(ChatUnreadContext);
}
