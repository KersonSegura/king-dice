import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import Header from '@/components/Header'
import { AuthProvider } from '@/contexts/AuthContext'
import { LevelUpProvider } from '@/contexts/LevelUpContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { ChatStateProvider } from '@/contexts/ChatStateContext'
import ToastContainer from '@/components/ToastContainer'
import FloatingChat from '@/components/FloatingChat'
import BackToTopButton from '@/components/BackToTopButton'
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

  // Add global error handler to catch translation errors
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      if (event.message?.includes('t is not defined') || event.message?.includes('ReferenceError: t')) {
        console.error('🔴 [Global Error Handler] Translation error caught:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
          stack: event.error?.stack
        });
        
        // Try to get more info from the source
        console.error('🔴 [Global Error Handler] Full error object:', event);
        console.error('🔴 [Global Error Handler] Error target:', event.target);
      }
    });
    
    // Also catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('t is not defined') || event.reason?.message?.includes('ReferenceError: t')) {
        console.error('🔴 [Global Error Handler] Unhandled promise rejection with t error:', event.reason);
      }
    });
  }

  return (
    <html lang={locale}>
      <body className={`${inter.className}`} suppressHydrationWarning={true}>
        <Providers locale={locale} messages={messages}>
          <ErrorBoundary>
          <LevelUpProvider>
            <AuthProvider>
              <SocketProvider>
                <ChatStateProvider>
                  <ToastProvider>
                    <Header />
                    {children}
                    <FloatingChat />
                    <BackToTopButton />
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