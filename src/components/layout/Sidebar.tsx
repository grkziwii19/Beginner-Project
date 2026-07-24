'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ClipboardCheck, Award, FileBarChart,
  Settings, Menu, X, Calendar, Building2, IdCard, GraduationCap,
  ChevronDown, UserCircle, LogOut
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { Sparkles } from 'lucide-react'

interface NavLeaf {
  href: string
  label: string
  icon: any
}

interface SectionLabel {
  type: 'section'
  label: string
}

type NavRow = NavLeaf | SectionLabel

function isSection(row: NavRow): row is SectionLabel {
  return 'type' in row && row.type === 'section'
}

const navRows: NavRow[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },

  { type: 'section', label: 'Akademik' },

  { href: '/kelas', label: 'Kelas', icon: IdCard },
  { href: '/absensi', label: 'Absensi', icon: ClipboardCheck },
  { href: '/akademik/nilai', label: 'Nilai', icon: Award },
  { href: '/laporan', label: 'Laporan', icon: FileBarChart },
  { href: '/ai-tools', label: 'Bantuan AI', icon: Sparkles },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const [schoolName, setSchoolName] = useState('')
  const [now, setNow] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  const [email, setEmail] = useState('')
  const [userName, setUserName] = useState('Guru')
  const [initials, setInitials] = useState('GU')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? '')

      const [{ data: profile }, { data: school }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
        supabase.from('school_profiles').select('name').eq('user_id', user.id).maybeSingle(),
      ])

      if (profile?.full_name) {
        setUserName(profile.full_name)
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

    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Pengaman nilai Tanggal untuk mencegah Next.js Hydration Mismatch
  const dayLabel = mounted 
    ? now.toLocaleDateString('id-ID', { weekday: 'long' }) 
    : 'Jumat'

  const dateLabel = mounted 
    ? now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) 
    : '24 Juli 2026'

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 shrink-0">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 p-1">
          <Image
            src="/icons/icon512P.png"
            alt="GR Assistant"
            width={36}
            height={36}
            className="w-full h-full object-contain"
            priority
          />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">GR Assistant</p>
          <p className="text-xs text-slate-400 leading-tight">Asisten Digital Guru</p>
        </div>
        <button onClick={() => setMobileOpen(false)} className="ml-auto p-1 text-slate-400 lg:hidden">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav - Diubah menjadi overflow-hidden agar terbungkus rapat tanpa fungsi scroll */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-hidden">
        {navRows.map((row, idx) => {
          if (isSection(row)) {
            return (
              <p
                key={`section-${idx}`}
                className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 select-none"
              >
                {row.label}
              </p>
            )
          }

          const active = isActive(row.href)
          return (
            <Link
              key={`${row.href}-${row.label}`}
              href={row.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                active ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <row.icon className="w-4 h-4 shrink-0" />
              {row.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer: Profile + Sekolah + Tahun Ajaran + Tanggal */}
      <div className="p-3 mt-1 border-t border-slate-800 space-y-2.5 shrink-0">
        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(v => !v)}
            className="flex items-center gap-2.5 w-full px-1 py-1.5 rounded-lg hover:bg-slate-800 transition-colors duration-150"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName.split(' ')[0]}</p>
              <p className="text-[11px] text-slate-400 truncate">{email}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              {/* Menu dropdown dibuat bertema gelap (slate-800) agar harmonis dengan sidebar */}
              <div className="absolute left-0 bottom-full mb-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
                <Link
                  href="/akun"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-150"
                >
                  <UserCircle className="w-4 h-4 text-slate-400" />
                  Akun
                </Link>
                <div className="border-t border-slate-700">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors duration-150"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sekolah */}
        <div className="flex items-center gap-2.5 px-1">
          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
          <p className="text-xs text-slate-300 truncate">{schoolName || 'Sekolah belum diatur'}</p>
        </div>

        {/* Tahun Ajaran */}
        <div className="bg-slate-800 rounded-lg px-3 py-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Tahun Ajaran Aktif</p>
          <p className="text-sm font-bold text-white mt-0.5">2024 / 2025</p>
          <p className="text-[11px] text-slate-400">Semester Genap</p>
        </div>

        {/* Tanggal */}
        <div className="flex items-center gap-2.5 px-1">
          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <div className="leading-tight">
            <p className="text-xs font-semibold text-slate-200">{dayLabel}</p>
            <p className="text-[11px] text-slate-500">{dateLabel}</p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-sm border border-slate-200 lg:hidden">
        <Menu className="w-5 h-5 text-slate-600" />
      </button>

      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col overflow-hidden transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="relative flex h-full flex-col overflow-hidden">
          <NavContent />
        </div>
      </aside>
    </>
  )
}