import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './test.css'
import Header from '@/components/Header'
import { AuthProvider } from '@/contexts/AuthContext'
import { LevelUpProvider } from '@/contexts/LevelUpContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { ChatStateProvider } from '@/contexts/ChatStateContext'
import ToastContainer from '@/components/ToastContainer'
import FloatingChat from '@/components/FloatingChat'
import BackToTopButton from '@/components/BackToTopButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'King Dice - Find the rules for your favorite games',
  description: 'The best board game rules database in English. Search and find the rules for Exploding Kittens and thousands of other games.',
  keywords: 'board games, rules, exploding kittens, games, english',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
      </body>
    </html>
  )
} 