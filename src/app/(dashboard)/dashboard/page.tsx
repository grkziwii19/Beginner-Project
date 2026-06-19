'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, ClipboardCheck, TrendingUp, AlertCircle,
  Clock, UserPlus, BookOpen, Upload, Download,
  FileText, ChevronRight, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { getPredicate } from '@/types'

interface ActivityItem {
  id: string
  type: 'siswa' | 'nilai' | 'absensi' | 'kelas'
  title: string
  subtitle: string
  time: string
}

interface ClassDist {
  name: string
  count: number
}

interface RecentData {
  type: string
  detail: string
  kelas: string
  waktu: string
}

export default function DashboardPage() {
  const supabase = createClient()
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  const [totalStudents, setTotalStudents] = useState(0)
  const [presentToday, setPresentToday] = useState(0)
  const [absentToday, setAbsentToday] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [totalGrades, setTotalGrades] = useState(0)
  const [totalAttendance, setTotalAttendance] = useState(0)
  const [classDist, setClassDist] = useState<ClassDist[]>([])
  const [recentData, setRecentData] = useState<RecentData[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserName(user.email?.split('@')[0] ?? 'Guru')

      const [
        { data: students },
        { data: todayAtt },
        { data: grades },
        { data: allAtt },
      ] = await Promise.all([
        supabase.from('students').select('*').eq('user_id', user.id),
        supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', today),
        supabase.from('grades').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      ])

      // Stats
      setTotalStudents(students?.length ?? 0)
      const present = todayAtt?.filter(a => a.status === 'hadir').length ?? 0
      const absent = todayAtt?.filter(a => a.status !== 'hadir').length ?? 0
      setPresentToday(present)
      setAbsentToday(absent)
      setTotalGrades(grades?.length ?? 0)
      setTotalAttendance(allAtt?.length ?? 0)

      // Avg score
      if (grades && grades.length > 0) {
        const avg = grades.reduce((a, g) => a + Number(g.score), 0) / grades.length
        setAvgScore(Math.round(avg))
      }

      // Class distribution
      const dist: Record<string, number> = {}
      students?.forEach(s => {
        dist[s.class_name] = (dist[s.class_name] ?? 0) + 1
      })
      const distArr = Object.entries(dist)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setClassDist(distArr)

      // Recent data (last 4 entries across types)
      const recent: RecentData[] = []
      students?.slice(0, 2).forEach(s => {
        recent.push({ type: 'Siswa', detail: s.name, kelas: s.class_name, waktu: 'Baru' })
      })
      grades?.slice(0, 1).forEach(g => {
        const st = students?.find(s => s.id === g.student_id)
        recent.push({ type: 'Nilai', detail: `${g.subject} - ${g.type.toUpperCase()}`, kelas: st?.class_name ?? '-', waktu: 'Baru' })
      })
      allAtt?.slice(0, 1).forEach(a => {
        const st = students?.find(s => s.id === a.student_id)
        recent.push({ type: 'Absensi', detail: 'Absensi Harian', kelas: st?.class_name ?? '-', waktu: 'Baru' })
      })
      setRecentData(recent.slice(0, 4))

      // Activities
      const acts: ActivityItem[] = []
      students?.slice(0, 2).forEach(s => {
        acts.push({ id: s.id, type: 'siswa', title: 'Siswa baru ditambahkan', subtitle: `${s.name} - Kelas ${s.class_name}`, time: '' })
      })
      grades?.slice(0, 2).forEach(g => {
        const st = students?.find(s => s.id === g.student_id)
        acts.push({ id: g.id, type: 'nilai', title: 'Nilai diinput', subtitle: `${g.subject} - ${st?.class_name ?? ''}`, time: '' })
      })
      allAtt?.slice(0, 1).forEach(a => {
        const st = students?.find(s => s.id === a.student_id)
        acts.push({ id: a.id, type: 'absensi', title: 'Absensi diinput', subtitle: `Kelas ${st?.class_name ?? ''}`, time: '' })
      })
      setActivities(acts.slice(0, 5))

      setLoading(false)
    }

    fetchAll()
  }, [])

  const formatDate = () =>
    new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 11) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  }

  const attendanceRate = totalStudents > 0
    ? Math.round((presentToday / totalStudents) * 100)
    : 0

  const predicate = avgScore > 0 ? getPredicate(avgScore) : null

  const stats = [
    {
      label: 'Total Kelas',
      value: classDist.length,
      icon: BookOpen,
      color: 'bg-emerald-50 text-emerald-600',
      link: '/classes',
      desc: 'Lihat semua kelas →',
    },
    {
      label: 'Total Siswa',
      value: totalStudents,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      link: '/students',
      desc: 'Lihat semua siswa →',
    },
    {
      label: 'Data Nilai',
      value: totalGrades,
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
      link: '/grades',
      desc: 'Lihat rekap nilai →',
    },
    {
      label: 'Data Absensi',
      value: totalAttendance,
      icon: ClipboardCheck,
      color: 'bg-amber-50 text-amber-600',
      link: '/attendance',
      desc: 'Lihat rekap absensi →',
    },
    {
      label: 'Hadir Hari Ini',
      value: presentToday,
      icon: Clock,
      color: 'bg-teal-50 text-teal-600',
      link: '/attendance',
      desc: `${attendanceRate}% kehadiran`,
    },
  ]

  const quickActions = [
    { label: 'Tambah Siswa', sub: 'Tambahkan siswa baru ke kelas', icon: UserPlus, color: 'bg-emerald-500', href: '/students' },
    { label: 'Tambah Kelas', sub: 'Buat kelas baru', icon: BookOpen, color: 'bg-blue-500', href: '/classes' },
    { label: 'Import Data', sub: 'Import data siswa / nilai / absensi', icon: Upload, color: 'bg-purple-500', href: '/import' },
    { label: 'Export Data', sub: 'Export data ke Excel / PDF', icon: Download, color: 'bg-amber-500', href: '/import' },
    { label: 'Buat Laporan', sub: 'Buat laporan nilai / absensi', icon: FileText, color: 'bg-rose-500', href: '/grades' },
  ]

  const activityIconMap = {
    siswa: { color: 'bg-blue-500', icon: UserPlus },
    nilai: { color: 'bg-purple-500', icon: TrendingUp },
    absensi: { color: 'bg-amber-500', icon: ClipboardCheck },
    kelas: { color: 'bg-emerald-500', icon: BookOpen },
  }

  const maxCount = classDist.reduce((max, c) => Math.max(max, c.count), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Memuat dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {getGreeting()}, {userName}! 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Berikut ringkasan data dan aktivitas terbaru di sekolah Anda.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map(({ label, value, icon: Icon, color, link, desc }) => (
          <Link key={label} href={link} className="card p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
            <p className="text-xs text-emerald-600 mt-1 group-hover:underline">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Main 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Aktivitas Terbaru */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 text-sm">Aktivitas Terbaru</h2>
            <Link href="/students" className="text-xs text-emerald-600 hover:underline">Lihat semua</Link>
          </div>
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Belum ada aktivitas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((act, i) => {
                const { color, icon: Icon } = activityIconMap[act.type]
                return (
                  <div key={act.id + i} className="flex items-start gap-3">
                    <div className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{act.title}</p>
                      <p className="text-xs text-slate-400 truncate">{act.subtitle}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Grafik Siswa per Kelas */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 text-sm">Grafik Siswa per Kelas</h2>
            <Link href="/classes" className="text-xs text-emerald-600 hover:underline">Lihat detail</Link>
          </div>
          {classDist.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Belum ada data kelas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {classDist.map(c => (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-8 shrink-0">{c.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${Math.max((c.count / maxCount) * 100, 8)}%` }}
                    >
                      <span className="text-[10px] font-bold text-white">{c.count}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary info */}
              <div className="pt-3 mt-3 border-t border-slate-100 space-y-1.5">
                {presentToday > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    {absentToday} siswa tidak hadir hari ini
                  </div>
                )}
                {totalStudents === 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    Belum ada data siswa
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Action */}
        <div className="card p-4">
          <h2 className="font-semibold text-slate-900 text-sm mb-4">Quick Action</h2>
          <div className="space-y-2">
            {quickActions.map(qa => (
              <Link
                key={qa.label}
                href={qa.href}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className={`w-8 h-8 ${qa.color} rounded-lg flex items-center justify-center shrink-0`}>
                  <qa.icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{qa.label}</p>
                  <p className="text-xs text-slate-400 truncate">{qa.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom 2-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Ringkasan Nilai */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 text-sm">Ringkasan Nilai</h2>
            <Link href="/grades" className="text-xs text-emerald-600 hover:underline">Lihat semua</Link>
          </div>
          {avgScore === 0 ? (
            <div className="text-center py-6">
              <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Belum ada data nilai</p>
              <Link href="/grades" className="text-xs text-emerald-600 hover:underline mt-1 block">Input nilai sekarang →</Link>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-slate-900">{avgScore}</p>
                <p className="text-xs text-slate-400 mt-1">Rata-rata nilai</p>
                {predicate && (
                  <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                    Predikat {predicate}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total nilai</span>
                  <span className="font-medium">{totalGrades}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total siswa</span>
                  <span className="font-medium">{totalStudents}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Data Terbaru */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 text-sm">Data Terbaru</h2>
            <Link href="/students" className="text-xs text-emerald-600 hover:underline">Lihat semua data</Link>
          </div>
          {recentData.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Belum ada data</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-slate-400 font-medium pb-2">Jenis</th>
                    <th className="text-left text-slate-400 font-medium pb-2">Detail</th>
                    <th className="text-left text-slate-400 font-medium pb-2">Kelas</th>
                    <th className="text-right text-slate-400 font-medium pb-2">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentData.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          r.type === 'Siswa' ? 'bg-emerald-50 text-emerald-700' :
                          r.type === 'Nilai' ? 'bg-purple-50 text-purple-700' :
                          r.type === 'Absensi' ? 'bg-amber-50 text-amber-700' :
                          'bg-blue-50 text-blue-700'
                        }`}>{r.type}</span>
                      </td>
                      <td className="py-2 text-slate-700 max-w-[120px] truncate">{r.detail}</td>
                      <td className="py-2 text-slate-500">{r.kelas}</td>
                      <td className="py-2 text-right">
                        <Link
                          href={r.type === 'Siswa' ? '/students' : r.type === 'Nilai' ? '/grades' : '/attendance'}
                          className="text-emerald-600 hover:underline"
                        >
                          Lihat
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
