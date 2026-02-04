/**
 * Tab navigation – same icons as website (SVGs).
 * Tabs: Home, Feed, Chat, Collection, Profile.
 * No auth loading screen – WebViewScreen's loading overlay is the only loading UI.
 */

import { Tabs, useRouter } from 'expo-router';
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

  // Don't block on auth loading – render tabs immediately so WebViewScreen
  // shows our single loading overlay. Auth redirect happens when verify completes.
  if (!isLoading && !isAuthenticated) {
    return null;
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
