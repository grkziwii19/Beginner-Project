'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, FileBarChart, Settings, Menu, X, 
  Calendar, Building2, IdCard, ChevronDown, UserCircle, LogOut
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
  { href: '/kelas', label: 'Kelas', icon: IdCard },
  { href: '/sekolah', label: 'Sekolah', icon: Building2 },
  { href: '/laporan', label: 'Laporan', icon: FileBarChart },
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
          <p className="text-xs text-[#94A3B8] leading-tight">Asisten Digital Guru</p>
        </div>
        <button onClick={() => setMobileOpen(false)} className="ml-auto p-1 text-[#94A3B8] lg:hidden">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-hidden">
        {navRows.map((row, idx) => {
          if (isSection(row)) {
            return (
              <p
                key={`section-${idx}`}
                className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] select-none"
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
              style={active ? { background: 'linear-gradient(90deg, #4F46E5, #6366F1)' } : undefined}
              className={clsx(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                active 
                  ? 'text-white' 
                  : 'text-[#CBD5E1] hover:bg-white/[0.08] hover:text-white'
              )}
            >
              <row.icon className={clsx(
                'w-4 h-4 shrink-0 transition-colors duration-150',
                active ? 'text-white' : 'text-[#94A3B8] group-hover:text-white'
              )} />
              {row.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 mt-1 border-t border-white/[0.06] space-y-2.5 shrink-0">
        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(v => !v)}
            className="flex items-center gap-2.5 w-full px-1 py-1.5 rounded-lg hover:bg-white/[0.08] transition-colors duration-150"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName.split(' ')[0]}</p>
              <p className="text-[11px] text-[#94A3B8] truncate">{email}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              {/* Dropdown yang disesuaikan dengan skema Navy Slate gelap */}
              <div className="absolute left-0 bottom-full mb-2 w-full bg-[#1E293B] border border-white/[0.06] rounded-xl shadow-lg z-50 overflow-hidden">
                <Link
                  href="/akun"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#CBD5E1] hover:bg-white/[0.08] hover:text-white transition-colors duration-150"
                >
                  <UserCircle className="w-4 h-4 text-[#94A3B8]" />
                  Akun
                </Link>
                <div className="border-t border-white/[0.06]">
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
          <Building2 className="w-4 h-4 text-[#94A3B8] shrink-0" />
          <p className="text-xs text-[#CBD5E1] truncate">{schoolName || 'Sekolah belum diatur'}</p>
        </div>

        {/* Tahun Ajaran */}
        <div className="bg-[#1E293B] border border-white/[0.06] rounded-lg px-3 py-2">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-wide font-semibold">Tahun Ajaran Aktif</p>
          <p className="text-sm font-bold text-white mt-0.5">2024 / 2025</p>
          <p className="text-[11px] text-[#94A3B8]">Semester Genap</p>
        </div>

        {/* Tanggal */}
        <div className="flex items-center gap-2.5 px-1">
          <Calendar className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
          <div className="leading-tight">
            <p className="text-xs font-semibold text-[#CBD5E1]">{dayLabel}</p>
            <p className="text-[11px] text-[#94A3B8]">{dateLabel}</p>
          </div>
        </div>

        {/* AI Assistant Card */}
        <div className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-[#4338CA] to-[#6366F1] p-3 h-[120px] flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-500/25 blur-2xl" />

          <div className="relative z-10 max-w-[65%] leading-tight">
            <h3 className="text-[12px] font-bold text-white">
              AI Assistant
            </h3>
            <p className="mt-1 text-[10px] text-slate-300/80 leading-normal">
              Tanya apa saja tentang kelas dan siswa Anda
            </p>
          </div>

          <div className="relative z-10">
            <Link
              href="/ai-tools"
              className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[#6366F1] px-3 text-[10px] font-bold text-white hover:bg-[#4F46E5] transition shadow-sm"
            >
              <span>Mulai Chat</span>
              <span className="text-[8px] text-slate-300">&gt;</span>
            </Link>
          </div>

          {/* Vektor Robot AI Flat 3D */}
          <div className="absolute right-1 bottom-1 w-14 h-14 pointer-events-none z-10">
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-md">
              <circle cx="50" cy="50" r="30" fill="url(#botGlow)" opacity="0.25"/>
              <rect x="25" y="24" width="50" height="38" rx="16" fill="#E2E8F0"/>
              <rect x="29" y="28" width="42" height="30" rx="12" fill="#0F172A"/>
              <circle cx="42" cy="43" r="3.5" fill="#38BDF8" className="animate-pulse" />
              <circle cx="58" cy="43" r="3.5" fill="#38BDF8" className="animate-pulse" />
              <rect x="20" y="34" width="5" height="12" rx="2.5" fill="#818CF8"/>
              <rect x="75" y="34" width="5" height="12" rx="2.5" fill="#818CF8"/>
              <rect x="42" y="66" width="16" height="10" rx="4" fill="#E2E8F0"/>
              <ellipse cx="50" cy="72" rx="6" ry="2" fill="#818CF8" opacity="0.8"/>
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

      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside 
        style={{
          background: 'radial-gradient(circle at top, rgba(99,102,241,.12), transparent 40%), linear-gradient(180deg, #1E293B 0%, #172554 45%, #0F172A 100%)',
          borderRight: '1px solid rgba(255,255,255,.06)',
          boxShadow: '8px 0 24px rgba(0,0,0,.18)'
        }}
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 flex flex-col overflow-hidden transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="relative flex h-full flex-col overflow-hidden">
          <NavContent />
        </div>
      </aside>
    </>
  )
}