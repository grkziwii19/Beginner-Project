'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, ChevronDown, Search, LogOut, UserCircle, AlertCircle, CheckCircle, HardDrive, UserPlus } from 'lucide-react'
import Link from 'next/link'

interface NotifItem {
  id: string
  icon: any
  iconColor: string
  title: string
  desc: string
  time: string
}

export default function Topbar() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [userName, setUserName] = useState('Guru')
  const [initials, setInitials] = useState('GU')
  const [showProfile, setShowProfile] = useState(false)
  const [showNotif, setShowNotif] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '')
        const stored = localStorage.getItem(`profile_${data.user.id}`)
        if (stored) {
          try {
            const p = JSON.parse(stored)
            const full = [p.firstName, p.lastName].filter(Boolean).join(' ')
            if (full) {
              setUserName(full)
              const parts = full.trim().split(' ')
              setInitials(((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'GU')
              return
            }
          } catch {}
        }
        const fallback = data.user.email?.split('@')[0] ?? 'Guru'
        setUserName(fallback)
        setInitials(fallback.slice(0, 2).toUpperCase())
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const notifications: NotifItem[] = [
    { id: '1', icon: AlertCircle, iconColor: 'text-amber-500 bg-amber-50', title: 'Nilai UTS belum diinput', desc: 'Ada kelas yang menunggu nilai', time: 'Baru saja' },
    { id: '2', icon: CheckCircle, iconColor: 'text-emerald-500 bg-emerald-50', title: 'Absensi hari ini berhasil', desc: 'Semua kelas telah tercatat', time: '1 jam lalu' },
    { id: '3', icon: HardDrive, iconColor: 'text-blue-500 bg-blue-50', title: 'Backup otomatis selesai', desc: 'Data berhasil di-backup', time: '2 jam lalu' },
    { id: '4', icon: UserPlus, iconColor: 'text-purple-500 bg-purple-50', title: 'Siswa baru terdaftar', desc: 'Ada penambahan siswa baru', time: 'Kemarin' },
  ]

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30 gap-4">
      {/* Search */}
      <div className="relative flex-1 max-w-md ml-8 lg:ml-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari apapun..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder:text-slate-400"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(v => !v); setShowProfile(false) }}
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

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotif(false) }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-700">{userName.split(' ')[0]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-800">{userName}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{email}</p>
                </div>
                <Link href="/akun" onClick={() => setShowProfile(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  <UserCircle className="w-4 h-4 text-slate-400" />
                  Pusat Akun
                </Link>
                <div className="border-t border-slate-100">
                  <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
