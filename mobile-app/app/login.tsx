/**
 * Login screen - uses 3D D6 dice from dice-logo (same as Dice Roller).
 * Same icons as web (ProfileIconOff.svg, LockIcon.svg) and classic Google G.
 */

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { getApiBaseUrl, OAUTH_BASE_URL } from '../config/api';
import { ProfileIconOffSvg, LockIconSvg } from '../components/BundledAuthIcons';
import GoogleLogoIcon from '../components/GoogleLogoIcon';
import NativeDiceViewer, { NativeDiceViewerRef } from '../components/NativeDiceViewer';
import FloatingLanguageMenu from '../components/FloatingLanguageMenu';
import { apiClient } from '../lib/api-client';

const DRAG_SENSITIVITY = 0.025;

const base = getApiBaseUrl().replace(/\/$/, '');
const GRAY_500 = '#6b7280';
const GRAY_700 = '#374151';
const GRAY_300 = '#d1d5db';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [verify2FALoading, setVerify2FALoading] = useState(false);
  const { login, verifyTwoFactor, verifyAuth } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const diceViewerRef = useRef<NativeDiceViewerRef>(null);
  const lastTranslationX = useRef(0);
  const { height: windowHeight } = useWindowDimensions();

  const canUseGestures = typeof Gesture?.Pan === 'function' && typeof GestureDetector === 'function';
  const dicePanGesture = useMemo(() => {
    if (!canUseGestures) return null;
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
  }, [canUseGestures]);

  // Reset dice rotation when returning to this screen (e.g. back from Register) so it doesn't keep speeding up
  useFocusEffect(
    useCallback(() => {
      diceViewerRef.current?.resetRotation?.();
    }, [])
  );

  // If already signed in (e.g. user pressed back and landed here), go to app and clear stack so back doesn't return to login
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated) {
      router.dismissAll();
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password) {
      setError(t('pleaseEnterUsernameAndPassword'));
      return;
    }

    try {
      setLoading(true);
      const result = await login(username, password);
      if (result?.requiresTwoFactor) {
        setTwoFactorUserId(result.userId);
        return;
      }
      router.dismissAll();
      setTimeout(() => router.replace('/(tabs)'), 50);
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      if (message && (message.includes('timeout') || message.includes('Network') || message.includes('verify'))) {
        setError(message);
      } else if (message) {
        setError(message);
      } else {
        setError(t('incorrectUsernameOrPassword'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    const code = twoFactorCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6 || !twoFactorUserId) {
      Alert.alert(t('verificationFailed'), t('pleaseEnter6DigitCode'));
      return;
    }
    try {
      setVerify2FALoading(true);
      await verifyTwoFactor(twoFactorUserId, code);
      router.dismissAll();
      setTimeout(() => router.replace('/(tabs)'), 50);
    } catch (error: any) {
      Alert.alert(t('verificationFailed'), (error as Error).message || t('invalidOrExpiredCode'));
    } finally {
      setVerify2FALoading(false);
    }
  };

  const handleOAuthSuccess = async (token: string) => {
    await apiClient.setToken(token);
    await verifyAuth();
    router.dismissAll();
    setTimeout(() => router.replace('/(tabs)'), 50);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      const webClientId = Constants.expoConfig?.extra?.googleWebClientId ?? (process as any).env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
      if (!webClientId) {
        setError('Google sign-in not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to mobile-app/.env');
        return;
      }
      GoogleSignin.configure({ webClientId });
      const result = await GoogleSignin.signIn();
      const idToken = result?.type === 'success' ? result.data?.idToken : null;
      if (!idToken) {
        return; // User cancelled
      }
      const apiUrl = `${getApiBaseUrl()}/api/verify-google-id-token`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        await handleOAuthSuccess(data.token);
      } else {
        setError(data.message || t('signInFailedTryAgain') || 'Sign-in failed. Please try again.');
      }
    } catch (e: any) {
      if (e?.code === 'SIGN_IN_CANCELLED' || e?.message?.includes('cancel')) return;
      setError(e?.message || t('signInFailedTryAgain') || 'Sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') return;
    setAppleLoading(true);
    setError('');
    try {
      const AppleAuth = await import('expo-apple-authentication');
      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential?.identityToken) {
        return; // User cancelled
      }
      const apiUrl = `${getApiBaseUrl()}/api/verify-apple-id-token`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          fullName: credential.fullName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        await handleOAuthSuccess(data.token);
      } else {
        setError(data.message || t('signInFailedTryAgain') || 'Sign-in failed. Please try again.');
      }
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
      setError(e?.message || t('signInFailedTryAgain') || 'Sign-in failed. Please try again.');
    } finally {
      setAppleLoading(false);
    }
  };


  if (twoFactorUserId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>King Dice</Text>
        <Text style={styles.subtitle}>{t('twoFactorTitle')}</Text>
        <Text style={styles.twoFactorHint}>{t('twoFactorHint')}</Text>
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
            <Text style={styles.primaryButtonText}>{t('verify')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkWrap} onPress={() => setTwoFactorUserId(null)}>
          <Text style={styles.linkHighlight}>{t('backToSignIn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <FloatingLanguageMenu />
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { minHeight: windowHeight }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
        <View style={styles.contentGroup}>
          <View style={styles.diceContainer} collapsable={false}>
            {NativeDiceViewer ? (
              <NativeDiceViewer ref={diceViewerRef} />
            ) : (
              <View style={[styles.diceFallback, styles.diceTouchLayer]} collapsable={false} />
            )}
            {canUseGestures && dicePanGesture ? (
              <GestureDetector gesture={dicePanGesture}>
                <View style={styles.diceTouchLayer} collapsable={false} />
              </GestureDetector>
            ) : (
              <View style={styles.diceTouchLayer} collapsable={false} />
            )}
          </View>
          <View style={styles.pack}>
          <Text style={styles.title}>King Dice</Text>
          <Text style={styles.subtitle}>{t('signIn')}</Text>

          <View style={styles.inputWrap}>
            <View style={styles.inputIcon}>
              <ProfileIconOffSvg size={20} />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('usernameOrEmail')}
              placeholderTextColor={GRAY_500}
              value={username}
              onChangeText={(v) => { setUsername(v); setError(''); }}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrap}>
            <View style={styles.inputIcon}>
              <LockIconSvg size={20} />
            </View>
            <TextInput
              style={[styles.input, styles.inputWithRight]}
              placeholder={t('passwordPlaceholder')}
              placeholderTextColor={GRAY_500}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={GRAY_500} />
            </TouchableOpacity>
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {loading ? (
            <ActivityIndicator size="large" color="#fbae17" style={styles.loader} />
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>{t('signIn')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.dividerWrap}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('orContinueWith')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.primaryButtonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={GRAY_700} />
            ) : (
              <>
                <View style={styles.googleIconWrap}>
                  <GoogleLogoIcon size={22} />
                </View>
                <Text style={styles.googleButtonText}>{t('continueWithGoogle')}</Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.appleButton, appleLoading && styles.primaryButtonDisabled]}
              onPress={handleAppleSignIn}
              disabled={appleLoading}
            >
              {appleLoading ? (
                <ActivityIndicator size="small" color={GRAY_700} />
              ) : (
                <>
                  <View style={styles.appleIconWrap}>
                    <Ionicons name="logo-apple" size={22} color="#111827" />
                  </View>
                  <Text style={styles.appleButtonText}>{t('continueWithApple')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.termsNotice}>
            {t('byContinuingYouAgree')}{' '}
            <Text 
              style={styles.termsLink}
              onPress={() => Linking.openURL(`${OAUTH_BASE_URL}/terms-of-service`)}
            >
              {t('termsOfService')}
            </Text>
            {' '}{t('andThe')}{' '}
            <Text 
              style={styles.termsLink}
              onPress={() => Linking.openURL(`${OAUTH_BASE_URL}/community-guidelines`)}
            >
              {t('communityGuidelines')}
            </Text>
          </Text>

          <TouchableOpacity style={styles.linkWrap} onPress={() => router.push('/register')} disabled={loading}>
            <Text style={styles.linkText}>{t('dontHaveAccount')}</Text>
            <Text style={styles.linkHighlight}>{t('register')}</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>
            v{Constants.expoConfig?.version ?? '?'}
            {Platform.OS === 'android' && Constants.expoConfig?.android?.versionCode != null
              ? ` (${Constants.expoConfig.android.versionCode})`
              : ''}
          </Text>
          </View>
        </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
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
  diceFallback: {
    backgroundColor: '#ffffff',
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
    position: 'relative',
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
  appleButton: {
    marginTop: 10,
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
  appleIconWrap: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: GRAY_700,
  },
  appleButtonText: {
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
  termsNotice: {
    marginTop: 16,
    fontSize: 12,
    color: GRAY_500,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#fbae17',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  versionText: {
    marginTop: 24,
    fontSize: 12,
    color: GRAY_500,
    textAlign: 'center',
  },
  inputWithRight: {
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
});
