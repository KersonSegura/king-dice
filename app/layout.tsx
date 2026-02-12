import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { cookies, headers } from 'next/headers'
import './globals.css'
import Header from '@/components/Header'
import { AuthProvider } from '@/contexts/AuthContext'
import { LevelUpProvider } from '@/contexts/LevelUpContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { ChatStateProvider } from '@/contexts/ChatStateContext'
import ToastContainer from '@/components/ToastContainer'
import BackToTopButton from '@/components/BackToTopButton'
import FloatingChat from '@/components/FloatingChat'
import Providers from '@/components/Providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import enMessages from '../messages/en.json'
import esMessages from '../messages/es.json'

const inter = Inter({ subsets: ['latin'] })

const messagesMap: Record<string, any> = {
  en: enMessages,
  es: esMessages,
}

export const metadata: Metadata = {
  title: 'King Dice - Find the rules for your favorite games',
  description: 'The best board game rules database in English. Search and find the rules for Exploding Kittens and thousands of other games.',
  keywords: 'board games, rules, exploding kittens, games, english',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Detect locale server-side from cookie
  let locale = 'en';
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('locale')?.value;
    if (cookieLocale && (cookieLocale === 'en' || cookieLocale === 'es')) {
      locale = cookieLocale;
    }
  } catch (error) {
    // If cookies() fails, default to English
    console.error('Error reading locale cookie:', error);
  }

  const messages = messagesMap[locale] || enMessages;

  let isEmbed = false;
  try {
    const hdrs = await headers();
    isEmbed = hdrs.get('x-kd-embed') === '1';
  } catch {
    // headers() can throw in some edge cases
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className}${isEmbed ? ' embed' : ''}`} suppressHydrationWarning>
        <Providers locale={locale} messages={messages}>
          <ErrorBoundary>
          <LevelUpProvider>
            <AuthProvider>
              <SocketProvider>
                <ChatStateProvider>
                  <ToastProvider>
                    {!isEmbed && <Header />}
                    {children}
                    {!isEmbed && <BackToTopButton />}
                    {!isEmbed && <FloatingChat />}
                    <ToastContainer />
                  </ToastProvider>
                </ChatStateProvider>
              </SocketProvider>
            </AuthProvider>
          </LevelUpProvider>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
} 