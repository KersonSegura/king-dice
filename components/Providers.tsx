'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';
import enMessages from '../messages/en.json';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [locale, setLocale] = useState<string>('en');
  const [messages, setMessages] = useState<any>(enMessages); // Default to English messages for SSR

  useEffect(() => {
    // Client-side only: Get locale from cookie or default to 'en'
    const getCookieLocale = () => {
      if (typeof window === 'undefined') return 'en';
      return document.cookie
        .split('; ')
        .find(row => row.startsWith('locale='))
        ?.split('=')[1] || 'en';
    };

    const cookieLocale = getCookieLocale();
    
    // Only load messages if locale is different from default
    if (cookieLocale !== 'en') {
      setLocale(cookieLocale);
      // Load messages dynamically
      import(`../messages/${cookieLocale}.json`)
        .then((module) => {
          setMessages(module.default);
        })
        .catch((error) => {
          console.error(`Failed to load messages for locale ${cookieLocale}, keeping English`, error);
          // Keep English messages on error
        });
    }
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
