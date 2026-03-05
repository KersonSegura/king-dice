'use client';

import { useEffect, useState } from 'react';

function getCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

function isAppRedirectRequest(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') === 'app';
}

/** System browser flow (openAuthSessionAsync): redirect to mobile-callback with token so the app can capture the URL. */
function isSystemBrowserFlow(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('browser') === '1';
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/** Build URL that opens the app with token. On Android use intent URL so the in-app browser hands off to the app instead of showing "Unmatched Route". */
function buildAppRedirect(
  appRedirectUri: string | null,
  token: string,
  user: { id: string; username: string; email: string; avatar?: string }
): string {
  const base = appRedirectUri || 'kingdice://auth';
  const sep = base.includes('?') ? '&' : '?';
  const q = `token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(user))}`;
  const customUrl = `${base}${sep}${q}`;
  if (isAndroid()) {
    // Android in-app browser often doesn't hand off kingdice:// to the app; intent URL forces opening the app.
    const pathAndQuery = `auth?${q}`;
    return `intent://${pathAndQuery}#Intent;scheme=kingdice;package=com.kingdice.app;end`;
  }
  return customUrl;
}

export default function MobileDonePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'redirecting'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [fallbackOpenUrl, setFallbackOpenUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Mobile app WebView: after Google OAuth we're redirected here with ?code= (no cookies needed)
        const code = getCodeFromUrl();
        const appRedirectFlow = isAppRedirectRequest();
        if (code) {
          const res = await fetch(`/api/auth/mobile-exchange-code?code=${encodeURIComponent(code)}`);
          if (cancelled) return;
          if (res.ok) {
            const data = await res.json();
            const isWebView = typeof (window as any).ReactNativeWebView !== 'undefined';
            const isAppBrowser = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('redirect') === 'app';
            const useSystemBrowser = isSystemBrowserFlow();
            const appRedirectUri = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('app_redirect_uri') : null;
            if (isWebView) {
              (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'auth', token: data.token, user: data.user }));
            } else if (useSystemBrowser && data.token && data.user) {
              // System browser (openAuthSessionAsync): redirect to mobile-callback so the app captures the URL
              const params = new URLSearchParams({
                token: data.token,
                user: JSON.stringify(data.user),
              });
              window.location.href = `${window.location.origin}/auth/mobile-callback?${params.toString()}`;
              return;
            } else if (isAppBrowser && data.token) {
              const backToApp = buildAppRedirect(appRedirectUri, data.token, data.user);
              setFallbackOpenUrl(backToApp);
              window.location.href = backToApp;
              // If the in-app browser doesn't hand off (e.g. Chrome blocks programmatic open), show a link so user can tap to open app
              setTimeout(() => {
                if (!cancelled) setStatus('success');
              }, 2000);
              return;
            }
          } else {
            setError('Session expired. Please try again.');
          }
          setStatus('success');
          return;
        }

        // In app redirect flow we expect a one-time code. If it's missing, restart flow via "Try again"
        // instead of attempting the normal website cookie session path.
        if (appRedirectFlow) {
          setError('Session expired. Please try again.');
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

  // Build "Try again" URL for Session expired: clear cookies and restart Google sign-in
  const tryAgainUrl =
    typeof window !== 'undefined' && error === 'Session expired. Please try again.'
      ? (() => {
          const params = new URLSearchParams(window.location.search);
          const appRedirectUri = params.get('app_redirect_uri');
          const returnUrl = `${window.location.origin}/auth/mobile-done?redirect=app${appRedirectUri ? `&app_redirect_uri=${encodeURIComponent(appRedirectUri)}` : ''}`;
          const callbackUrl = `${window.location.origin}/api/auth/callback/google-complete?return=${encodeURIComponent(returnUrl)}`;
          return `${window.location.origin}/api/auth/clear-for-mobile?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        })()
      : null;

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {!error && <p>You’re signed in. You can close this window and return to the app.</p>}
      {tryAgainUrl && (
        <p style={{ marginTop: 16 }}>
          <a href={tryAgainUrl} style={{ color: '#2563eb', fontWeight: 600 }}>Try again</a>
          {' — sign in with a fresh session.'}
        </p>
      )}
      {fallbackOpenUrl && (
        <p style={{ marginTop: 16 }}>
          <a href={fallbackOpenUrl} style={{ color: '#2563eb', fontWeight: 600 }}>Tap here to open King Dice</a>
          {' if the app did not open.'}
        </p>
      )}
    </div>
  );
}
