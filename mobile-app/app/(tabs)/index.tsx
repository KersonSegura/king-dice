/**
 * Home (website) – exact mobile view with bottom nav.
 * Tapping Home again in the nav refreshes and scrolls to top.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'expo-router';
import WebViewScreen from '../../components/WebViewScreen';
import { useTabRefresh } from '../../contexts/TabRefreshContext';

const HOME_HREF = '/(tabs)';

export default function HomeScreen() {
  const pathname = usePathname();
  const { refreshRequest, lastRequestedPath } = useTabRefresh();
  const [key, setKey] = useState(0);

  useEffect(() => {
    const isHome = pathname === '/' || pathname === '/(tabs)';
    if (isHome && lastRequestedPath === HOME_HREF) {
      setKey((k) => k + 1);
    }
  }, [refreshRequest, lastRequestedPath, pathname]);

  return (
    <WebViewScreen
      key={key}
      path="/"
      title="Home"
      showHeader={false}
      hideWebHeader
      debugWebView
    />
  );
}
