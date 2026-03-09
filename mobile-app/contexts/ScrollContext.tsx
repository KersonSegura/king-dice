/**
 * Scroll context for header visibility.
 * Header is always visible (solid header on all pages).
 */

import React, { createContext, useContext, ReactNode } from 'react';

interface ScrollContextType {
  navVisible: boolean;
  setNavVisible: (visible: boolean) => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export function ScrollContextProvider({ children }: { children: ReactNode }) {
  // Always keep header visible - no hiding on scroll
  const navVisible = true;
  const setNavVisible = () => {}; // No-op, header always stays visible

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
