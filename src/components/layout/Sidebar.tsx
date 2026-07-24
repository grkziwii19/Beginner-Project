'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  ClipboardCheck,
  Award,
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

const navRows: NavRow[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    type: 'section',
    label: 'AKADEMIK',
  },
  {
    href: '/kelas',
    label: 'Kelas',
    icon: IdCard,
  },
  {
    href: '/absensi',
    label: 'Absensi',
    icon: ClipboardCheck,
  },
  {
    href: '/akademik/nilai',
    label: 'Nilai',
    icon: Award,
  },
  {
    href: '/laporan',
    label: 'Laporan',
    icon: FileBarChart,
  },
  {
    href: '/ai-tools',
    label: 'AI Tools',
    icon: Sparkles,
  },
  {
    type: 'section',
    label: 'SISTEM',
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
    : ''

  const dateLabel = mounted
    ? now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const timeLabel = mounted
    ? now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  const NavContent = () => (
    <>
      {/* ========================= */}
      {/* LOGO */}
      {/* ========================= */}

      <div className="relative overflow-hidden border-b border-white/10 px-6 py-6">

        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-cyan-500/10" />

        <div className="relative flex items-center gap-4">

          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-600 shadow-[0_15px_40px_rgba(79,70,229,.45)]">

            <div className="absolute inset-0 rounded-2xl border border-white/20" />

            <span className="text-2xl font-black tracking-tight text-white">
              G
            </span>

          </div>

          <div className="min-w-0">

            <h1 className="truncate text-lg font-extrabold tracking-tight text-white">
              GR Assistant
            </h1>

            <p className="mt-0.5 text-xs text-slate-400">
              Smart Digital Teacher Platform
            </p>

          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

      </div>

      {/* ========================= */}
      {/* NAVIGATION */}
      {/* ========================= */}

      <nav className="flex-1 overflow-y-auto px-5 py-6 space-y-2 custom-scrollbar">
        {navRows.map((row, index) => {
          if (isSection(row)) {
            return (
              <div
                key={row.label}
                className={clsx(
                  index !== 0 && "pt-5",
                  "px-3"
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
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
                "group relative flex items-center overflow-hidden rounded-2xl transition-all duration-300",

                active
                  ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 shadow-[0_15px_35px_rgba(79,70,229,.45)]"
                  : "hover:bg-white/[0.05]"
              )}
            >
              {/* Active Indicator */}
              {active && (
                <>
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white" />

                  <div className="absolute right-0 top-0 h-full w-20 bg-white/10 blur-2xl" />
                </>
              )}

              <div
                className={clsx(
                  "flex w-full items-center gap-4 px-4 py-3.5 transition-all duration-300",

                  active
                    ? "translate-x-1"
                    : "group-hover:translate-x-1"
                )}
              >
                <div
                  className={clsx(
                    "flex h-11 w-11 items-center justify-center rounded-xl transition-all",

                    active
                      ? "bg-white/15 text-white"
                      : "bg-slate-800/70 text-slate-400 group-hover:bg-slate-700 group-hover:text-white"
                  )}
                >
                  <row.icon className="h-[19px] w-[19px]" />
                </div>

                <div className="flex flex-1 items-center justify-between">

                  <span
                    className={clsx(
                      "text-[14px] font-semibold transition-colors",

                      active
                        ? "text-white"
                        : "text-slate-300 group-hover:text-white"
                    )}
                  >
                    {row.label}
                  </span>

                  {active && (
                    <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]" />
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* ========================= */}
      {/* FOOTER */}
      {/* ========================= */}

      <div className="border-t border-white/10 bg-gradient-to-b from-transparent to-slate-950/50 p-5 space-y-4">
        {/* ========================= */}
        {/* PROFILE CARD */}
        {/* ========================= */}

        <div className="relative">

          <button
            onClick={() => setShowProfileMenu((v) => !v)}
            className="group relative w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-4 backdrop-blur-xl transition-all duration-300 hover:border-indigo-400/30 hover:shadow-[0_20px_40px_rgba(79,70,229,.25)]"
          >
            {/* Glow */}
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl transition-all duration-500 group-hover:bg-indigo-500/30" />

            <div className="relative flex items-center gap-4">

              {/* Avatar */}
              <div className="relative">

                <div className="h-14 w-14 overflow-hidden rounded-2xl ring-2 ring-white/10">

                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={userName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
                      {initials}
                    </div>
                  )}

                </div>

                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-slate-900 bg-emerald-400 shadow-lg shadow-emerald-400/40" />

              </div>

              {/* User */}
              <div className="min-w-0 flex-1 text-left">

                <h3 className="truncate text-[15px] font-bold text-white">
                  {userName}
                </h3>

                <p className="truncate text-xs text-slate-400">
                  {email}
                </p>

                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1">

                  <span className="h-2 w-2 rounded-full bg-emerald-400" />

                  <span className="text-[10px] font-semibold text-emerald-300">
                    Online
                  </span>

                </div>

              </div>

              <ChevronDown className="h-5 w-5 text-slate-500 transition group-hover:text-white group-hover:rotate-180" />

            </div>

          </button>

          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />

              <div className="absolute bottom-full left-0 z-50 mb-3 w-full overflow-hidden rounded-2xl border border-slate-700 bg-[#111827] shadow-2xl">

                <Link
                  href="/akun"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <UserCircle className="h-4 w-4" />
                  Akun Saya
                </Link>

                <div className="border-t border-white/10" />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-5 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>

              </div>
            </>
          )}
        </div>

        {/* SCHOOL INFO */}
        {/* ========================= */}
        {/* SCHOOL INFO */}
        {/* ========================= */}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-400/10">

              <Building2 className="h-5 w-5 text-cyan-300" />

            </div>

            <div className="min-w-0 flex-1">

              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Sekolah
              </p>

              <h4 className="mt-1 truncate text-sm font-bold text-white">
                {schoolName || 'SMAN 1 Sumarorong'}
              </h4>

              <p className="mt-1 text-xs text-slate-400">
                Sistem Akademik Aktif
              </p>

            </div>

          </div>

        </div>

        {/* ========================= */}
        {/* ACADEMIC YEAR */}
        {/* ========================= */}

        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-[#1B214D] via-[#161B3D] to-[#111827] p-5">

          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative flex items-start justify-between">

            <div>

              <p className="text-[10px] uppercase tracking-[0.22em] text-indigo-300">
                Tahun Ajaran
              </p>

              <h3 className="mt-2 text-xl font-extrabold text-white">
                2024 / 2025
              </h3>

              <p className="mt-1 text-sm text-indigo-200">
                Semester Genap
              </p>

            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">

              <GraduationCap className="h-7 w-7 text-indigo-300" />

            </div>

          </div>

          <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/10">

            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400" />

          </div>

          <div className="relative mt-2 flex items-center justify-between text-[11px]">

            <span className="text-slate-400">
              Progress Semester
            </span>

            <span className="font-bold text-white">
              72%
            </span>

          </div>

        </div>

        {/* ========================= */}
        {/* DATE & TIME */}
        {/* ========================= */}

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-900/30 p-5 backdrop-blur-xl">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15">

                <Calendar className="h-5 w-5 text-indigo-300" />

              </div>

              <div>

                <p className="text-sm font-bold text-white">
                  {dayLabel}
                </p>

                <p className="text-xs text-slate-400">
                  {dateLabel}
                </p>

              </div>

            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2">

              <span className="text-sm font-bold tracking-wider text-indigo-300">
                {timeLabel}
              </span>

            </div>

          </div>

        </div>

        {/* ========================= */}
        {/* AI ASSISTANT CARD */}
        {/* ========================= */}
        {/* AI ASSISTANT */}
        {/* ========================= */}

        <div className="group relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-[#1d2558] via-[#151a3f] to-[#101426] p-5">

          {/* Background Glow */}
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-500/20 blur-3xl transition duration-500 group-hover:scale-125" />

          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10">

            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1">

              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
                AI Powered
              </span>

            </div>

            <h3 className="mt-4 text-xl font-extrabold leading-tight text-white">
              AI Assistant
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Tanya apa saja mengenai siswa, kelas,
              nilai, absensi, maupun administrasi
              sekolah secara instan.
            </p>

            <Link
              href="/ai-tools"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-bold text-white transition duration-300 hover:scale-[1.03] hover:shadow-[0_20px_35px_rgba(99,102,241,.45)]"
            >
              <Sparkles className="h-4 w-4" />
              Mulai Chat AI
            </Link>

          </div>

          {/* Illustration */}

          <div className="pointer-events-none absolute right-3 bottom-0 opacity-95">

            <div className="relative">

              <div className="absolute inset-0 rounded-full bg-indigo-500/30 blur-2xl" />

              <svg
                width="120"
                height="120"
                viewBox="0 0 120 120"
                fill="none"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="34"
                  fill="#EEF2FF"
                />

                <rect
                  x="38"
                  y="30"
                  width="44"
                  height="36"
                  rx="18"
                  fill="#1E293B"
                />

                <circle
                  cx="52"
                  cy="48"
                  r="4"
                  fill="#60A5FA"
                />

                <circle
                  cx="68"
                  cy="48"
                  r="4"
                  fill="#60A5FA"
                />

                <rect
                  x="46"
                  y="72"
                  width="28"
                  height="20"
                  rx="8"
                  fill="#CBD5E1"
                />

                <rect
                  x="34"
                  y="75"
                  width="8"
                  height="18"
                  rx="4"
                  fill="#CBD5E1"
                />

                <rect
                  x="78"
                  y="75"
                  width="8"
                  height="18"
                  rx="4"
                  fill="#CBD5E1"
                />
              </svg>

            </div>

          </div>

        </div>

      </div>
    </>
  )

  return (
    <>

      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg lg:hidden"
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-[300px] flex-col overflow-hidden border-r border-white/10",
          "bg-gradient-to-b from-[#081120] via-[#0d1629] to-[#111827]",
          "shadow-[25px_0_60px_rgba(2,6,23,.45)]",
          "transition-transform duration-300",

          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",

          "lg:static"
        )}
      >

        {/* Noise Overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle,#fff 1px,transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
        </div>

        <div className="relative flex h-full flex-col">
          <NavContent />
        </div>

      </aside>

    </>
  )
}
