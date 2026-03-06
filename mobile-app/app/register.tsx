/**
 * Registration screen - matches web Create Account form:
 * Username, Email, Password, Confirm Password, password requirements, Create Account, Sign in with Google.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileIconOffSvg, LockIconSvg } from '../components/BundledAuthIcons';
import GoogleLogoIcon from '../components/GoogleLogoIcon';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiBaseUrl, OAUTH_BASE_URL } from '../config/api';
import { apiClient } from '../lib/api-client';

const PRIMARY = '#fbae17';
const PRIMARY_DARK = '#fbae17';
const GRAY_700 = '#374151';
const GRAY_500 = '#6b7280';
const GRAY_400 = '#9ca3af';
const GRAY_300 = '#d1d5db';
const GRAY_50 = '#f9fafb';
const RED_600 = '#dc2626';
const GREEN_600 = '#16a34a';

export default function RegisterScreen() {
  const { t } = useLocale();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { register, verifyEmail, verifyAuth, isAuthenticated } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // If already signed in, go to app and clear stack so back doesn't return to register
  useEffect(() => {
    if (isAuthenticated) {
      router.dismissAll();
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  // Password requirement checks (same as web LoginModal)
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert(t('errorTitle'), t('registerAllFieldsRequired'));
      return;
    }

    if (username.trim().length < 3) {
      Alert.alert(t('errorTitle'), t('registerUsernameMin'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('errorTitle'), t('registerValidEmail'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('errorTitle'), t('registerPasswordsDontMatch'));
      return;
    }

    if (password.length < 8) {
      Alert.alert(t('errorTitle'), t('registerPasswordMin'));
      return;
    }
    if (!/[A-Z]/.test(password)) {
      Alert.alert(t('errorTitle'), t('registerPasswordUpper'));
      return;
    }
    if (!/[a-z]/.test(password)) {
      Alert.alert(t('errorTitle'), t('registerPasswordLower'));
      return;
    }
    if (!/[0-9]/.test(password)) {
      Alert.alert(t('errorTitle'), t('registerPasswordNumber'));
      return;
    }

    if (!acceptedTerms) {
      Alert.alert(t('errorTitle'), t('mustAcceptTerms'));
      return;
    }

    try {
      setLoading(true);
      const result = await register(username.trim(), email.trim(), password);
      if (result?.requiresVerification && result.user) {
        setPendingVerificationEmail(result.user.email);
        Alert.alert(t('verifyEmailTitle'), t('verifyEmailSpamReminder'));
        return;
      }
      router.dismissAll();
      setTimeout(() => router.replace('/(tabs)'), 50);
    } catch (error: any) {
      Alert.alert(t('registerFailedTitle'), error.message || t('registerFailedMessage'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6 || !pendingVerificationEmail) {
      Alert.alert(t('errorTitle'), t('pleaseEnter6DigitCode'));
      return;
    }
    try {
      setVerifyLoading(true);
      await verifyEmail(pendingVerificationEmail, code);
      router.dismissAll();
      setTimeout(() => router.replace('/(tabs)'), 50);
    } catch (error: any) {
      Alert.alert(t('verificationFailed'), (error as Error).message || t('invalidOrExpiredCode'));
    } finally {
      setVerifyLoading(false);
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
    setOauthError('');
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      const webClientId = Constants.expoConfig?.extra?.googleWebClientId ?? (process as any).env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
      if (!webClientId) {
        setOauthError('Google sign-in not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to mobile-app/.env');
        return;
      }
      GoogleSignin.configure({ webClientId });
      const result = await GoogleSignin.signIn();
      const idToken = result?.type === 'success' ? result.data?.idToken : null;
      if (!idToken) return;
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
        setOauthError(data.message || t('signInFailedTryAgain') || 'Sign-in failed. Please try again.');
      }
    } catch (e: any) {
      if (e?.code === 'SIGN_IN_CANCELLED' || e?.message?.includes('cancel')) return;
      setOauthError(e?.message || t('signInFailedTryAgain') || 'Sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') return;
    setAppleLoading(true);
    setOauthError('');
    try {
      const AppleAuth = await import('expo-apple-authentication');
      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential?.identityToken) return;
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
        setOauthError(data.message || t('signInFailedTryAgain') || 'Sign-in failed. Please try again.');
      }
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
      setOauthError(e?.message || t('signInFailedTryAgain') || 'Sign-in failed. Please try again.');
    } finally {
      setAppleLoading(false);
    }
  };

  const RequirementRow = ({ met, label }: { met: boolean; label: string }) => (
    <View style={styles.reqRow}>
      <Text style={[styles.reqIcon, met ? styles.reqMet : styles.reqUnmet]}>{met ? '✓' : '✗'}</Text>
      <Text style={[styles.reqLabel, met ? styles.reqMet : styles.reqUnmet]}>{label}</Text>
    </View>
  );

  if (pendingVerificationEmail) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.verifyScrollContent,
            {
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 32,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.verifyTitle}>{t('verifyEmailTitle')}</Text>
          <Text style={styles.verifyHint}>
            {t('verifyEmailHint', { email: pendingVerificationEmail ?? '' })}
          </Text>
          <View style={styles.verifyCodeWrap}>
            <TextInput
              style={styles.verifyCodeInput}
              placeholder="000000"
              placeholderTextColor={GRAY_500}
              value={verificationCode}
              onChangeText={(v) => setVerificationCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, verifyLoading && styles.primaryButtonDisabled]}
            onPress={handleVerifyCode}
            disabled={verifyLoading}
          >
            {verifyLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{t('verify')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkWrap, { marginBottom: insets.bottom || 16 }]} onPress={() => setPendingVerificationEmail(null)}>
            <Text style={styles.linkHighlight}>{t('useDifferentEmail')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 28,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{t('createAccountTitle')}</Text>

        {/* Username - ProfileIconOff.svg (bundled) */}
        <Text style={styles.label}>{t('registerUsernameLabel')}</Text>
        <View style={styles.inputWrap}>
          <View style={styles.inputIcon}>
            <ProfileIconOffSvg size={20} />
          </View>
          <TextInput
            style={styles.input}
            placeholder={t('registerUsernamePlaceholder')}
            placeholderTextColor={GRAY_500}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Email */}
        <Text style={styles.label}>{t('authEmailLabel')}</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={20} color={GRAY_500} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('registerEmailPlaceholder')}
            placeholderTextColor={GRAY_500}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password - LockIcon.svg (bundled) */}
        <Text style={styles.label}>{t('passwordLabel')}</Text>
        <View style={styles.inputWrap}>
          <View style={styles.inputIcon}>
            <LockIconSvg size={20} />
          </View>
          <TextInput
            style={[styles.input, styles.inputWithRight]}
            placeholder={t('passwordPlaceholder')}
            placeholderTextColor={GRAY_500}
            value={password}
            onChangeText={setPassword}
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

        {/* Confirm Password - LockIcon.svg (bundled) */}
        <Text style={styles.label}>{t('confirmPasswordLabel')}</Text>
        <View style={styles.inputWrap}>
          <View style={styles.inputIcon}>
            <LockIconSvg size={20} />
          </View>
          <TextInput
            style={[styles.input, styles.inputWithRight]}
            placeholder={t('confirmPasswordPlaceholder')}
            placeholderTextColor={GRAY_500}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={GRAY_500} />
          </TouchableOpacity>
        </View>

        {/* Password Requirements (same as web) */}
        <View style={styles.reqBox}>
          <Text style={styles.reqTitle}>{t('passwordRequirementsTitle')}</Text>
          <RequirementRow met={passwordRequirements.minLength} label={t('registerPasswordMin')} />
          <RequirementRow met={passwordRequirements.hasUppercase} label={t('registerPasswordUpper')} />
          <RequirementRow met={passwordRequirements.hasLowercase} label={t('registerPasswordLower')} />
          <RequirementRow met={passwordRequirements.hasNumber} label={t('registerPasswordNumber')} />
        </View>

        {/* Terms of Service Checkbox */}
        <TouchableOpacity 
          style={styles.termsRow}
          onPress={() => setAcceptedTerms(!acceptedTerms)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
            {acceptedTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.termsText}>
            {t('iAgreeToThe')}{' '}
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
        </TouchableOpacity>

        {/* Create Account button */}
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('createAccountButton')}</Text>
          )}
        </TouchableOpacity>

        {/* Or continue with */}
        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('orContinueWith')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {oauthError ? <Text style={styles.oauthError}>{oauthError}</Text> : null}

        {/* Continue with Google - classic multi-colored G (same as web) */}
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
                  <Ionicons name="logo-apple" size={22} color={GRAY_700} />
                </View>
                <Text style={styles.appleButtonText}>{t('continueWithApple')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Already have an account? Sign in */}
        <TouchableOpacity
          style={styles.linkWrap}
          onPress={() => router.push('/login')}
          disabled={loading}
        >
          <Text style={styles.linkText}>{t('alreadyHaveAccount')}</Text>
          <Text style={styles.linkHighlight}>{t('signIn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
  },
  verifyScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  verifyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: GRAY_700,
    marginBottom: 12,
  },
  verifyHint: {
    fontSize: 14,
    color: GRAY_500,
    marginBottom: 20,
  },
  verifyCodeWrap: {
    borderWidth: 1,
    borderColor: GRAY_300,
    borderRadius: 8,
    marginBottom: 24,
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  verifyCodeInput: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 6,
    color: '#111',
    minHeight: 56,
    maxHeight: 56,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: GRAY_700,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAY_700,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GRAY_300,
    borderRadius: 8,
    marginBottom: 14,
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
  inputWithRight: {
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  reqBox: {
    backgroundColor: GRAY_50,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  reqTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAY_700,
    marginBottom: 8,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reqIcon: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  reqLabel: {
    fontSize: 13,
  },
  reqMet: {
    color: GREEN_600,
  },
  reqUnmet: {
    color: RED_600,
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
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
    marginVertical: 20,
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
  oauthError: {
    color: RED_600,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
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
    minHeight: 48,
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
    minHeight: 48,
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
    marginTop: 20,
  },
  linkText: {
    fontSize: 14,
    color: GRAY_700,
  },
  linkHighlight: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: GRAY_300,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: GRAY_700,
    lineHeight: 20,
  },
  termsLink: {
    color: PRIMARY,
    textDecorationLine: 'underline',
  },
});
