/**
 * Generic route to open any website path in a WebView.
 * Used by notifications to navigate to posts, comments, gallery images, etc.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import WebViewScreen from '../components/WebViewScreen';

export default function OpenScreen() {
  const params = useLocalSearchParams<{ path?: string }>();
  const router = useRouter();
  const path = Array.isArray(params.path) ? params.path[0] : params.path;

  useEffect(() => {
    if (!path || path === '' || path === 'undefined') {
      router.back();
    }
  }, [path, router]);

  if (!path || path === '' || path === 'undefined') {
    return null;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return <WebViewScreen path={cleanPath} title="" />;
}
