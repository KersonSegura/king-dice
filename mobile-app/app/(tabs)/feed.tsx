/**
 * Forums (website) – matches mobile nav.
 * Tapping Feed again in the nav refreshes and scrolls to top.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'expo-router';
import WebViewScreen from '../../components/WebViewScreen';
import { useLocale } from '../../contexts/LocaleContext';
import { useTabRefresh } from '../../contexts/TabRefreshContext';

const FEED_HREF = '/(tabs)/feed';

export default function FeedScreen() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { refreshRequest, lastRequestedPath } = useTabRefresh();
  const [key, setKey] = useState(0);

  useEffect(() => {
    const isFeedTab = pathname === '/feed' || pathname?.startsWith(FEED_HREF);
    if (isFeedTab && lastRequestedPath === FEED_HREF) {
      setKey((k) => k + 1);
    }
  }, [refreshRequest, lastRequestedPath, pathname]);

  return (
    <WebViewScreen
      key={key}
      path="/feed"
      title={t('feed')}
      showHeader={false}
      hideWebHeader
    />
  );
}
