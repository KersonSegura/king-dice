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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebViewScreen from '../../components/WebViewScreen';
import { BOTTOM_NAV_BASE_HEIGHT } from '../../components/BottomNav';
import { useLocale } from '../../contexts/LocaleContext';
import { useTabRefresh } from '../../contexts/TabRefreshContext';
import { useChatUnread } from '../../contexts/ChatUnreadContext';

const CHAT_HREF = '/(tabs)/chat';

export default function ChatScreen() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { refreshRequest, lastRequestedPath } = useTabRefresh();
  const { refreshUnreadCount } = useChatUnread();
  const [chatKey, setChatKey] = useState(0);
  const hasLeftTabRef = useRef(false);
  const chatPadBottom = BOTTOM_NAV_BASE_HEIGHT + insets.bottom + 12;

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
      // When messages are marked as read in a chat, refresh the unread count
      if (data?.type === 'chatMessagesRead') {
        refreshUnreadCount();
      }
    } catch {}
  }, [refreshUnreadCount]);

  return (
    <WebViewScreen
      key={chatKey}
      path="/chat"
      title={t('chat')}
      showHeader={false}
      hideWebHeader
      disableScrollNav
      embed={true}
      padBottom={chatPadBottom}
      onMessage={handleMessage}
    />
  );
}
