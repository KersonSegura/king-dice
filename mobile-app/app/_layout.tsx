/**
 * Root layout for Expo Router
 * Sets up navigation and providers
 */
import '../polyfills';
import 'react-native-gesture-handler';

import { Stack, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ScrollContextProvider, useScrollNav } from '../contexts/ScrollContext';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNav from '../components/BottomNav';
import MobileHeader from '../components/MobileHeader';

const HEADER_CONTENT_HEIGHT = 56;

function LayoutContent() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { navVisible } = useScrollNav();
  const { isAuthenticated } = useAuth();
  // Hide header/nav on login/register OR when not authenticated (loading/redirect phase)
  const hideNav =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    !isAuthenticated;
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
  const contentPaddingTop = hideNav ? 0 : (navVisible ? headerHeight : 0);

  return (
    <>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: contentPaddingTop }}>
              <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { flex: 1, backgroundColor: '#f9fafb' },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
        <AuthProvider>
          <ScrollContextProvider>
            <LayoutContent />
          </ScrollContextProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
