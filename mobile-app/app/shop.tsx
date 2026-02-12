import { useEffect, useState } from 'react';
import { usePathname } from 'expo-router';
import WebViewScreen from '../components/WebViewScreen';
import { useTabRefresh } from '../contexts/TabRefreshContext';

const SHOP_HREF = '/shop';

export default function Shop() {
  const pathname = usePathname();
  const { refreshRequest, lastRequestedPath } = useTabRefresh();
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (pathname === SHOP_HREF && lastRequestedPath === SHOP_HREF) {
      setKey((k) => k + 1);
    }
  }, [refreshRequest, lastRequestedPath, pathname]);

  return <WebViewScreen key={key} path="/shop" title="Shop" />;
}
