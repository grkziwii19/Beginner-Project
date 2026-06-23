import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GR Assistant - Platform Asisten Digital Guru',
    short_name: 'GR Assistant',
    description:
      'Sistem administrasi guru untuk absensi, nilai, dan data siswa yang cepat dan mudah.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#4f46e5',
    orientation: 'portrait',

    icons: [
      {
        src: '/icons/iconapp192P.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/iconapp512P.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/iconapp512Php.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}