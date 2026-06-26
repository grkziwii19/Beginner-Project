'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const registerSW = async () => {
      try {
        // 🔥 HAPUS SW LAMA DULU
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
          await reg.unregister()
        }

        // 🔥 REGISTER ULANG (CLEAN)
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        console.log('[PWA] SW registered:', registration.scope)
      } catch (error) {
        console.log('[PWA] SW error:', error)
      }
    }

    registerSW()
  }, [])

  return null
}