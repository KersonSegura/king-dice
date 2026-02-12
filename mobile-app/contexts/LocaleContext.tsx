'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

const STORAGE_KEY = 'kd_mobile_locale';
export type Locale = 'en' | 'es';

const en = require('../translations/en.json') as Record<string, string>;
const es = require('../translations/es.json') as Record<string, string>;
const messages: Record<Locale, Record<string, string>> = { en, es };

function getDeviceLocale(): Locale {
  try {
    const locales = Localization.getLocales();
    const tag = locales?.[0]?.languageTag ?? Localization.locale ?? '';
    if (tag.startsWith('es')) return 'es';
  } catch (_) {}
  return 'en';
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getDeviceLocale());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'es' || stored === 'en') setLocaleState(stored);
      setReady(true);
    });
  }, []);

  const setLocale = useCallback(async (next: Locale) => {
    setLocaleState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string>): string => {
      const dict = messages[locale] ?? en;
      let value = dict[key];
      if (value == null) value = en[key] ?? key;
      if (params) {
        Object.keys(params).forEach((k) => {
          value = value!.replace(new RegExp(`{{${k}}}`, 'g'), params[k]);
        });
      }
      return value ?? key;
    },
    [locale]
  );

  const value: LocaleContextValue = { locale, setLocale, t };
  return (
    <LocaleContext.Provider value={value}>
      <React.Fragment key={locale}>{children}</React.Fragment>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
