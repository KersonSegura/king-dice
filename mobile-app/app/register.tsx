/**
 * Registration screen - matches web Create Account form:
 * Username, Email, Password, Confirm Password, password requirements, Create Account, Sign in with Google.
 */

import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../config/api';
import GoogleSignInWebView from '../components/GoogleSignInWebView';
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
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [showGoogleWebView, setShowGoogleWebView] = useState(false);
  const { register, verifyEmail, verifyAuth } = useAuth();
  const router = useRouter();

  // Password requirement checks (same as web LoginModal)
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (username.trim().length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      Alert.alert('Error', 'Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(password)) {
      Alert.alert('Error', 'Password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      Alert.alert('Error', 'Password must contain at least one number');
      return;
    }

    try {
      setLoading(true);
      const result = await register(username.trim(), email.trim(), password);
      if (result?.requiresVerification && result.user) {
        setPendingVerificationEmail(result.user.email);
        return;
      }
      setTimeout(() => router.replace('/(tabs)'), 50);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6 || !pendingVerificationEmail) {
      Alert.alert('Error', 'Please enter the 6-digit code from your email');
      return;
    }
    try {
      setVerifyLoading(true);
      await verifyEmail(pendingVerificationEmail, code);
      setTimeout(() => router.replace('/(tabs)'), 50);
    } catch (error: any) {
      Alert.alert('Verification Failed', (error as Error).message || 'Invalid or expired code');
    } finally {
      setVerifyLoading(false);
    }
  };

  const base = typeof API_BASE_URL === 'string' ? API_BASE_URL.replace(/\/$/, '') : 'https://kingdice.gg';
  const mobileDoneUrl = `${base}/auth/mobile-done`;

  const handleGoogleSignIn = () => setShowGoogleWebView(true);

  const handleGoogleSuccess = async (token: string) => {
    await apiClient.setToken(token);
    await verifyAuth();
    setShowGoogleWebView(false);
    setTimeout(() => router.replace('/(tabs)'), 50);
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.verifyHint}>
            We sent a 6-digit code to {pendingVerificationEmail}. Enter it below.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor={GRAY_500}
            value={verificationCode}
            onChangeText={(v) => setVerificationCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.primaryButton, verifyLoading && styles.primaryButtonDisabled]}
            onPress={handleVerifyCode}
            disabled={verifyLoading}
          >
            {verifyLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkWrap} onPress={() => setPendingVerificationEmail(null)}>
            <Text style={styles.linkHighlight}>Use a different email</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create Account</Text>

        {/* Username - ProfileIconOff.svg (bundled) */}
        <Text style={styles.label}>Username</Text>
        <View style={styles.inputWrap}>
          <View style={styles.inputIcon}>
            <ProfileIconOffSvg size={20} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor={GRAY_500}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={20} color={GRAY_500} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter email"
            placeholderTextColor={GRAY_500}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password - LockIcon.svg (bundled) */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrap}>
          <View style={styles.inputIcon}>
            <LockIconSvg size={20} />
          </View>
          <TextInput
            style={[styles.input, styles.inputWithRight]}
            placeholder="Password"
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
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputWrap}>
          <View style={styles.inputIcon}>
            <LockIconSvg size={20} />
          </View>
          <TextInput
            style={[styles.input, styles.inputWithRight]}
            placeholder="Confirm password"
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
          <Text style={styles.reqTitle}>Password Requirements:</Text>
          <RequirementRow met={passwordRequirements.minLength} label="At least 8 characters" />
          <RequirementRow met={passwordRequirements.hasUppercase} label="At least one uppercase letter" />
          <RequirementRow met={passwordRequirements.hasLowercase} label="At least one lowercase letter" />
          <RequirementRow met={passwordRequirements.hasNumber} label="At least one number" />
        </View>

        {/* Create Account button */}
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Or continue with */}
        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Continue with Google - classic multi-colored G (same as web) */}
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

        {/* Already have an account? Sign in */}
        <TouchableOpacity
          style={styles.linkWrap}
          onPress={() => router.push('/login')}
          disabled={loading}
        >
          <Text style={styles.linkText}>Already have an account? </Text>
          <Text style={styles.linkHighlight}>Sign in</Text>
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
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: GRAY_700,
    marginBottom: 20,
  },
  verifyHint: {
    fontSize: 14,
    color: GRAY_500,
    marginBottom: 16,
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
});
