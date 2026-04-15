'use client';

import { Suspense, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginModal from '@/components/LoginModal';
import { useAuth } from '@/contexts/AuthContext';

export type SignInClientProps = {
  /**
   * True when opened via Next.js intercepting route: underlying page stays mounted.
   * Close uses router.back() so behavior matches a modal dismiss.
   */
  intercepted?: boolean;
};

function SignInInner({ intercepted = false }: SignInClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const getSafeRedirect = useCallback(() => {
    const raw =
      searchParams.get('callbackUrl') ??
      searchParams.get('return') ??
      searchParams.get('next') ??
      '/';
    if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) {
      return '/';
    }
    return raw;
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getSafeRedirect());
    }
  }, [isAuthenticated, isLoading, router, getSafeRedirect]);

  const handleClose = useCallback(() => {
    if (intercepted) {
      router.back();
    } else {
      router.push(getSafeRedirect());
    }
  }, [intercepted, router, getSafeRedirect]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" aria-hidden />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <LoginModal isOpen onClose={handleClose} />;
}

function SignInFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" aria-hidden />
    </div>
  );
}

export function SignInClient(props: SignInClientProps) {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInInner {...props} />
    </Suspense>
  );
}
