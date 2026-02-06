/**
 * Tab navigation – same icons as website (SVGs).
 * Tabs: Home, Feed, Chat, Collection, Profile.
 * Shows loading screen until auth is known – avoids main page flash before login.
 */

import { Tabs, useRouter } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't show main content until authenticated – prevents flash of main page before login
  if (!isAuthenticated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#fbae17" />
        <Text style={styles.loadingText}>{isLoading ? 'Loading…' : 'Redirecting…'}</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="collection" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
});
