import type { Metadata } from 'next'
import { DM_Sans, Syne } from 'next/font/google'

import { AuthGate } from '@/features/auth-gate/ui/auth-gate'

import './globals.css'

const syne = Syne({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

const dmSans = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
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
    <html lang="ru" className={`${syne.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  )
}
