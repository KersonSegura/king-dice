'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const t = useTranslations('settings');
  const router = useRouter();
  const { showToast } = useToast();
  const [currentLocale, setCurrentLocale] = useState<string>('en');

  useEffect(() => {
    // Get current locale from cookie
    const locale = document.cookie
      .split('; ')
      .find(row => row.startsWith('locale='))
      ?.split('=')[1] || 'en';
    setCurrentLocale(locale);
  }, []);

  const changeLanguage = async (locale: string) => {
    try {
      // Set cookie
      document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; sameSite=lax`;
      
      // Update state
      setCurrentLocale(locale);
      
      // Refresh the page to apply new locale
      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error('Error changing language:', error);
      showToast('Failed to change language', 'error');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          const newLocale = currentLocale === 'en' ? 'es' : 'en';
          changeLanguage(newLocale);
        }}
        className="w-full flex items-center space-x-3 px-4 py-3 text-sm hover:bg-gray-100 transition-colors rounded-lg"
      >
        <Languages className="w-4 h-4 text-gray-600" />
        <div className="flex-1 text-left">
          <span className="text-sm font-medium">{t('language')}</span>
          <p className="text-xs text-gray-500">
            {currentLocale === 'en' ? t('english') : t('spanish')}
          </p>
        </div>
        <div className="text-xs text-gray-400">
          {currentLocale === 'en' ? 'ES' : 'EN'}
        </div>
      </button>
    </div>
  );
}
