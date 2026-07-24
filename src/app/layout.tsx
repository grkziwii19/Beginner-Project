import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google' // 1. Impor font Inter dari Next.js
import './globals.css'
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister'

// 2. Konfigurasi font Inter secara optimal
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GR-Assistant',
  description: 'Sistem manajemen kelas untuk guru — absensi, nilai, dan laporan',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GR Assistant',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4f46e5',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      {/* 
        3. Tag <head> manual dihapus sepenuhnya. 
        Next.js akan menyisipkan metadata dan link optimasi font secara otomatis.
      */}
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased font-sans`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}