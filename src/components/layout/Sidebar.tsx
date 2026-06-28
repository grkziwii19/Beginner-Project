'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ClipboardCheck, Award, FileBarChart,
  Settings, Menu, X, Calendar, Building2, IdCard,
  BookOpen
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

// "Akademik" hanyalah judul pemisah bagian (section label), bukan tombol.
// Data Siswa, Absensi, Nilai selalu tampil di bawahnya tanpa perlu expand/collapse.
// Menu "Kelas" terpisah sudah dihapus — manajemen kelas (buat/pilih kelas)
// sekarang berada di dalam halaman Data Siswa.
const navRows: NavRow[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },

  { type: 'section', label: 'Akademik' },

  { href: '/data-siswa', label: 'Data Siswa', icon: IdCard },
  { href: '/absensi', label: 'Absensi', icon: ClipboardCheck },
  { href: '/akademik/nilai', label: 'Nilai', icon: BookOpen },

  { href: '/laporan', label: 'Laporan', icon: FileBarChart },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  
  const [schoolName, setSchoolName] = useState('')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: school } = await supabase
      .from('school_profiles')
      .select('name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (school?.name) {
      setSchoolName(school.name)
    }
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

  const dayLabel = now.toLocaleDateString('id-ID', { weekday: 'long' })
  const dateLabel = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <row.icon className="w-4 h-4 shrink-0" />
              {row.label}
            </Link>
          )
        })}
      </nav>

      
      {/* Info footer */}
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
      <button onClick={() => setMobileOpen(true)} className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-sm border border-slate-200 lg:hidden">
        <Menu className="w-5 h-5 text-slate-600" />
      </button>

      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </aside>
    </>
  )
}
