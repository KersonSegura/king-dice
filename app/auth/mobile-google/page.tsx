'use client';

import { useEffect, useState } from 'react';

/**
 * Mobile app Google sign-in launcher.
 * NextAuth only redirects to Google when you POST to /api/auth/signin/google (with CSRF).
 * GET /api/auth/signin/google redirects to the custom signIn page (/) instead.
 * This page fetches CSRF, then auto-POSTs so the in-app browser goes straight to Google.
 */
export default function MobileGooglePage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get('callbackUrl');
      if (!callbackUrl) {
        if (!cancelled) {
          setError('Missing callbackUrl');
          setStatus('error');
        }
        return;
      }

      try {
        const res = await fetch('/api/auth/csrf', { credentials: 'include' });
        if (cancelled) return;
        if (!res.ok) {
          setError('Could not start sign-in');
          setStatus('error');
          return;
        }
        const { csrfToken } = await res.json();
        if (!csrfToken || cancelled) return;

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/api/auth/signin/google';
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrfToken';
        csrfInput.value = csrfToken;
        form.appendChild(csrfInput);
        const callbackInput = document.createElement('input');
        callbackInput.type = 'hidden';
        callbackInput.name = 'callbackUrl';
        callbackInput.value = callbackUrl;
        form.appendChild(callbackInput);
        document.body.appendChild(form);
        form.submit();
        // After submit, browser follows 302 to Google; no need to update state
      } catch (e) {
        if (!cancelled) {
          setError('Something went wrong');
          setStatus('error');
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, []);

  if (status === 'error') {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#b91c1c' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <p>Redirecting to Google…</p>
    </div>
  );
}
