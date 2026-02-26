'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const SESSION_KEY = 'kd_analytics_session_id';
const LAST_SENT_KEY = 'kd_analytics_last_event';
const MIN_REPEAT_MS = 15000;

function getOrCreateSessionId() {
  if (typeof window === 'undefined') return '';
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  window.sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const pathWithQuery = useMemo(
    () => `${pathname || '/'}${search?.toString() ? `?${search.toString()}` : ''}`,
    [pathname, search]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sessionId = getOrCreateSessionId();
    const now = Date.now();
    const lastRaw = window.sessionStorage.getItem(LAST_SENT_KEY);
    if (lastRaw) {
      try {
        const last = JSON.parse(lastRaw) as { path: string; ts: number };
        if (last.path === pathWithQuery && now - last.ts < MIN_REPEAT_MS) {
          return;
        }
      } catch {
        // Ignore parse failures and continue.
      }
    }

    const source = window.navigator.userAgent.includes('wv') ? 'app' : 'web';

    void fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathWithQuery,
        sessionId,
        source,
      }),
      keepalive: true,
    });

    window.sessionStorage.setItem(LAST_SENT_KEY, JSON.stringify({ path: pathWithQuery, ts: now }));
  }, [pathWithQuery]);

  return null;
}

