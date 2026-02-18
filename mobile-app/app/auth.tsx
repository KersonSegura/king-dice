/**
 * Deep-link handler for OAuth callback: kingdice://auth?token=...&user=...
 * When the in-app browser redirects here after Google sign-in, we store the token
 * and navigate to the main app. This fixes "Unmatched Route" when the app
 * opens from the redirect.
 */

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ token?: string; user?: string }>();
  const router = useRouter();
  const { verifyAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = params.token;
    if (!token) {
      const t = setTimeout(() => {
        if (!cancelled) setDone(true);
      }, 1500);
      return () => { clearTimeout(t); cancelled = true; };
    }
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
  }, [params.token]);

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

  if (!params.token && done) {
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
