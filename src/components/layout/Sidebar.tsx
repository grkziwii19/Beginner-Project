'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, BookOpen, Database, Building2, UserCircle,
  GraduationCap, Menu, X, ChevronRight, Calendar
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/classes',   label: 'Kelas',     icon: BookOpen },
  { href: '/students',  label: 'Kelola Data', icon: Database },
  { href: '/sekolah',   label: 'Sekolah',   icon: Building2 },
  { href: '/akun',      label: 'Pusat Akun', icon: UserCircle },
]

export default function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userName, setUserName] = useState('Guru')
  const [userRole, setUserRole] = useState('')
  const [initials, setInitials] = useState('GU')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [schoolName, setSchoolName] = useState('')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profile }, { data: school }] = await Promise.all([
        supabase.from('profiles').select('full_name, position, avatar_url').eq('id', user.id).maybeSingle(),
        supabase.from('school_profiles').select('name').eq('user_id', user.id).maybeSingle(),
      ])

      if (profile?.full_name) {
        setUserName(profile.full_name)
        setUserRole(profile.position || 'Guru')
        const parts = profile.full_name.trim().split(' ')
        setInitials(((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'GU')
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url)
      } else {
        const fallback = user.email?.split('@')[0] ?? 'Guru'
        setUserName(fallback)
        setInitials(fallback.slice(0, 2).toUpperCase())
      }

      if (school?.name) setSchoolName(school.name)
    }
    load()

    // Update jam/tanggal setiap menit
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const isActive = (href: string) => pathname.startsWith(href)

  const dayLabel = now.toLocaleDateString('id-ID', { weekday: 'long' })
  const dateLabel = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">GR Assistant</p>
          <p className="text-xs text-slate-400 leading-tight">Asisten Guru</p>
        </div>
        <button onClick={() => setMobileOpen(false)} className="ml-auto p-1 text-slate-400 lg:hidden">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5" />}
            </Link>
          )
        })}
      </nav>

      {/* Profile chip (link ke Pusat Akun, tempat logout berada) */}
      <div className="px-3">
        <Link
          href="/akun"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-slate-400 truncate">{userRole || 'Guru'}</p>
          </div>
        </Link>
      </div>

      {/* Info footer: Sekolah, Tahun Ajaran, Tanggal */}
      <div className="p-3 mt-1 border-t border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2.5 px-1">
          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
          <p className="text-xs text-slate-300 truncate">{schoolName || 'Sekolah belum diatur'}</p>
        </div>
        <div className="bg-slate-800 rounded-lg px-3 py-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Tahun Ajaran Aktif</p>
          <p className="text-sm font-semibold text-white mt-0.5">2024 / 2025</p>
          <p className="text-xs text-slate-400">Semester Genap</p>
        </div>
        <div className="flex items-center gap-2.5 px-1">
          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <div className="leading-tight">
            <p className="text-xs font-medium text-slate-200">{dayLabel}</p>
            <p className="text-[11px] text-slate-500">{dateLabel}</p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-sm border border-slate-200 lg:hidden"
      >
        <Menu className="w-5 h-5 text-slate-600" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </aside>
    </>
  )
}
