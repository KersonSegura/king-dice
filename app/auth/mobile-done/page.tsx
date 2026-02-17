'use client';

import { useEffect, useState } from 'react';

function getCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

export default function MobileDonePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'redirecting'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Mobile app WebView: after Google OAuth we're redirected here with ?code= (no cookies needed)
        const code = getCodeFromUrl();
        if (code) {
          const res = await fetch(`/api/auth/mobile-exchange-code?code=${encodeURIComponent(code)}`);
          if (cancelled) return;
          if (res.ok) {
            const data = await res.json();
            const isWebView = typeof (window as any).ReactNativeWebView !== 'undefined';
            const isAppBrowser = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('redirect') === 'app';
            const appRedirectUri = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('app_redirect_uri') : null;
            if (isWebView) {
              (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'auth', token: data.token, user: data.user }));
            } else if (isAppBrowser && data.token) {
              // Redirect to the app's redirect URI (exp:// in Expo Go, kingdice:// in production) so openAuthSessionAsync receives the token
              const base = appRedirectUri || 'kingdice://auth';
              const sep = base.includes('?') ? '&' : '?';
              const backToApp = `${base}${sep}token=${encodeURIComponent(data.token)}&user=${encodeURIComponent(JSON.stringify(data.user))}`;
              window.location.href = backToApp;
              return;
            }
          } else {
            setError('Session expired. Please try again.');
          }
          setStatus('success');
          return;
        }

        // Web or first load: use cookie session
        const res = await fetch('/api/auth/mobile-session-token', { credentials: 'include' });
        if (cancelled) return;

        if (res.status === 401) {
          setStatus('redirecting');
          const returnUrl = `${window.location.origin}/auth/mobile-done`;
          const callbackUrl = `${window.location.origin}/api/auth/callback/google-complete?return=${encodeURIComponent(returnUrl)}`;
          window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
          return;
        }

        if (!res.ok) {
          setError('Could not get session');
          setStatus('success');
          return;
        }

        const data = await res.json();
        if (data.token && data.user && typeof (window as any).ReactNativeWebView !== 'undefined') {
          (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'auth', token: data.token, user: data.user }));
        }
        setStatus('success');
      } catch (e) {
        if (!cancelled) {
          setError('Something went wrong');
          setStatus('success');
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, []);

  if (status === 'redirecting') {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Redirecting to sign in…</p>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : <p>You’re signed in. You can close this window and return to the app.</p>}
    </div>
  );
}
