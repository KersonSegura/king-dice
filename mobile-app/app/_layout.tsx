/**
 * Root layout for Expo Router
 * Sets up navigation and providers
 */
import '../polyfills';
import 'react-native-gesture-handler';

import { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { LocaleProvider } from '../contexts/LocaleContext';
import { ScrollContextProvider } from '../contexts/ScrollContext';
import { TabRefreshProvider } from '../contexts/TabRefreshContext';
import { ChatUnreadProvider } from '../contexts/ChatUnreadContext';
import { ImageModalProvider } from '../contexts/ImageModalContext';
import { StatusBar } from 'expo-status-bar';
import { View, BackHandler } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNav from '../components/BottomNav';
import MobileHeader from '../components/MobileHeader';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

function LayoutContent() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  // Prevent Android back button from navigating to login/register after authenticated.
  // If on a main tab and user presses back, minimize the app instead of going back.
  useEffect(() => {
    const onBackPress = () => {
      // If not authenticated, let default behavior happen (stay on login, etc.)
      if (!isAuthenticated) return false;

      // Check if on a main tab (home, feed, chat, collection, profile)
      const isMainTab =
        pathname === '/' ||
        pathname === '/(tabs)' ||
        pathname === '/(tabs)/index' ||
        pathname === '/(tabs)/feed' ||
        pathname === '/(tabs)/chat' ||
        pathname === '/(tabs)/collection' ||
        pathname === '/(tabs)/profile';

      if (isMainTab) {
        // Minimize the app instead of going back to login
        BackHandler.exitApp();
        return true;
      }

      // For other pages, allow normal back behavior (router handles navigation)
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isAuthenticated, pathname]);

  // Hide header/nav on login/register OR when not authenticated (loading/redirect phase)
  const hideNav =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/create-post') ||
    !isAuthenticated;

  const HEADER_CONTENT_HEIGHT = 56;
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
  // Solid header pages: content starts below header (no overlay effect).
  // Other pages: content under status bar; header overlays first 56px (Instagram-style).
  const needsSolidHeader =
    pathname?.includes('chat') ||
    pathname?.includes('search') ||
    pathname?.includes('profile') ||
    pathname?.includes('settings') ||
    pathname?.includes('collection');
  const contentPaddingTop = hideNav ? 0 : needsSolidHeader ? headerHeight : insets.top;

  return (
    <>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        {/* Permanent white status bar background so phone UI stays visible */}
        {!hideNav && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 150 }} />
        )}
        <View style={{ flex: 1, paddingTop: contentPaddingTop, backgroundColor: '#f9fafb' }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { flex: 1, backgroundColor: '#f9fafb' },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="search" />
            <Stack.Screen name="shop" />
            <Stack.Screen name="forums" />
            <Stack.Screen name="community-gallery" />
            <Stack.Screen name="all-games" />
            <Stack.Screen name="open" />
            <Stack.Screen name="game/[id]" />
            <Stack.Screen name="my-dice" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="create-post" options={{ headerShown: false }} />
          </Stack>
        </View>
        {!hideNav && <MobileHeader />}
        {!hideNav && <BottomNav />}
      </View>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppErrorBoundary>
          <LocaleProvider>
            <AuthProvider>
              <ChatUnreadProvider>
                <ImageModalProvider>
                <ScrollContextProvider>
                  <TabRefreshProvider>
                    <LayoutContent />
                  </TabRefreshProvider>
                </ScrollContextProvider>
                </ImageModalProvider>
              </ChatUnreadProvider>
            </AuthProvider>
          </LocaleProvider>
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
