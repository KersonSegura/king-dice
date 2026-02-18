/**
 * Deep-link handler for OAuth callback: kingdice://auth?token=...&user=...
 * When the in-app browser redirects here (or opens the app via Android intent),
 * we store the token and navigate to the main app.
 */

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';

function getTokenFromUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const q = (parsed.queryParams || {}) as Record<string, string>;
    return q.token || null;
  } catch {
    const m = url.match(/[?&]token=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
}

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ token?: string; user?: string }>();
  const router = useRouter();
  const { verifyAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);

  // Resolve token from route params or from Linking (intent/cold start on Android)
  useEffect(() => {
    if (params.token) {
      setResolvedToken(params.token);
      return;
    }
    let cancelled = false;
    Linking.getInitialURL().then((url) => {
      if (cancelled || !url) return;
      const token = getTokenFromUrl(url);
      if (token) setResolvedToken(token);
    });
    const sub = Linking.addEventListener('url', (e) => {
      const token = getTokenFromUrl(e.url);
      if (token) setResolvedToken(token);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [params.token]);

  useEffect(() => {
    const token = resolvedToken;
    if (!token) {
      const t = setTimeout(() => {
        setDone(true);
      }, 1500);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    (async () => {
      try {
        await apiClient.setToken(token);
        await verifyAuth();
        if (!cancelled) setTimeout(() => router.replace('/(tabs)'), 50);
      } catch {
        if (!cancelled) setError('Sign-in failed');
      }
    })();
    return () => { cancelled = true; };
  }, [resolvedToken]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!resolvedToken && done) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>No sign-in data received.</Text>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#fbae17" />
      <Text style={styles.label}>Completing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  label: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  link: {
    fontSize: 16,
    color: '#fbae17',
    fontWeight: '600',
  },
});
