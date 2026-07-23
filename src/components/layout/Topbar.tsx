'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, Search, AlertCircle, CheckCircle, HardDrive, UserPlus } from 'lucide-react'

interface NotifItem {
  id: string
  icon: any
  iconColor: string
  title: string
  desc: string
  time: string
}

// Judul halaman ditebak otomatis dari pathname, supaya setiap halaman
// tidak perlu mengirim judulnya sendiri secara manual. Tambahkan entri
// baru di sini setiap kali ada route baru yang butuh judul khusus.
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/kelas': 'Kelas',
  '/mengajar': 'Mengajar',
  '/absensi': 'Absensi',
  '/akademik/nilai': 'Nilai',
  '/laporan': 'Laporan',
  '/pengaturan': 'Pengaturan',
  '/akun': 'Pusat Akun',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]

  // Cocokkan prefix terpanjang untuk route dinamis, mis. /classes/123
  const match = Object.keys(PAGE_TITLES)
    .filter(p => pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0]

  return match ? PAGE_TITLES[match] : 'Dashboard'
}

export default function Topbar() {
  const supabase = createClient()
  const pathname = usePathname()
  const [showNotif, setShowNotif] = useState(false)

  const title = getPageTitle(pathname)

  const notifications: NotifItem[] = [
    { id: '1', icon: AlertCircle, iconColor: 'text-amber-500 bg-amber-50', title: 'Nilai UTS belum diinput', desc: 'Ada kelas yang menunggu nilai', time: 'Baru saja' },
    { id: '2', icon: CheckCircle, iconColor: 'text-emerald-500 bg-emerald-50', title: 'Absensi hari ini berhasil', desc: 'Semua kelas telah tercatat', time: '1 jam lalu' },
    { id: '3', icon: HardDrive, iconColor: 'text-blue-500 bg-blue-50', title: 'Backup otomatis selesai', desc: 'Data berhasil di-backup', time: '2 jam lalu' },
    { id: '4', icon: UserPlus, iconColor: 'text-purple-500 bg-purple-50', title: 'Siswa baru terdaftar', desc: 'Ada penambahan siswa baru', time: 'Kemarin' },
  ]

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 gap-4">
      {/* Judul halaman, menggantikan posisi search yang lama */}
      <h1 className="text-lg sm:text-xl font-bold text-slate-900 ml-8 lg:ml-0 truncate">
        {title}
      </h1>

      {/* Search + Notifikasi, digeser ke kanan */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari apapun..."
            className="w-56 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder:text-slate-400"
          />
        </div>

        {/* Tombol search ringkas untuk mobile (search penuh disembunyikan di layar kecil) */}
        <button className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
          <Search className="w-5 h-5 text-slate-500" />
        </button>

        {/* Notifikasi */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(v => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {showNotif && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <p className="font-semibold text-slate-900 text-sm">Notifikasi</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.iconColor}`}>
                        <n.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500">{n.desc}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                  <button className="text-xs text-indigo-600 font-medium hover:underline">Lihat Semua Notifikasi</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}