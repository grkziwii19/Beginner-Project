import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister'

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
      {
        url: '/icons/favicon-32x32.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/icons/favicon-16x16.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/icons/apple-touch-icon.png',
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
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>

      <body className="bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}