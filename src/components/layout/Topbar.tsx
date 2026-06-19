'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, ChevronDown, GraduationCap, LogOut, UserCircle, Settings } from 'lucide-react'
import Link from 'next/link'

export default function Topbar() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? '')
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = email
    ? email.split('@')[0].slice(0, 2).toUpperCase()
    : 'GU'

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30">
      {/* Left: Brand */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center ml-8">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-slate-900 text-sm">Asisten Guru</span>
      </div>
      <div className="hidden lg:block" />

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notification */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
          <Bell className="w-4 h-4 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-slate-800 leading-none">Guru</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5 max-w-[120px] truncate">{email}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-800">Akun Saya</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{email}</p>
                </div>
                <Link
                  href="/akun"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-slate-400" />
                  Pusat Akun
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Pengaturan
                </Link>
                <div className="border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
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
