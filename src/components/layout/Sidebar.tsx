'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  FileBarChart,
  Settings,
  Menu,
  X,
  Calendar,
  Building2,
  IdCard,
  GraduationCap,
  ChevronDown,
  UserCircle,
  LogOut,
  Sparkles,
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

// Hanya menampilkan Dashboard, Kelas, Laporan, dan Pengaturan
const navRows: NavRow[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/kelas',
    label: 'Kelas',
    icon: IdCard,
  },
  {
    href: '/laporan',
    label: 'Laporan',
    icon: FileBarChart,
  },
  {
    href: '/pengaturan',
    label: 'Pengaturan',
    icon: Settings,
  },
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
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setEmail(user.email ?? 'rakaziwi321@gmail.com')

      const [{ data: profile }, { data: school }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle(),

        supabase
          .from('school_profiles')
          .select('name')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      if (profile?.full_name) {
        setUserName(profile.full_name)
        setInitials(profile.full_name.charAt(0).toUpperCase())

        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url)
        }
      } else {
        const fallback = user.email?.split('@')[0] ?? 'Guru'

        setUserName(fallback)
        setInitials(fallback.charAt(0).toUpperCase())
      }

      if (school?.name) {
        setSchoolName(school.name)
      }
    }

    load()

    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const dayLabel = mounted
    ? now.toLocaleDateString('id-ID', {
        weekday: 'long',
      })
    : 'Jumat'

  const dateLabel = mounted
    ? now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '24 Juli 2026'

  const timeLabel = mounted
    ? now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '09:41'

  const NavContent = () => (
    <>
      {/* ========================= */}
      {/* LOGO */}
      {/* ========================= */}
      <div className="relative border-b border-white/5 px-4 py-4 shrink-0">
        <div className="relative flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br
from-[#4F46E5]
to-[#6366F1]
 shadow-lg shadow-indigo-600/20">
            <span className="text-[16px] font-black tracking-tight text-white">
              G
            </span>
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-bold tracking-tight text-white">
              GR Assistant
            </h1>
            <p className="text-[10px] text-[#94A3B8]">
              Asisten Digital Guru
            </p>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-xl p-1 text-[#94A3B8] transition hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ========================= */}
      {/* NAVIGATION (SCROLL DIHAPUS) */}
      {/* ========================= */}
      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navRows.map((row) => {
          if (isSection(row)) {
            return (
              <div
                key={row.label}
                className="mt-[18px] mb-[8px] px-3"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]/50">
                  {row.label}
                </span>
              </div>
            )
          }

          const active = isActive(row.href)

          return (
            <Link
              key={row.href}
              href={row.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "group flex items-center rounded-xl transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white shadow-md shadow-indigo-600/20"
                  : "text-[#94A3B8] hover:bg-white/[0.05] hover:scale-[1.01] hover:text-white"
              )}
            >
              <div className="flex w-full items-center gap-3 px-3 py-[11px]">
                <div className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
                  active ? "bg-white/15" : "bg-white/5 group-hover:bg-white/10"
                )}>
                  <row.icon className={clsx(
                    "h-[16px] w-[16px] transition-colors duration-200",
                    active ? "text-white" : "text-[#94A3B8] group-hover:text-white"
                  )} />
                </div>

                <span className="text-[14px] font-semibold">
                  {row.label}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* ========================= */}
      {/* FOOTER (SATU GRUP KONSISTEN) */}
      {/* ========================= */}
      <div className="p-4 space-y-3.5 shrink-0">
        
        {/* PROFILE CARD */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu((v) => !v)}
            className="flex items-center gap-3 w-full px-2 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors"
          >
            <div className="relative h-10 w-10 shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-full w-full rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#4F46E5] to-[#6366F1] text-[14px] font-bold text-white border border-white/10">
                  {initials}
                </div>
              )}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#111827] bg-[#10b981]" />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <h3 className="truncate text-[14px] font-bold text-white">
                {userName}
              </h3>
              <p className="truncate text-[10px] text-[#94A3B8]">
                {email}
              </p>
            </div>

            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-colors group-hover:text-white" />
          </button>

          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />

              <div className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#1E293B] p-1 shadow-lg">
                <Link
                  href="/akun"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-[#94A3B8] transition rounded-lg hover:bg-white/5 hover:text-white"
                >
                  <UserCircle className="h-4 w-4" />
                  Akun Saya
                </Link>

                <div className="border-t border-white/5 my-1" />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-red-400 transition rounded-lg hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            </>
          )}
        </div>

        {/* SCHOOL INFO */}
        <div className="flex items-center gap-2.5 px-2">
          <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
          <p className="text-[12px] text-slate-300 font-semibold truncate">
            {schoolName || 'SMAN 1 Sumarorong'}
          </p>
        </div>

        {/* ACADEMIC YEAR (TINGGI 72PX) */}
        <div className="bg-[#1E293B] border border-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between h-[72px]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Tahun Ajaran Aktif
            </p>
            <h3 className="text-[14px] font-bold text-white mt-0.5 leading-tight">
              2024 / 2025
            </h3>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">
              Semester Genap
            </p>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 shrink-0">
            <GraduationCap className="h-4 w-4 text-indigo-400" />
          </div>
        </div>

        {/* DATE & TIME */}
        <div className="flex items-center justify-between px-2 bg-transparent">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <div className="leading-tight">
              <p className="text-[12px] font-bold text-white">
                {dayLabel}
              </p>
              <p className="text-[10px] text-slate-400">
                {dateLabel}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-indigo-500/20 bg-[#4338CA] px-2.5 py-1">
            <span className="text-[10px] font-bold tracking-wider text-indigo-300">
              {timeLabel} AM
            </span>
          </div>
        </div>

        {/* AI ASSISTANT CARD (TINGGI 120PX, FLAT 3D ROBOT, BUTTON KECIL) */}
        {/* Mengarahkan langsung ke halaman AI Tools (/ai-tools) */}
        <div className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-br from-[#4338CA]
to-[#6366F1] p-3.5 h-[120px] flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-500/25 blur-2xl" />

          <div className="relative z-10 max-w-[65%] leading-tight">
            <h3 className="text-[12px] font-bold text-white">
              AI Assistant
            </h3>
            <p className="mt-1 text-[10px] text-slate-400 leading-normal">
              Tanya apa saja tentang kelas dan siswa Anda
            </p>
          </div>

          <div className="relative z-10">
            <Link
              href="/ai-tools"
              className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] bg-[#6366F1] px-3 text-[10px] font-bold text-white hover:bg-[#4F46E5] transition shadow-sm"
            >
              <span>Mulai Chat</span>
              <span className="text-[8px] text-slate-400">&gt;</span>
            </Link>
          </div>

          {/* Vektor Robot AI Flat 3D Modern */}
          <div className="absolute right-1 bottom-1 w-16 h-16 pointer-events-none z-10">
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
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl border border-slate-200 bg-white p-2.5 shadow-md lg:hidden"
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Lebar Sidebar 270px, Scrollbar sepenuhnya dihapus (overflow-hidden) */}
      <aside
        style={{
          background:
            'linear-gradient(180deg,#0F172A 0%,#111827 55%,#1F2937 100%)',
          borderRight:'1px solid rgba(255,255,255,.06)'
        }}
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col overflow-hidden",
          "transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "lg:static shrink-0"
        )}
      >
        <div className="relative flex h-full flex-col overflow-hidden">
          <NavContent />
        </div>
      </aside>
    </>
  )
}