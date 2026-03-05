/**
 * In-app OAuth WebView for Google/Apple sign-in.
 * Replaces the full system browser (openAuthSessionAsync) with a focused modal
 * that only allows OAuth-related URLs. Prevents users from navigating to the
 * full kingdice.gg site and getting stuck.
 *
 * When mobile-done loads with a token, it posts { type: 'auth', token, user }
 * and we call onSuccess.
 */

import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../contexts/LocaleContext';
import { OAUTH_BASE_URL } from '../config/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: { id: string; username: string; email: string; avatar?: string }) => void;
  url: string;
  title?: string;
};

/** Allowed URL patterns for OAuth flow. Block everything else to prevent navigating to full site. */
function isAllowedOAuthUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname;

    // Google OAuth
    if (host === 'accounts.google.com' || host.endsWith('.accounts.google.com')) return true;

    // Apple OAuth
    if (host === 'appleid.apple.com' || host.endsWith('.appleid.apple.com')) return true;

    // Our domain - only OAuth-related paths
    const ourHost = new URL(OAUTH_BASE_URL).hostname.toLowerCase();
    if (host === ourHost || host === 'kingdice.gg' || host === 'www.kingdice.gg') {
      return (
        path.startsWith('/api/auth') ||
        path.startsWith('/auth/') ||
        path === '/api/mobile-google' ||
        path === '/api/mobile-apple'
      );
    }

    return false;
  } catch {
    return false;
  }
}

export default function GoogleSignInWebView({ visible, onClose, onSuccess, url, title }: Props) {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const displayTitle = title ?? t('signInWithGoogle');

  const handleMessage = (event: { nativeEvent: { data?: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data ?? '{}');
      if (data.type === 'auth' && data.token && data.user) {
        onSuccess(data.token, data.user);
        onClose();
      }
    } catch {
      // ignore non-JSON or invalid messages
    }
  };

  const handleShouldStartLoad = (request: { url: string; navigationType?: string }) => {
    const allowed = isAllowedOAuthUrl(request.url);
    if (!allowed) {
      // Block navigation to non-OAuth URLs (e.g. kingdice.gg homepage, games, feed)
      return false;
    }
    return true;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={28} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
        </View>
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#fbae17" />
            </View>
          )}
          // Prevent opening links in external browser
          setSupportMultipleWindows={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginRight: 44,
  },
  webview: { flex: 1 },
  loadingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
