/**
 * Scroll context for header visibility on scroll.
 * Header hides on scroll down, shows on scroll up.
 * Bottom nav stays always visible.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { usePathname } from 'expo-router';
import { useImageModal } from './ImageModalContext';

interface ScrollContextType {
  navVisible: boolean;
  setNavVisible: (visible: boolean) => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export function ScrollContextProvider({ children }: { children: ReactNode }) {
  const [navVisible, setNavVisibleState] = useState(true);
  const pathname = usePathname();
  const { isImageModalOpen } = useImageModal();

  // Use ref to track isImageModalOpen so setNavVisible callback doesn't need to be recreated
  const isImageModalOpenRef = useRef(isImageModalOpen);
  useEffect(() => {
    isImageModalOpenRef.current = isImageModalOpen;
  }, [isImageModalOpen]);

  // Reset header to visible when navigating to a new page
  useEffect(() => {
    setNavVisibleState(true);
  }, [pathname]);

  // When image modal opens, force header to show (solid header while modal is open)
  useEffect(() => {
    if (isImageModalOpen) {
      setNavVisibleState(true);
    }
  }, [isImageModalOpen]);

  // On certain pages: never hide the header (solid header behavior)
  const setNavVisible = useCallback(
    (visible: boolean) => {
      // When image modal is open, always keep header visible (use ref to get current value)
      if (isImageModalOpenRef.current && !visible) return;

      const isChatTab =
        pathname === '/(tabs)/chat' || pathname?.startsWith?.('/(tabs)/chat');
      const isSearchPage = pathname === '/search' || pathname?.startsWith?.('/search');
      const isProfilePage = pathname?.includes?.('profile');
      const isSettingsPage = pathname?.includes?.('settings');
      const isCollectionPage = pathname?.includes?.('collection');
      // Never hide header on these pages
      if ((isChatTab || isSearchPage || isProfilePage || isSettingsPage || isCollectionPage) && !visible) return;
      setNavVisibleState(visible);
    },
    [pathname]
  );

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
