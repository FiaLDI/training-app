import type { Metadata, Viewport } from 'next'
import { Inter, Manrope } from 'next/font/google'
import { SerwistProvider } from '@serwist/turbopack/react'

import { AuthGate } from '@/features/auth-gate/ui/auth-gate'

import './globals.css'

const manrope = Manrope({
  variable: '--font-display',
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
})

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'IronLog',
  description: 'Приложение для учёта тренировок',
  applicationName: 'IronLog',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IronLog',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0b1110',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SerwistProvider
          swUrl="/serwist/sw.js"
          cacheOnNavigation
          reloadOnOnline
        >
          <AuthGate>{children}</AuthGate>
        </SerwistProvider>
      </body>
    </html>
  )
}
