import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const locales = ['en', 'es'] as const;
const defaultLocale = 'en' as const;

// Spanish-speaking countries
const spanishSpeakingCountries = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY'];

export default getRequestConfig(async () => {
  // Detect locale server-side from cookie or headers
  let locale = defaultLocale;

  try {
    // 1. Check cookie first (user preference)
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('locale')?.value;
    if (cookieLocale && locales.includes(cookieLocale as any)) {
      locale = cookieLocale as typeof defaultLocale;
    } else {
      // 2. Check Accept-Language header
      const headersList = await headers();
      const acceptLanguage = headersList.get('accept-language');
      
      if (acceptLanguage) {
        // Parse Accept-Language header
        const languages = acceptLanguage
          .split(',')
          .map(lang => {
            const [code, q = '1'] = lang.trim().split(';');
            const quality = q.includes('q=') ? parseFloat(q.split('=')[1]) : 1;
            return { code: code.split('-')[0].toLowerCase(), quality };
          })
          .sort((a, b) => b.quality - a.quality);

        for (const lang of languages) {
          if (locales.includes(lang.code as any)) {
            locale = lang.code as typeof defaultLocale;
            break;
          }
        }
      }

      // 3. Check country from geo headers (if available)
      if (locale === defaultLocale) {
        const country = headersList?.get('cf-ipcountry') || headersList?.get('x-vercel-ip-country');
        if (country && spanishSpeakingCountries.includes(country)) {
          locale = 'es';
        }
      }
    }
  } catch (error) {
    // If there's any error accessing cookies/headers, default to English
    console.error('Error detecting locale:', error);
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
