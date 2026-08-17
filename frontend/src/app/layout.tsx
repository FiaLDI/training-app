import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'

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
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  )
}
