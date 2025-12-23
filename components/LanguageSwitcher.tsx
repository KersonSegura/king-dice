'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Languages, ChevronRight } from 'lucide-react';

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
    <button
      onClick={() => {
        const newLocale = currentLocale === 'en' ? 'es' : 'en';
        changeLanguage(newLocale);
      }}
      className="w-full flex items-center space-x-3 px-6 py-3 text-gray-700 hover:bg-gray-50 transition-all duration-200 group"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 group-hover:bg-blue-100 transition-colors">
        <Languages className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 text-left">
        <span className="text-sm font-medium block">{t('language')}</span>
        <span className="text-xs text-gray-500">
          {currentLocale === 'en' ? t('english') : t('spanish')}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
          {currentLocale === 'en' ? 'EN' : 'ES'}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
