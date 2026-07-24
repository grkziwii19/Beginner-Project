'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ClipboardCheck, Award, FileBarChart,
  Settings, Menu, X, Calendar, Building2, IdCard, GraduationCap,
  ChevronDown, UserCircle, LogOut, Sparkles
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

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
  const [mounted, setMounted] = useState(false) // State untuk mendeteksi client-mount

  const [email, setEmail] = useState('')
  const [userName, setUserName] = useState('Guru')
  const [initials, setInitials] = useState('GU')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true) // Menandakan bahwa komponen telah terpasang di client

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

    const interval = setInterval(() => setNow(new Date()), 1000)
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

  // Format tanggal hanya jika sudah mounted di client guna mencegah perbedaan SSR vs CSR
  const dayLabel = mounted ? now.toLocaleDateString('id-ID', { weekday: 'long' }) : ''
  const dateLabel = mounted ? now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const timeLabel = mounted ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/50">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 p-1 shadow-md shadow-indigo-600/25">
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
          <p className="font-bold text-white text-[15px] leading-tight tracking-wide">GR Assistant</p>
          <p className="text-[11px] text-indigo-300 font-medium leading-tight">Asisten Digital Guru</p>
        </div>
        <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navRows.map((row, idx) => {
          if (isSection(row)) {
            return (
              <p
                key={`section-${idx}`}
                className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none"
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
                'flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              )}
            >
              <row.icon className={clsx("w-[18px] h-[18px] shrink-0", active ? "text-white" : "text-slate-400")} />
              {row.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer Area */}
      <div className="p-4 border-t border-slate-800/80 space-y-3.5 bg-slate-950/20">
        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(v => !v)}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-slate-800/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-600 border border-indigo-400/30 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-white truncate">{userName}</p>
              <p className="text-[11px] text-slate-400 truncate">{email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute left-0 bottom-full mb-2 w-full bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
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
        <div className="flex items-center gap-2.5 px-2">
          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
          <p className="text-xs text-slate-300 font-medium truncate">{schoolName || 'SMAN 1 Sumarorong'}</p>
        </div>

        {/* Tahun Ajaran */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tahun Ajaran Aktif</p>
            <p className="text-sm font-bold text-white mt-0.5">2024 / 2025</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Semester Genap</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <GraduationCap className="w-4.5 h-4.5 text-indigo-400" />
          </div>
        </div>

        {/* Tanggal & Waktu */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <p className="text-xs font-semibold text-slate-200">{dayLabel || '...'}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{dateLabel || '...'}</p>
            </div>
          </div>
          <div className="bg-[#1C1F37] border border-indigo-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-400 min-w-[70px] text-center">
            {timeLabel || '...'}
          </div>
        </div>

        {/* AI Assistant Banner */}
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900/40 border border-indigo-500/20 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1 z-10 max-w-[70%]">
              <p className="text-xs font-bold text-white tracking-wide">AI Assistant</p>
              <p className="text-[10px] text-slate-400 leading-snug">Tanya apa saja tentang kelas dan siswa Anda</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-400/30 flex items-center justify-center shadow-lg shrink-0">
              <span className="text-base">🤖</span>
            </div>
          </div>
          <Link href="/ai-tools" className="mt-3 inline-flex items-center justify-center w-full py-1.5 px-3 bg-white text-indigo-950 font-bold text-[11px] rounded-lg shadow-sm hover:bg-slate-100 transition-colors gap-1 z-10 relative">
            Mulai Chat <span className="text-[9px]">&gt;</span>
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

      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />}

      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-[#0c0e24] flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto border-r border-slate-900/50',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </aside>
    </>
  )
}