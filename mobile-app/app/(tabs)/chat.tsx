/**
 * Chat – app’s dedicated chat tab (no floating/popup).
 * When user opens a profile from chat (See profile), we remount the WebView so that
 * when they tap Chat again they see the main chat list, not the previous conversation.
 * When user leaves the tab and comes back (taps Chat again), we remount so they
 * always see the main chat list, not the last open conversation.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import WebViewScreen from '../../components/WebViewScreen';
import { useLocale } from '../../contexts/LocaleContext';
import { useTabRefresh } from '../../contexts/TabRefreshContext';

const CHAT_HREF = '/(tabs)/chat';

export default function ChatScreen() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { refreshRequest, lastRequestedPath } = useTabRefresh();
  const [chatKey, setChatKey] = useState(0);
  const hasLeftTabRef = useRef(false);

  useEffect(() => {
    if (pathname?.startsWith(CHAT_HREF) && lastRequestedPath === CHAT_HREF) {
      setChatKey((k) => k + 1);
    }
  }, [refreshRequest, lastRequestedPath, pathname]);

  useFocusEffect(
    useCallback(() => {
      if (hasLeftTabRef.current) {
        setChatKey((k) => k + 1);
        hasLeftTabRef.current = false;
      }
      return () => {
        hasLeftTabRef.current = true;
      };
    }, [])
  );

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'navigateToProfile') {
        setChatKey((k) => k + 1);
      }
    } catch {}
  }, []);

  return (
    <WebViewScreen
      key={chatKey}
      path="/chat"
      title={t('chat')}
      showHeader={false}
      hideWebHeader
      disableScrollNav
      embed={true}
      onMessage={handleMessage}
    />
  );
}
