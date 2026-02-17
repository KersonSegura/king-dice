/**
 * In-memory one-time codes for mobile WebView OAuth.
 * After Google sign-in, we redirect to /auth/mobile-done?code=XXX so the app
 * can get the token without relying on cookies (which often don't work in WebViews).
 */

import crypto from 'crypto';

const TTL_MS = 120 * 1000; // 2 minutes

interface StoredCode {
  token: string;
  user: { id: string; username: string; email: string; avatar?: string };
  expiresAt: number;
}

const store = new Map<string, StoredCode>();

function prune() {
  const now = Date.now();
  for (const [code, data] of store.entries()) {
    if (data.expiresAt <= now) store.delete(code);
  }
}

export function setMobileAuthCode(
  code: string,
  token: string,
  user: { id: string; username: string; email: string; avatar?: string }
): void {
  prune();
  store.set(code, {
    token,
    user,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function consumeMobileAuthCode(code: string): StoredCode | null {
  const data = store.get(code);
  if (!data) return null;
  if (data.expiresAt <= Date.now()) {
    store.delete(code);
    return null;
  }
  store.delete(code);
  return data;
}

export function generateCode(): string {
  return crypto.randomBytes(24).toString('hex');
}
