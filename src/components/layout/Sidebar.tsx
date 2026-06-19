'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, ClipboardList, Award,
  Upload, Settings, LogOut, GraduationCap, Menu, X,
  Building2, UserCircle, FolderOpen, BookOpen
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Kelas',
    href: '/classes',
    icon: BookOpen,
  },
  {
    label: 'Kelola Data',
    href: null,
    icon: FolderOpen,
    children: [
      { href: '/students', label: 'Data Siswa', icon: Users },
      { href: '/grades',   label: 'Data Nilai', icon: Award },
      { href: '/attendance', label: 'Data Absensi', icon: ClipboardList },
      { href: '/import',   label: 'Import Data', icon: Upload },
    ],
  },
  {
    label: 'Sekolah',
    href: '/sekolah',
    icon: Building2,
  },
  {
    label: 'Pusat Akun',
    href: '/akun',
    icon: UserCircle,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>('Kelola Data')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => pathname.startsWith(href)
  const isGroupActive = (children: { href: string }[]) =>
    children.some(c => pathname.startsWith(c.href))

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm">Asisten Guru</span>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">Sistem Manajemen Sekolah</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="p-1 text-slate-400 hover:text-slate-600 lg:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          if (item.children) {
            const groupActive = isGroupActive(item.children)
            const isOpen = openGroup === item.label || groupActive
            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenGroup(isOpen ? null : item.label)}
                  className={clsx(
                    'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    groupActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={clsx('w-4 h-4 shrink-0', groupActive ? 'text-emerald-600' : 'text-slate-400')} />
                    {item.label}
                  </div>
                  <svg
                    className={clsx('w-3 h-3 transition-transform text-slate-400', isOpen && 'rotate-180')}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-3">
                    {item.children.map(child => {
                      const active = isActive(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={clsx(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                          )}
                        >
                          <child.icon className={clsx('w-3.5 h-3.5 shrink-0', active ? 'text-emerald-600' : 'text-slate-400')} />
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const active = isActive(item.href!)
          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate:900'
              )}
            >
              <item.icon className={clsx('w-4 h-4 shrink-0', active ? 'text-emerald-600' : 'text-slate-400')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Tahun Ajaran */}
      <div className="px-3 pb-2">
        <div className="bg-emerald-50 rounded-lg px-3 py-2.5">
          <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">Tahun Ajaran Aktif</p>
          <p className="text-sm font-bold text-emerald-800 mt-0.5">2024 / 2025</p>
          <p className="text-xs text-emerald-600">Semester Genap</p>
        </div>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          Keluar
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-sm border border-slate-200 lg:hidden"
      >
        <Menu className="w-5 h-5 text-slate-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </aside>
    </>
  )
}
