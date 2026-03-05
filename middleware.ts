import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

// Supported locales
export const locales = ['en', 'es'] as const;
export const defaultLocale = 'en' as const;

// Countries that should default to Spanish
const spanishSpeakingCountries = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY'];

// Detect locale from request
function detectLocale(request: NextRequest): string {
  // 1. Check cookie first (user preference)
  const cookieLocale = request.cookies.get('locale')?.value;
  if (cookieLocale && locales.includes(cookieLocale as any)) {
    return cookieLocale;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,es;q=0.8")
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
        return lang.code;
      }
    }
  }

  // 3. Check country from Cloudflare/Vercel geo headers (if available)
  const country = request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country');
  if (country && spanishSpeakingCountries.includes(country)) {
    return 'es';
  }

  // 4. Default to English (especially for US)
  return defaultLocale;
}

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // App WebView: never show Header/FloatingChat. Detect via cookie (set on first load, sent on all navigations)
  const requestHeaders = new Headers(request.headers);
  const hasEmbedCookie = request.cookies.get('kd-embed')?.value === '1';
  const hasEmbedParam = request.nextUrl.searchParams.get('embed') === '1';
  const refererHasEmbed = request.headers.get('referer')?.includes('embed=1');
  if (pathname.startsWith('/embed') || hasEmbedCookie || hasEmbedParam || refererHasEmbed) {
    requestHeaders.set('x-kd-embed', '1');
  }

  // Detect locale
  const locale = detectLocale(request);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set locale cookie if not already set
  if (!request.cookies.get('locale')) {
    response.cookies.set('locale', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax'
    });
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - api routes
  // - _next (Next.js internals)
  // - files with extensions (e.g. .svg, .jpg, etc.)
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
