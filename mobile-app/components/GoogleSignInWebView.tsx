/**
 * WebView that loads the site's /auth/mobile-done page for Google (or any) sign-in.
 * When the page posts { type: 'auth', token, user }, onSuccess is called and the modal closes.
 */

import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: { id: string; username: string; email: string; avatar?: string }) => void;
  url: string;
};

export default function GoogleSignInWebView({ visible, onClose, onSuccess, url }: Props) {
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

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={28} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign in with Google</Text>
        </View>
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          onMessage={handleMessage}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#374151', textAlign: 'center', marginRight: 44 },
  webview: { flex: 1 },
  loadingWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});
