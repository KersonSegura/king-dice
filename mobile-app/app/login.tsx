/**
 * Login screen - uses 3D D6 dice from dice-logo (same as Dice Roller).
 * Same icons as web (ProfileIconOn.svg, LockIcon.svg) and classic Google G.
 */

import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../config/api';
import { ProfileIconOnSvg, LockIconSvg } from '../components/BundledAuthIcons';
import GoogleLogoIcon from '../components/GoogleLogoIcon';
import GoogleSignInWebView from '../components/GoogleSignInWebView';
import NativeDiceViewer, { NativeDiceViewerRef } from '../components/NativeDiceViewer';
import { apiClient } from '../lib/api-client';

const DRAG_SENSITIVITY = 0.025;

const base = typeof API_BASE_URL === 'string' ? API_BASE_URL.replace(/\/$/, '') : 'https://kingdice.gg';
const GRAY_500 = '#6b7280';
const GRAY_700 = '#374151';
const GRAY_300 = '#d1d5db';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [verify2FALoading, setVerify2FALoading] = useState(false);
  const [showGoogleWebView, setShowGoogleWebView] = useState(false);
  const { login, verifyTwoFactor, verifyAuth } = useAuth();
  const router = useRouter();
  const diceViewerRef = useRef<NativeDiceViewerRef>(null);
  const lastTranslationX = useRef(0);

  const dicePanGesture = useMemo(() => {
    return Gesture.Pan()
      .runOnJS(true)
      .onStart(() => {
        lastTranslationX.current = 0;
      })
      .onUpdate((e) => {
        const delta = (e.translationX - lastTranslationX.current) * DRAG_SENSITIVITY;
        lastTranslationX.current = e.translationX;
        diceViewerRef.current?.addRotation(delta);
      })
      .onFinalize(() => {
        lastTranslationX.current = 0;
      });
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    try {
      setLoading(true);
      const result = await login(username, password);
      if (result?.requiresTwoFactor) {
        setTwoFactorUserId(result.userId);
        return;
      }
      setTimeout(() => router.replace('/(tabs)'), 50);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    const code = twoFactorCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6 || !twoFactorUserId) {
      Alert.alert('Error', 'Please enter the 6-digit code from your email');
      return;
    }
    try {
      setVerify2FALoading(true);
      await verifyTwoFactor(twoFactorUserId, code);
      setTimeout(() => router.replace('/(tabs)'), 50);
    } catch (error: any) {
      Alert.alert('Verification Failed', (error as Error).message || 'Invalid or expired code');
    } finally {
      setVerify2FALoading(false);
    }
  };

  const handleGoogleSignIn = () => setShowGoogleWebView(true);

  const handleGoogleSuccess = async (token: string) => {
    await apiClient.setToken(token);
    await verifyAuth();
    setShowGoogleWebView(false);
    setTimeout(() => router.replace('/(tabs)'), 50);
  };

  const mobileDoneUrl = `${base}/auth/mobile-done`;

  if (twoFactorUserId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>King Dice</Text>
        <Text style={styles.subtitle}>Two-factor authentication</Text>
        <Text style={styles.twoFactorHint}>Enter the 6-digit code sent to your email.</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor={GRAY_500}
            value={twoFactorCode}
            onChangeText={(v) => setTwoFactorCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, verify2FALoading && styles.primaryButtonDisabled]}
          onPress={handleVerify2FA}
          disabled={verify2FALoading}
        >
          {verify2FALoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkWrap} onPress={() => setTwoFactorUserId(null)}>
          <Text style={styles.linkHighlight}>Back to sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <>
      <GoogleSignInWebView
        visible={showGoogleWebView}
        onClose={() => setShowGoogleWebView(false)}
        onSuccess={handleGoogleSuccess}
        url={mobileDoneUrl}
      />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.contentGroup}>
          <View style={styles.diceContainer} collapsable={false}>
            <NativeDiceViewer ref={diceViewerRef} />
            <GestureDetector gesture={dicePanGesture}>
              <View style={styles.diceTouchLayer} collapsable={false} />
            </GestureDetector>
          </View>
          <View style={styles.pack}>
          <Text style={styles.title}>King Dice</Text>
          <Text style={styles.subtitle}>Sign In</Text>

          <View style={styles.inputWrap}>
            <View style={styles.inputIcon}>
              <ProfileIconOnSvg size={20} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Username or email"
              placeholderTextColor={GRAY_500}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrap}>
            <View style={styles.inputIcon}>
              <LockIconSvg size={20} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={GRAY_500}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#fbae17" style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          )}

          <View style={styles.dividerWrap}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.primaryButtonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <View style={styles.googleIconWrap}>
              <GoogleLogoIcon size={22} />
            </View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkWrap} onPress={() => router.push('/register')} disabled={loading}>
            <Text style={styles.linkText}>Don't have an account? </Text>
            <Text style={styles.linkHighlight}>Register</Text>
          </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  contentGroup: {
    alignItems: 'center',
  },
  pack: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  diceContainer: {
    width: '100%',
    height: 200,
    marginBottom: 4,
    position: 'relative',
  },
  diceTouchLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#fbae17',
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  twoFactorHint: {
    fontSize: 14,
    color: GRAY_500,
    textAlign: 'center',
    marginBottom: 16,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GRAY_300,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginLeft: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111',
  },
  loader: {
    marginVertical: 16,
  },
  primaryButton: {
    backgroundColor: '#fbae17',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: GRAY_300,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: GRAY_500,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: GRAY_300,
    backgroundColor: '#fff',
  },
  googleIconWrap: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: GRAY_700,
  },
  linkWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    fontSize: 14,
    color: GRAY_700,
  },
  linkHighlight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbae17',
  },
});
