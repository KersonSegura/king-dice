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

  // Use refs to track current values so setNavVisible callback doesn't need to be recreated
  const isImageModalOpenRef = useRef(isImageModalOpen);
  const pathnameRef = useRef(pathname);
  
  useEffect(() => {
    isImageModalOpenRef.current = isImageModalOpen;
  }, [isImageModalOpen]);
  
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

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

  // Check if current page should have solid (always visible) header
  const isSolidHeaderPage = useCallback((path: string | null | undefined) => {
    if (!path) return false;
    const isChatTab = path === '/(tabs)/chat' || path.startsWith?.('/(tabs)/chat');
    const isSearchPage = path === '/search' || path.startsWith?.('/search');
    const isProfilePage = path.includes?.('profile');
    const isSettingsPage = path.includes?.('settings');
    const isCollectionPage = path.includes?.('collection');
    return isChatTab || isSearchPage || isProfilePage || isSettingsPage || isCollectionPage;
  }, []);

  // On certain pages: never hide the header (solid header behavior)
  // Use refs to always get current values without recreating callback
  const setNavVisible = useCallback(
    (visible: boolean) => {
      // When image modal is open, always keep header visible
      if (isImageModalOpenRef.current && !visible) return;

      // Never hide header on solid header pages
      if (isSolidHeaderPage(pathnameRef.current) && !visible) return;
      
      setNavVisibleState(visible);
    },
    [isSolidHeaderPage]
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
