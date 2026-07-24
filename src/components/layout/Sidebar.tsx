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
  { type: 'section', label: 'AKADEMIK' },
  { href: '/kelas', label: 'Kelas', icon: IdCard },
  { href: '/absensi', label: 'Absensi', icon: ClipboardCheck },
  { href: '/akademik/nilai', label: 'Nilai', icon: Award },
  { href: '/laporan', label: 'Laporan', icon: FileBarChart },
  { href: '/ai-tools', label: 'AI Tools', icon: Sparkles },
  { type: 'section', label: 'SISTEM' },
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
  const [userName, setUserName] = useState('rakaziwi')
  const [initials, setInitials] = useState('R')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? 'rakaziwi321@gmail.com')

      const [{ data: profile }, { data: school }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
        supabase.from('school_profiles').select('name').eq('user_id', user.id).maybeSingle(),
      ])

      if (profile?.full_name) {
        setUserName(profile.full_name.toLowerCase())
        setInitials(profile.full_name[0].toUpperCase())
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url)
      } else {
        const fallback = user.email?.split('@')[0] ?? 'rakaziwi'
        setUserName(fallback.toLowerCase())
        setInitials(fallback[0].toUpperCase())
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

  const dayLabel = mounted ? now.toLocaleDateString('id-ID', { weekday: 'long' }) : 'Jumat'
  const dateLabel = mounted ? now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '24 Juli 2026'
  const timeLabel = mounted ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '09:41 AM'

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="w-10 h-10 bg-[#3b52f6] rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
          <span className="text-white font-black text-xl tracking-tighter">G</span>
        </div>
        <div>
          <p className="font-bold text-white text-[15px] leading-tight tracking-wide">GR Assistant</p>
          <p className="text-[11px] text-slate-400 leading-tight">Asisten Digital Guru</p>
        </div>
        <button onClick={() => setMobileOpen(false)} className="ml-auto p-1 text-slate-400 hover:text-white rounded-lg lg:hidden">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Link List */}
      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navRows.map((row, idx) => {
          if (isSection(row)) {
            return (
              <p
                key={`section-${idx}`}
                className="px-3.5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 select-none"
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
                'flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-[#3b52f6] text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
              )}
            >
              <row.icon className={clsx("w-[18px] h-[18px] shrink-0", active ? "text-white" : "text-slate-400")} />
              {row.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer System Info & Profile */}
      <div className="p-4 border-t border-slate-800/60 space-y-3.5 bg-slate-950/25">
        {/* Profile Card */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(v => !v)}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-slate-800/30 transition-colors"
          >
            <div className="relative w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              {/* Titik Hijau Indikator Aktif */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10b981] border-[2px] border-[#0d1127] rounded-full" />
            </div>
            
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-bold text-white truncate">{userName}</p>
              <p className="text-[11px] text-slate-500 truncate">{email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
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
          <p className="text-xs text-slate-300 font-semibold truncate">{schoolName || 'SMAN 1 Sumarorong'}</p>
        </div>

        {/* Tahun Ajaran */}
        <div className="bg-[#161937]/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tahun Ajaran Aktif</p>
            <p className="text-sm font-bold text-white leading-tight">2024 / 2025</p>
            <p className="text-[11px] text-slate-400">Semester Genap</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#242A5E]/40 border border-indigo-500/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        {/* Tanggal & Waktu */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="leading-tight">
              <p className="text-xs font-semibold text-slate-200">{dayLabel}</p>
              <p className="text-[10px] text-slate-500">{dateLabel}</p>
            </div>
          </div>
          <div className="bg-[#21264c] border border-indigo-500/25 px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-400">
            {timeLabel}
          </div>
        </div>

        {/* AI Assistant Banner */}
        <div className="bg-gradient-to-br from-[#1b214d] to-[#121635] border border-indigo-500/20 rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between h-[120px]">
          {/* Efek Cahaya Latar Belakang */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-600/15 rounded-full blur-xl pointer-events-none" />
          
          <div className="space-y-1 z-10 max-w-[65%]">
            <p className="text-xs font-bold text-white tracking-wide">AI Assistant</p>
            <p className="text-[10px] text-slate-400 leading-normal">Tanya apa saja tentang kelas dan siswa Anda</p>
          </div>

          <div className="z-10 mt-2">
            <Link href="/ai-tools" className="inline-flex items-center justify-center px-3 py-2 bg-white text-slate-900 font-bold text-[10px] rounded-lg shadow-sm hover:bg-slate-100 transition-all duration-200 gap-1.5 group">
              Mulai Chat 
              <span className="text-[8px] text-slate-500 group-hover:translate-x-0.5 transition-transform">&gt;</span>
            </Link>
          </div>

          {/* Vektor Ilustrasi Robot AI */}
          <div className="absolute right-1 bottom-1 w-20 h-20 pointer-events-none z-10">
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-md animate-bounce duration-[6s]">
              <circle cx="50" cy="50" r="30" fill="url(#botGlow)" opacity="0.3"/>
              <rect x="32" y="30" width="36" height="28" rx="14" fill="#E2E8F0"/>
              <rect x="35" y="33" width="30" height="22" rx="11" fill="#1E293B"/>
              <ellipse cx="44" cy="44" rx="4" ry="2" fill="#38BDF8"/>
              <ellipse cx="56" cy="44" rx="4" ry="2" fill="#38BDF8"/>
              <rect x="28" y="39" width="4" height="10" rx="2" fill="#818CF8"/>
              <rect x="68" y="39" width="4" height="10" rx="2" fill="#818CF8"/>
              <rect x="38" y="60" width="24" height="18" rx="8" fill="#E2E8F0"/>
              <rect x="42" y="64" width="16" height="10" rx="2" fill="#818CF8" opacity="0.6"/>
              <rect x="32" y="62" width="4" height="12" rx="2" fill="#CBD5E1"/>
              <rect x="64" y="62" width="4" height="12" rx="2" fill="#CBD5E1"/>
              <defs>
                <radialGradient id="botGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#818cf8"/>
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0"/>
                </radialGradient>
              </defs>
            </svg>
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

      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />}

      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-[#0d1127] flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto border-r border-slate-900/50',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </aside>
    </>
  )
}