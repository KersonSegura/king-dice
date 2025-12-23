'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [locale, setLocale] = useState<string>('en');
  const [messages, setMessages] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted (client-side only)
    setIsMounted(true);

    // Get locale from cookie or default to 'en'
    const getCookieLocale = () => {
      if (typeof window === 'undefined') return 'en';
      return document.cookie
        .split('; ')
        .find(row => row.startsWith('locale='))
        ?.split('=')[1] || 'en';
    };

    const cookieLocale = getCookieLocale();
    setLocale(cookieLocale);

    // Load messages dynamically
    const loadMessages = async () => {
      try {
        const module = await import(`../messages/${cookieLocale}.json`);
        setMessages(module.default);
      } catch (error) {
        console.error(`Failed to load messages for locale ${cookieLocale}, falling back to English`, error);
        // Fallback to English if locale file not found
        try {
          const fallbackModule = await import(`../messages/en.json`);
          setMessages(fallbackModule.default);
          setLocale('en');
        } catch (fallbackError) {
          console.error('Failed to load English messages', fallbackError);
          // Last resort: empty messages object
          setMessages({});
        }
      }
    };

    loadMessages();
  }, []);

  // During SSR or initial render, just render children without i18n
  // After client-side hydration, wrap with NextIntlClientProvider
  if (!isMounted || !messages) {
    return <>{children}</>;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
