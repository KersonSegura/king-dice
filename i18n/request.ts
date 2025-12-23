import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // Default locale - actual locale is determined client-side via cookie
  // This is safe for static generation
  const locale = 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
