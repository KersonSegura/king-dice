'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const errorParam = searchParams.get('error');
    setError(errorParam);
    
    // Log to console for debugging
    console.error('🔴 NextAuth Error:', errorParam);
    console.error('🔴 All search params:', Object.fromEntries(searchParams.entries()));
  }, [searchParams]);

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The verification token has expired or has already been used.',
    OAuthCallback: 'Error in OAuth callback. Check server logs for details.',
    OAuthSignin: 'Error in OAuth sign-in process.',
    OAuthCreateAccount: 'Could not create OAuth account.',
    EmailCreateAccount: 'Could not create email account.',
    Callback: 'Error in callback handler.',
    OAuthAccountNotLinked: 'An account with this email already exists. Please sign in with your original method.',
    EmailSignin: 'Error sending email.',
    CredentialsSignin: 'Sign in failed. Check your credentials.',
    SessionRequired: 'Please sign in to access this page.',
    Default: 'An unexpected error occurred.',
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Error
          </h1>
          
          <p className="text-gray-600 mb-6">
            {errorMessage}
          </p>
          
          {error && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-700 font-mono break-all">
              Error Code: <strong>{error}</strong>
            </p>
          </div>
          )}
          
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-[#fbae17] hover:bg-[#e0990f] text-white font-semibold py-2 px-4 rounded-lg transition-colors text-center"
            >
              Go to Home
            </Link>
            
            <Link
              href="/"
              className="flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Try Again
            </Link>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              If this problem persists, please contact support with the error code above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
