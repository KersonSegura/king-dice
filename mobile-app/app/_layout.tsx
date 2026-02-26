/**
 * Root layout for Expo Router
 * Sets up navigation and providers
 */
import '../polyfills';
import 'react-native-gesture-handler';

import { Stack, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { LocaleProvider } from '../contexts/LocaleContext';
import { ScrollContextProvider } from '../contexts/ScrollContext';
import { TabRefreshProvider } from '../contexts/TabRefreshContext';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNav from '../components/BottomNav';
import MobileHeader from '../components/MobileHeader';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

function LayoutContent() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  // Hide header/nav on login/register OR when not authenticated (loading/redirect phase)
  const hideNav =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/create-post') ||
    !isAuthenticated;
  // Content starts right below the status bar; the native header overlays
  // the first 56px (like Instagram). When the header hides, content stays put.
  const contentPaddingTop = hideNav ? 0 : insets.top;

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
              <ScrollContextProvider>
                <TabRefreshProvider>
                  <LayoutContent />
                </TabRefreshProvider>
              </ScrollContextProvider>
            </AuthProvider>
          </LocaleProvider>
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
