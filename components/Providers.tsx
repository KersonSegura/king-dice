'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useState, useMemo } from 'react';
import enMessages from '../messages/en.json';
import esMessages from '../messages/es.json';

interface ProvidersProps {
  children: ReactNode;
}

// Function to get locale from cookie synchronously (must be called on client only)
function getCookieLocale(): string {
  if (typeof window === 'undefined') return 'en';
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('locale='))
    ?.split('=')[1] || 'en';
}

const messagesMap: Record<string, any> = {
  en: enMessages,
  es: esMessages,
};

export default function Providers({ children }: ProvidersProps) {
  // Read locale from window.__NEXT_LOCALE__ set by inline script (prevents flash)
  // Fall back to cookie if window.__NEXT_LOCALE__ is not available
  const initialLocale = useMemo(() => {
    if (typeof window !== 'undefined') {
      // Prefer the value set by the inline script (set before React hydration)
      return (window as any).__NEXT_LOCALE__ || getCookieLocale();
    }
    return 'en';
  }, []);

  const [locale] = useState<string>(initialLocale);
  const messages = messagesMap[locale] || enMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
