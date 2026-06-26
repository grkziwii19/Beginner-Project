'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator)
    ) return

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        console.log('[PWA] SW registered:', registration.scope)
      } catch (error) {
        console.log('[PWA] SW registration failed:', error)
      }
    }

    // delay sedikit supaya tidak ganggu hydration Next.js
    setTimeout(registerSW, 2000)
  }, [])

  return null
}