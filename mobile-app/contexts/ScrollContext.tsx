/**
 * Scroll context for header visibility on scroll.
 * Header hides on scroll down, shows on scroll up.
 * Bottom nav stays always visible.
 *
 * Split into state + dispatch so WebViewScreen (which only calls setNavVisible)
 * does NOT re-render when navVisible changes - prevents WebView blank/flicker
 * when overlay shows on scroll up.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { usePathname } from 'expo-router';

interface ScrollStateContextType {
  navVisible: boolean;
}

interface ScrollDispatchContextType {
  setNavVisible: (visible: boolean) => void;
}

const ScrollStateContext = createContext<ScrollStateContextType | undefined>(undefined);
const ScrollDispatchContext = createContext<ScrollDispatchContextType | undefined>(undefined);

export function ScrollContextProvider({ children }: { children: ReactNode }) {
  const [navVisible, setNavVisibleState] = useState(true);
  const pathname = usePathname();

  // Reset header to visible when navigating to a new page
  useEffect(() => {
    setNavVisibleState(true);
  }, [pathname]);

  // On chat or search: never hide the header when scrolling (header always visible)
  const setNavVisible = useCallback(
    (visible: boolean) => {
      const isChatTab =
        pathname === '/(tabs)/chat' || pathname?.startsWith?.('/(tabs)/chat');
      const isSearchPage = pathname === '/search' || pathname?.startsWith?.('/search');
      if ((isChatTab || isSearchPage) && !visible) return;
      setNavVisibleState(visible);
    },
    [pathname]
  );

  const stateValue = useMemo(() => ({ navVisible }), [navVisible]);
  const dispatchValue = useMemo(() => ({ setNavVisible }), [setNavVisible]);

  return (
    <ScrollStateContext.Provider value={stateValue}>
      <ScrollDispatchContext.Provider value={dispatchValue}>
        {children}
      </ScrollDispatchContext.Provider>
    </ScrollStateContext.Provider>
  );
}

/** Use when you need navVisible (e.g. MobileHeader) - re-renders when overlay state changes */
export function useScrollNav() {
  const state = useContext(ScrollStateContext);
  const dispatch = useContext(ScrollDispatchContext);
  if (state === undefined || dispatch === undefined) {
    return {
      navVisible: true,
      setNavVisible: () => {},
    };
  }
  return { ...state, ...dispatch };
}

/** Use when you only need setNavVisible (e.g. WebViewScreen) - does NOT re-render when navVisible changes */
export function useScrollDispatch() {
  const dispatch = useContext(ScrollDispatchContext);
  if (dispatch === undefined) {
    return { setNavVisible: () => {} };
  }
  return dispatch;
}
