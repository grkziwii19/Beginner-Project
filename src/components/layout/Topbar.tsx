'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, Search, AlertCircle, CheckCircle, HardDrive, UserPlus, Sun } from 'lucide-react'

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
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [showNotif, setShowNotif] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [userName, setUserName] = useState('rakaziwi')

  useEffect(() => {
    setSearchValue(searchParams.get('q') || '')
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
        if (profile?.full_name) {
          setUserName(profile.full_name.split(' ')[0].toLowerCase())
        } else {
          setUserName((user.email?.split('@')[0] ?? 'rakaziwi').toLowerCase())
        }
      }
    }
    fetchUser()
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

  const notifications: NotifItem[] = [
    { id: '1', icon: AlertCircle, iconColor: 'text-amber-500 bg-amber-50', title: 'Nilai UTS belum diinput', desc: 'Ada kelas yang menunggu nilai', time: 'Baru saja' },
    { id: '2', icon: CheckCircle, iconColor: 'text-emerald-500 bg-emerald-50', title: 'Absensi hari ini berhasil', desc: 'Semua kelas telah tercatat', time: '1 jam lalu' },
    { id: '3', icon: HardDrive, iconColor: 'text-blue-500 bg-blue-50', title: 'Backup otomatis selesai', desc: 'Data berhasil di-backup', time: '2 jam lalu' },
  ]

  return (
    <header className="h-20 bg-[#F8FAFC] flex items-center justify-between px-6 sm:px-8 shrink-0 z-30 gap-4">
      {/* Sambutan Pengguna */}
      <div className="ml-8 lg:ml-0 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          Selamat datang kembali, {userName} <span className="text-xl">👋</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-medium">Berikut adalah update dan aktivitas kelas hari ini.</p>
      </div>

      {/* Kontrol Kanan */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Kolom Pencarian Utama */}
        <div className="relative hidden sm:flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={pathname === '/kelas' ? "Cari kelas, wali kelas..." : "Cari apapun..."}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-64 pl-10 pr-12 py-2.5 text-xs font-medium border border-slate-200/80 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder:text-slate-400"
          />
          <div className="absolute right-3 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-bold select-none pointer-events-none flex items-center gap-0.5">
            <span>⌘</span><span>K</span>
          </div>
        </div>

        {/* Notifikasi */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(v => !v)}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 transition-colors"
          >
            <Bell className="w-[18px] h-[18px] text-slate-500" />
            <span className="absolute top-2 right-2.5 w-4 h-4 bg-red-500 border border-white rounded-full text-[9px] text-white flex items-center justify-center font-bold">
              3
            </span>
          </button>

          {showNotif && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-bold text-slate-900 text-sm">Notifikasi</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.iconColor}`}>
                        <n.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.desc}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Toggle Mode */}
        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 transition-colors shrink-0">
          <Sun className="w-[18px] h-[18px] text-slate-500" />
        </button>
      </div>
    </header>
  )
}