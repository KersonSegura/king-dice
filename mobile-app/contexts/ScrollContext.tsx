/**
 * Scroll context for header visibility on scroll.
 * Header hides on scroll down, shows on scroll up.
 * Bottom nav stays always visible.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'expo-router';

interface ScrollContextType {
  navVisible: boolean;
  setNavVisible: (visible: boolean) => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export function ScrollContextProvider({ children }: { children: ReactNode }) {
  const [navVisible, setNavVisible] = useState(true);
  const pathname = usePathname();

  // Reset header to visible when navigating to a new page
  useEffect(() => {
    setNavVisible(true);
  }, [pathname]);

  return (
    <ScrollContext.Provider value={{ navVisible, setNavVisible }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScrollNav(): ScrollContextType {
  const ctx = useContext(ScrollContext);
  if (ctx === undefined) {
    return {
      navVisible: true,
      setNavVisible: () => {},
    };
  }
  return ctx;
}
