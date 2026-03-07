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

// Check if a path should have solid (always visible) header
function isSolidHeaderPage(path: string | null | undefined): boolean {
  if (!path) return false;
  const isChatTab = path === '/(tabs)/chat' || path.startsWith?.('/(tabs)/chat');
  const isSearchPage = path === '/search' || path.startsWith?.('/search');
  const isProfilePage = path.includes?.('profile');
  const isSettingsPage = path.includes?.('settings');
  const isCollectionPage = path.includes?.('collection');
  return isChatTab || isSearchPage || isProfilePage || isSettingsPage || isCollectionPage;
}

export function ScrollContextProvider({ children }: { children: ReactNode }) {
  const [navVisible, setNavVisibleState] = useState(true);
  const pathname = usePathname();
  const { isImageModalOpen } = useImageModal();

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

  // Stable callback that reads current state directly via closure over the component
  // We recreate this when isImageModalOpen or pathname changes so it has fresh values
  const setNavVisible = useCallback(
    (visible: boolean) => {
      // When image modal is open, always keep header visible
      if (isImageModalOpen && !visible) return;

      // Never hide header on solid header pages
      if (isSolidHeaderPage(pathname) && !visible) return;
      
      setNavVisibleState(visible);
    },
    [isImageModalOpen, pathname]
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
