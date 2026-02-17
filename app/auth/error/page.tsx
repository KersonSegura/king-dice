'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

const ERROR_KEYS = [
  'Configuration', 'AccessDenied', 'Verification', 'OAuthCallback', 'OAuthSignin',
  'OAuthCreateAccount', 'EmailCreateAccount', 'Callback', 'OAuthAccountNotLinked',
  'EmailSignin', 'CredentialsSignin', 'SessionRequired',
];

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('authError');

  useEffect(() => {
    const errorParam = searchParams.get('error');
    setError(errorParam);

    if (errorParam) {
      console.error('🔴 NextAuth Error:', errorParam);
      console.error('🔴 All search params:', Object.fromEntries(searchParams.entries()));
    }
  }, [searchParams]);

  const errorMessage = error && ERROR_KEYS.includes(error) ? t(error) : t('Default');

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
            {t('title')}
          </h1>

          <p className="text-gray-600 mb-6">
            {errorMessage}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-700 font-mono break-all">
                {t('errorCode')}: <strong>{error}</strong>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-[#fbae17] hover:bg-[#fbae17] text-white font-semibold py-2 px-4 rounded-lg transition-colors text-center"
            >
              {t('goToHome')}
            </Link>

            <Link
              href="/"
              className="flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('tryAgain')}
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {t('contactSupport')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
