'use client';

/**
 * OAuth redirect target for system browser (Chrome Custom Tabs / ASWebAuthenticationSession).
 * When the app uses WebBrowser.openAuthSessionAsync, this URL is the redirect target.
 * mobile-done redirects here with ?token=...&user=... after successful auth.
 * The page shows a brief message; the app captures the URL and parses token/user.
 */

export default function MobileCallbackPage() {
  return (
    <div style={{ padding: 24, textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <p style={{ fontSize: 18, color: '#374151' }}>Sign-in complete. You can close this window and return to the app.</p>
    </div>
  );
}
