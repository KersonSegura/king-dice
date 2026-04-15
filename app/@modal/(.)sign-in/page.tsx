'use client';

import { SignInClient } from '@/app/sign-in/SignInClient';

/**
 * Intercepts /sign-in on client navigation: keeps the current page under the overlay
 * while the URL shows /sign-in (same modal UX as before, with a shareable address bar).
 */
export default function SignInInterceptPage() {
  return <SignInClient intercepted />;
}
