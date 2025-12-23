'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [locale, setLocale] = useState<string>('en');
  const [messages, setMessages] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get locale from cookie or default to 'en'
    const getCookieLocale = () => {
      if (typeof document === 'undefined') return 'en';
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
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, []);

  // Don't render until messages are loaded to prevent hydration issues
  if (isLoading || !messages) {
    return <>{children}</>;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
