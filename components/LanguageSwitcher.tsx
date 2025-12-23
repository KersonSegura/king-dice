'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Languages, ChevronDown, Check } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

export default function LanguageSwitcher() {
  const t = useTranslations('settings');
  const router = useRouter();
  const { showToast } = useToast();
  const [currentLocale, setCurrentLocale] = useState<string>('en');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get current locale from cookie
    const locale = document.cookie
      .split('; ')
      .find(row => row.startsWith('locale='))
      ?.split('=')[1] || 'en';
    setCurrentLocale(locale);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const changeLanguage = async (locale: string) => {
    try {
      // Set cookie
      document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; sameSite=lax`;
      
      // Update state
      setCurrentLocale(locale);
      setIsOpen(false);
      
      // Refresh the page to apply new locale
      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error('Error changing language:', error);
      showToast('Failed to change language', 'error');
    }
  };

  const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center space-x-3 px-6 py-3 text-gray-700 hover:bg-gray-50 transition-all duration-200 group"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 group-hover:bg-blue-100 transition-colors">
          <Languages className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-medium block">{t('language')}</span>
          <span className="text-xs text-gray-500">
            {currentLanguage.nativeName}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {currentLocale.toUpperCase()}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                currentLocale === language.code ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-semibold ${
                  currentLocale === language.code 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {language.code.toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{language.nativeName}</div>
                  <div className="text-xs text-gray-500">{language.name}</div>
                </div>
              </div>
              {currentLocale === language.code && (
                <Check className="w-4 h-4 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
