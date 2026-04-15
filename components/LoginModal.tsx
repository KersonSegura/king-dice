'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { X, Mail, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import TwoFactorModal from './TwoFactorModal';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login } = useAuth();
  const tAuth = useTranslations('auth');
  const [hasFixedHeaderOffset, setHasFixedHeaderOffset] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<{
    userId: string;
    email: string;
    username: string;
  } | null>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const mousedownStartedInsideRef = useRef(false);

  // Password requirement checks
  const passwordRequirements = {
    minLength: formData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.password),
    hasLowercase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
  };

  // Load saved credentials on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUsername = localStorage.getItem('kingdice_saved_username');
      const savedPassword = localStorage.getItem('kingdice_saved_password');
      
      if (savedUsername && savedPassword) {
        setFormData(prev => ({
          ...prev,
          username: savedUsername,
          password: savedPassword
        }));
        setRememberPassword(true);
      }
    }
  }, []);

  // Center relative to visible content area (under fixed header) on web.
  // In embed (mobile WebView) there is no fixed header, so don't offset.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const isEmbed = document.body.classList.contains('embed');
      setHasFixedHeaderOffset(!isEmbed);
    } catch {
      setHasFixedHeaderOffset(true);
    }
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }

    return () => {
      if (isOpen) {
        unlockBodyScroll();
      }
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (isRegistering) {
      // Client-side validation for registration
      if (!formData.username || !formData.email || !formData.password) {
        setError('All fields are required');
        setIsLoading(false);
        return;
      }

      if (formData.username.length < 3) {
        setError('Username must be at least 3 characters');
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      // Password requirements: at least 8 characters, 1 uppercase, 1 lowercase, 1 number
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        setIsLoading(false);
        return;
      }

      if (!/[A-Z]/.test(formData.password)) {
        setError('Password must contain at least one uppercase letter');
        setIsLoading(false);
        return;
      }

      if (!/[a-z]/.test(formData.password)) {
        setError('Password must contain at least one lowercase letter');
        setIsLoading(false);
        return;
      }

      if (!/[0-9]/.test(formData.password)) {
        setError('Password must contain at least one number');
        setIsLoading(false);
        return;
      }

      if (!acceptedTerms) {
        setError(tAuth('mustAcceptTerms'));
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password
          }),
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          
          // Check if email verification is required
          if (data.requiresVerification) {
            // Show verification modal
            // For new registrations, userId is empty - we use email for verification
            setTwoFactorData({
              userId: data.user.id || '', // Empty for new registrations
              email: data.user.email,
              username: data.user.username
            });
            setShowTwoFactor(true);
            setError(''); // Clear any errors
          } else {
            // Registration complete, log in
          login(data.user, data.token);
          onClose();
          setFormData({ username: '', email: '', password: '', confirmPassword: '' });
          setShowPassword(false);
          setShowConfirmPassword(false);
          }
        } else {
          let errorMessage = 'Registration failed. Please try again.';
          try {
          const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
            console.error('Registration error response:', errorData);
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            const text = await response.text();
            console.error('Error response text:', text);
            errorMessage = `Registration failed with status ${response.status}. Please try again.`;
          }
          setError(errorMessage);
        }
      } catch (error) {
        console.error('Registration error:', error);
        setError('Network error. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login logic - validate empty fields first (no popup)
      if (!formData.username.trim() || !formData.password) {
        setError('Please enter username and password');
        setIsLoading(false);
        return;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            rememberMe: rememberPassword
          }),
          credentials: 'include',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          
          // Check if 2FA is required
          if (data.requiresTwoFactor) {
            setTwoFactorData({
              userId: data.userId,
              email: formData.email || formData.username, // Use email if available, otherwise username
              username: formData.username
            });
            setShowTwoFactor(true);
            setIsLoading(false);
            return;
          }
          
          // Regular login success
          login(data.user, data.token);
          
          // Save credentials to localStorage if remember password is checked
          if (rememberPassword && typeof window !== 'undefined') {
            localStorage.setItem('kingdice_saved_username', formData.username);
            localStorage.setItem('kingdice_saved_password', formData.password);
          } else if (typeof window !== 'undefined') {
            // Clear saved credentials if remember password is unchecked
            localStorage.removeItem('kingdice_saved_username');
            localStorage.removeItem('kingdice_saved_password');
          }
          
          onClose();
          setFormData({ username: '', email: '', password: '', confirmPassword: '' });
          setShowPassword(false);
          setShowConfirmPassword(false);
        } else {
          // Auth failure (401) or other error - show inline red text
          const isAuthFailure = response.status === 401 || response.status === 400;
          setError(isAuthFailure ? 'Incorrect username or password' : 'Connection error. Please try again.');
        }
      } catch (error) {
        console.error('Login error:', error);
        if (error instanceof Error && error.name === 'AbortError') {
          setError('Connection timed out. Please try again.');
        } else if (error instanceof Error && error.message.includes('<!DOCTYPE')) {
          setError('Database connection timeout. The database may be temporarily unavailable. Please try again in a few minutes.');
        } else {
          setError('Network error. Please check your connection and try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if mousedown started outside the modal content
    if (!mousedownStartedInsideRef.current) {
      onClose();
    }
    // Reset the ref for next interaction
    mousedownStartedInsideRef.current = false;
  };

  const handleModalContentMouseDown = (e: React.MouseEvent) => {
    // Mark that mousedown started inside the modal
    mousedownStartedInsideRef.current = true;
  };

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Reset after click completes
    mousedownStartedInsideRef.current = false;
  };

  if (!isOpen) return null;

  // The site uses a fixed header (~4rem) and body padding-top.
  // We want the modal to feel centered in the *visible* area, but slightly higher than true center.
  const topOffset = hasFixedHeaderOffset ? '3rem' : '0px';
  const height = hasFixedHeaderOffset ? 'calc(100dvh - 3rem)' : '100dvh';

  return (
    <div 
      className="fixed left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4"
      style={
        { top: topOffset, height, overscrollBehavior: 'none', touchAction: 'none' }
      }
      onWheel={(e) => {
        // Extra safety: if any scroll escapes lockBodyScroll, block it at the overlay.
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      onClick={handleBackdropClick}
      onMouseDown={(e) => {
        // If mousedown is on backdrop, mark that it didn't start inside
        if (e.target === e.currentTarget) {
          mousedownStartedInsideRef.current = false;
        }
      }}
    >
      <div 
        ref={modalContentRef}
        data-scroll-lock-root
        className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        style={hasFixedHeaderOffset ? { transform: 'translateY(-0.75rem)', touchAction: 'auto', overscrollBehavior: 'contain' } : { touchAction: 'auto', overscrollBehavior: 'contain' }}
        onMouseDown={handleModalContentMouseDown}
        onClick={handleModalContentClick}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold">
            {isRegistering ? tAuth('signUp') : tAuth('signIn')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isRegistering ? 'Username' : 'Username or Email'}
            </label>
            <div className="relative">
                             <Image
                 src="/ProfileIconOff.svg"
                 alt="Profile Icon"
                 width={20}
                 height={20}
                 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
               />
              <input
                type="text"
                value={formData.username}
                onChange={(e) => { setFormData({ ...formData, username: e.target.value }); setError(''); }}
                placeholder={isRegistering ? "Enter username" : "Enter username or email"}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required={isRegistering}
              />
            </div>
          </div>

          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Image
                src="/LockIcon.svg"
                alt="Lock Icon"
                width={20}
                height={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setError(''); }}
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required={isRegistering}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Image
                  src="/LockIcon.svg"
                  alt="Lock Icon"
                  width={20}
                  height={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {!isRegistering && (
            <div className="flex items-center">
              <input
                id="remember-password"
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRememberPassword(checked);
                  
                  // Clear saved credentials immediately when unchecked
                  if (!checked && typeof window !== 'undefined') {
                    localStorage.removeItem('kingdice_saved_username');
                    localStorage.removeItem('kingdice_saved_password');
                  }
                }}
                className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-password" className="ml-2 block text-sm text-gray-700">
                Remember my password
              </label>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          {isRegistering && (
            <div className="text-xs sm:text-sm bg-gray-50 p-2 sm:p-3 rounded-md">
              <div className="text-gray-700 font-medium mb-1.5 sm:mb-2 text-xs sm:text-sm">Password Requirements:</div>
              <div className="grid grid-cols-1 gap-1 sm:gap-1.5">
                <div className={`flex items-center transition-colors ${passwordRequirements.minLength ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="mr-1.5 sm:mr-2 font-bold text-xs">{passwordRequirements.minLength ? '✓' : '✗'}</span>
                  <span className="text-xs sm:text-sm">At least 8 characters</span>
                </div>
                <div className={`flex items-center transition-colors ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="mr-1.5 sm:mr-2 font-bold text-xs">{passwordRequirements.hasUppercase ? '✓' : '✗'}</span>
                  <span className="text-xs sm:text-sm">At least one uppercase letter</span>
                </div>
                <div className={`flex items-center transition-colors ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="mr-1.5 sm:mr-2 font-bold text-xs">{passwordRequirements.hasLowercase ? '✓' : '✗'}</span>
                  <span className="text-xs sm:text-sm">At least one lowercase letter</span>
                </div>
                <div className={`flex items-center transition-colors ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="mr-1.5 sm:mr-2 font-bold text-xs">{passwordRequirements.hasNumber ? '✓' : '✗'}</span>
                  <span className="text-xs sm:text-sm">At least one number</span>
                </div>
              </div>
            </div>
          )}

          {isRegistering && (
            <div className="flex items-start">
              <input
                id="accept-terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-4 w-4 mt-0.5 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="accept-terms" className="ml-2 block text-sm text-gray-700">
                {tAuth('iAgreeToThe')}{' '}
                <a 
                  href="/terms-of-service" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:text-primary-600 underline"
                >
                  {tAuth('termsOfService')}
                </a>
                {' '}{tAuth('andThe')}{' '}
                <a 
                  href="/community-guidelines" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:text-primary-600 underline"
                >
                  {tAuth('communityGuidelines')}
                </a>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-500 text-white py-2 px-4 rounded-md hover:bg-primary-500/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isRegistering ? tAuth('creatingAccount') : tAuth('signingIn')}
              </>
            ) : (
              isRegistering ? tAuth('signUp') : tAuth('signIn')
            )}
          </button>
        </form>

        {/* OAuth Sign In Options */}
        {!isRegistering && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  setIsLoading(true);
                  setError('');
                  try {
                    // OAuth requires a redirect to Google's consent screen
                    // Get clean return URL without error parameters
                    const currentUrl = new URL(window.location.href);
                    currentUrl.searchParams.delete('error');
                    currentUrl.searchParams.delete('callbackUrl');
                    const cleanReturnUrl = currentUrl.toString();
                    
                    // Store callback info in sessionStorage to sync after redirect
                    sessionStorage.setItem('oauth_provider', 'google');
                    sessionStorage.setItem('oauth_callback', cleanReturnUrl);
                    sessionStorage.removeItem('loginModalOpen');
                    
                    // Redirect to Google OAuth consent screen. Use same origin for callback so cookies/state match (www vs non-www).
                    await signIn(
                      'google',
                      {
                        callbackUrl: `${window.location.origin}/api/auth/callback/google-complete?return=${encodeURIComponent(cleanReturnUrl)}`,
                      },
                      { redirect_uri: `${window.location.origin}/api/auth/callback/google` }
                    );
                  } catch (error) {
                    console.error('Google sign-in error:', error);
                    setError('Failed to sign in with Google. Please try again.');
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-2.5 px-4 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium">{tAuth('continueWithGoogle')}</span>
              </button>
            </div>

            <p className="mt-4 text-xs text-center text-gray-500">
              {tAuth('byContinuingYouAgree')}{' '}
              <a 
                href="/terms-of-service" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600 underline"
              >
                {tAuth('termsOfService')}
              </a>
              {' '}{tAuth('andThe')}{' '}
              <a 
                href="/community-guidelines" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600 underline"
              >
                {tAuth('communityGuidelines')}
              </a>
            </p>
          </>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setFormData({ username: '', email: '', password: '', confirmPassword: '' });
              setShowPassword(false);
              setShowConfirmPassword(false);
              setRememberPassword(false);
              setIsLoading(false);
            }}
            disabled={isLoading}
            className="text-primary-500 hover:text-primary-500/90 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegistering 
              ? tAuth('alreadyHaveAccount') 
              : tAuth('dontHaveAccount')
            }
          </button>
        </div>
      </div>
      
      {/* Two-Factor Authentication Modal */}
      {showTwoFactor && twoFactorData && (
        <TwoFactorModal
          isOpen={showTwoFactor}
          onClose={() => {
            setShowTwoFactor(false);
            setTwoFactorData(null);
          }}
          userId={twoFactorData.userId}
          email={twoFactorData.email}
          username={twoFactorData.username}
          onSuccess={(user, token) => {
            login(user, token);
            onClose();
            setFormData({ username: '', email: '', password: '', confirmPassword: '' });
            setShowPassword(false);
            setShowConfirmPassword(false);
          }}
          isRegistration={isRegistering} // Pass registration flag so modal knows email was already sent
        />
      )}
    </div>
  );
} 