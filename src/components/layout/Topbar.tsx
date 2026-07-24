'use client'

import { useEffect, useState, Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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

interface HeaderContent {
  title: string
  subtitle: string
}

// Menghasilkan konten judul & sub-judul secara dinamis sesuai rute halaman aktif
function getHeaderContent(pathname: string, userName: string): HeaderContent {
  if (pathname === '/dashboard') {
    return {
      title: `Selamat datang, ${userName}`,
      subtitle: 'Kelola ringkasan kelas, pantau perkembangan belajar siswa, dan susun rapor secara praktis.'
    }
  }
  if (pathname.startsWith('/kelas')) {
    return {
      title: 'Daftar Kelas',
      subtitle: 'Pilih kelas di bawah ini untuk mulai mengelola siswa, absensi, dan nilai.'
    }
  }
  if (pathname.startsWith('/sekolah')) {
    return {
      title: 'Informasi Sekolah',
      subtitle: 'Kelola profil institusi yang akan digunakan sebagai data resmi dokumen dan lembar rapor siswa.'
    }
  }
  if (pathname.startsWith('/laporan')) {
    return {
      title: 'Laporan Rapor',
      subtitle: 'Susun, cetak, dan unduh lembar penilaian serta dokumen rapor resmi siswa secara instan.'
    }
  }
  if (pathname.startsWith('/pengaturan')) {
    return {
      title: 'Pengaturan Akun',
      subtitle: 'Konfigurasi profil pribadi Anda, kelola keamanan kata sandi, dan atur preferensi sistem.'
    }
  }
  if (pathname.startsWith('/akun')) {
    return {
      title: 'Pusat Akun',
      subtitle: 'Konfigurasi informasi pribadi Anda dan pengaturan keamanan akun.'
    }
  }
  
  return {
    title: 'Asisten Digital Guru',
    subtitle: 'Selamat bekerja dan membimbing masa depan generasi bangsa.'
  }
}

// Komponen pencarian yang dibungkus Suspense agar Next.js tidak memicu build error
function SearchBar() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')

  useEffect(() => {
    setSearchValue(searchParams.get('q') || '')
  }, [searchParams])

  const handleSearchChange = (val: string) => {
    setSearchValue(val)
    const params = new URLSearchParams(searchParams.toString())
    
    if (val) {
      params.set('q', val)
    } else {
      params.delete('q')
    }

    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="relative hidden sm:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        placeholder={
          pathname === '/kelas' 
            ? "Cari kelas atau siswa..." 
            : pathname === '/sekolah'
            ? "Cari data sekolah..."
            : "Cari apapun..."
        }
        value={searchValue}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-56 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder:text-slate-400"
      />
    </div>
  )
}

export default function Topbar() {
  const supabase = createClient()
  const pathname = usePathname()
  const [showNotif, setShowNotif] = useState(false)
  const [userName, setUserName] = useState('Guru')

  // Memuat nama asli akun secara dinamis untuk sapaan di Dashboard
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.full_name) {
          setUserName(profile.full_name)
        } else {
          const fallback = user.email?.split('@')[0] ?? 'Guru'
          setUserName(fallback)
        }
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [])

  const headerContent = getHeaderContent(pathname, userName)

  const notifications: NotifItem[] = [
    { id: '1', icon: AlertCircle, iconColor: 'text-amber-500 bg-amber-50', title: 'Nilai UTS belum diinput', desc: 'Ada kelas yang menunggu nilai', time: 'Baru saja' },
    { id: '2', icon: CheckCircle, iconColor: 'text-emerald-500 bg-emerald-50', title: 'Absensi hari ini berhasil', desc: 'Semua kelas telah tercatat', time: '1 jam lalu' },
    { id: '3', icon: HardDrive, iconColor: 'text-blue-500 bg-blue-50', title: 'Backup otomatis selesai', desc: 'Data berhasil di-backup', time: '2 jam lalu' },
    { id: '4', icon: UserPlus, iconColor: 'text-purple-500 bg-purple-50', title: 'Siswa baru terdaftar', desc: 'Ada penambahan siswa baru', time: 'Kemarin' },
  ]

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 gap-4">
      {/* Kolom Judul & Sub-judul bertumpuk (ml-12 di layar kecil agar pas dengan burger menu) */}
      <div className="flex flex-col ml-12 lg:ml-0 min-w-0">
        <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight truncate leading-tight">
          {headerContent.title}
        </h1>
        <p className="text-[11px] sm:text-xs text-slate-500 leading-normal truncate hidden md:block mt-0.5">
          {headerContent.subtitle}
        </p>
      </div>

      {/* Kontrol Kanan */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Kolom Pencarian Utama dengan Suspense Boundary */}
        <Suspense fallback={<div className="w-56 h-9 bg-slate-50 rounded-lg animate-pulse hidden sm:block" />}>
          <SearchBar />
        </Suspense>

        {/* Tombol Search Mobile */}
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