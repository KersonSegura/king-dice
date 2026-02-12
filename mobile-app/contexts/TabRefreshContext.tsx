/**
 * When user taps the same tab they're already on (e.g. Home while on Home),
 * we request a refresh so the page reloads and scrolls to top.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type TabRefreshContextType = {
  refreshRequest: number;
  lastRequestedPath: string | null;
  requestRefresh: (path: string) => void;
};

const TabRefreshContext = createContext<TabRefreshContextType | undefined>(undefined);

export function TabRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshRequest, setRefreshRequest] = useState(0);
  const [lastRequestedPath, setLastRequestedPath] = useState<string | null>(null);

  const requestRefresh = useCallback((path: string) => {
    setLastRequestedPath(path);
    setRefreshRequest((n) => n + 1);
  }, []);

  return (
    <TabRefreshContext.Provider value={{ refreshRequest, lastRequestedPath, requestRefresh }}>
      {children}
    </TabRefreshContext.Provider>
  );
}

export function useTabRefresh() {
  const ctx = useContext(TabRefreshContext);
  if (ctx === undefined) throw new Error('useTabRefresh must be used within TabRefreshProvider');
  return ctx;
}
