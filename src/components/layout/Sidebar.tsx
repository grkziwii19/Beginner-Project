'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ClipboardCheck, Award, FileBarChart,
  Settings, Menu, X, Calendar, Building2, IdCard, GraduationCap,
  ChevronDown, UserCircle, LogOut, Bot
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

// "Akademik" dan "Sistem" hanyalah judul pemisah bagian (section label), bukan tombol.
// Data Siswa, Absensi, Nilai selalu tampil di bawahnya tanpa perlu expand/collapse.
// Menu "Kelas" terpisah sudah dihapus — manajemen kelas (buat/pilih kelas)
// sekarang berada di dalam halaman Data Siswa.
const navRows: NavRow[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },

  { type: 'section', label: 'Akademik' },

  { href: '/kelas', label: 'Kelas', icon: IdCard },
  { href: '/absensi', label: 'Absensi', icon: ClipboardCheck },
  { href: '/akademik/nilai', label: 'Nilai', icon: Award },
  { href: '/laporan', label: 'Laporan', icon: FileBarChart },
  { href: '/ai-tools', label: 'AI Tools', icon: Sparkles },

  { type: 'section', label: 'Sistem' },

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

  // Profil pengguna — dipindahkan dari Topbar ke sini
  const [email, setEmail] = useState('')
  const [userName, setUserName] = useState('Guru')
  const [initials, setInitials] = useState('GU')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
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

  const dayLabel = now.toLocaleDateString('id-ID', { weekday: 'long' })
  const dateLabel = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0 p-1 shadow-sm shadow-indigo-900/40">
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

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navRows.map((row, idx) => {
          if (isSection(row)) {
            return (
              <p
                key={`section-${idx}`}
                className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 select-none"
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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-900/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              )}
            >
              <row.icon className="w-4 h-4 shrink-0" />
              {row.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer: Profile + Sekolah + Tahun Ajaran + Tanggal + AI Assistant */}
      <div className="p-3 mt-1 border-t border-slate-800 space-y-2.5">
        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(v => !v)}
            className="flex items-center gap-2.5 w-full px-1 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
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
              <div className="absolute left-0 bottom-full mb-2 w-full bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                <Link
                  href="/akun"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-slate-400" />
                  Akun
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

        {/* Sekolah */}
        <div className="flex items-center gap-2.5 px-1">
          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
          <p className="text-xs text-slate-300 truncate">{schoolName || 'Sekolah belum diatur'}</p>
        </div>

        {/* Tahun Ajaran */}
        <div className="bg-gradient-to-br from-indigo-900/60 to-slate-800 rounded-xl px-3 py-2 border border-indigo-900/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Tahun Ajaran Aktif</p>
              <p className="text-sm font-semibold text-white mt-0.5">2024 / 2025</p>
              <p className="text-xs text-slate-400">Semester Genap</p>
            </div>
            <GraduationCap className="w-5 h-5 text-indigo-300 shrink-0" />
          </div>
        </div>

        {/* Tanggal + Jam */}
        <div className="flex items-center justify-between gap-2.5 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{dayLabel}</p>
              <p className="text-[11px] text-slate-500 truncate">{dateLabel}</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2 py-1 shrink-0">
            {timeLabel}
          </span>
        </div>

        {/* AI Assistant promo */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3.5 relative overflow-hidden">
          <Bot className="w-8 h-8 text-white/90 mb-2" />
          <p className="text-sm font-bold text-white leading-tight">AI Assistant</p>
          <p className="text-xs text-indigo-100 mt-1 leading-snug">
            Tanya apa saja tentang kelas dan siswa Anda
          </p>
          <Link
            href="/ai-tools"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center gap-1 mt-3 text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors text-white px-3 py-1.5 rounded-lg"
          >
            Mulai Chat <ChevronDown className="w-3 h-3 -rotate-90" />
          </Link>
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
        'fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-indigo-950 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </aside>
    </>
  )
}