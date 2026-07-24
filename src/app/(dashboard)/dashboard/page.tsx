'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Users, BookOpen, CalendarCheck, Star, Download,
  Plus, UserPlus, Upload, BarChart3, Sparkle, ChevronRight, ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip, LabelList
} from 'recharts'
import QuickAttendanceModal from '@/components/dashboard/QuickAttendanceModal'

interface ActivityItem {
  id: string
  icon: any
  iconBg: string
  title: string
  subtitle: string
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [userName, setUserName] = useState('Guru')
  const [loading, setLoading] = useState(true)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)

  const [totalStudents, setTotalStudents] = useState(0)
  const [totalClasses, setTotalClasses] = useState(0)
  const [attendanceRate, setAttendanceRate] = useState(0)
  const [avgScore, setAvgScore] = useState(0)

  const [weeklyAttendance, setWeeklyAttendance] = useState<{ day: string, rate: number }[]>([])
  const [gradeTrend, setGradeTrend] = useState<{ month: string, avg: number }[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
  setLoading(false)
  router.push('/login')
  return
}

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.onboarding_completed) {
      router.push('/onboarding')
      return
    }

    if (profile?.full_name) {
      setUserName(profile.full_name.split(' ')[0])
    } else {
      setUserName(user.email?.split('@')[0] ?? 'Guru')
    }

    const [{ data: students }, { data: classes }, { data: grades }, { data: attendance }] = await Promise.all([
      supabase.from('students').select('*').eq('user_id', user.id),
      supabase.from('classes').select('*').eq('user_id', user.id),
      supabase.from('grades').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('attendance').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ])

    setTotalStudents(students?.length ?? 0)
    setTotalClasses(classes?.length ?? 0)

    if (grades && grades.length > 0) {
      const avg = grades.reduce((a, g) => a + Number(g.score), 0) / grades.length
      setAvgScore(Math.round(avg * 10) / 10)
    }

    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    const last7: Record<string, { hadir: number, total: number }> = {}
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      last7[key] = { hadir: 0, total: 0 }
    }
    attendance?.forEach(a => {
      if (last7[a.date]) {
        last7[a.date].total++
        if (a.status === 'hadir') last7[a.date].hadir++
      }
    })
    const weekData = Object.entries(last7)
      .filter(([date]) => {
        const dow = new Date(date).getDay()
        return dow >= 1 && dow <= 5
      })
      .map(([date, v]) => ({
        day: days[new Date(date).getDay()],
        rate: v.total > 0 ? Math.round((v.hadir / v.total) * 100) : 0,
      }))
    setWeeklyAttendance(weekData)

    const todayStr = today.toISOString().split('T')[0]
    const todayAtt = attendance?.filter(a => a.date === todayStr) ?? []
    if (todayAtt.length > 0) {
      const hadir = todayAtt.filter(a => a.status === 'hadir').length
      setAttendanceRate(Math.round((hadir / todayAtt.length) * 100))
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
    const monthly: Record<string, number[]> = {}
    grades?.forEach(g => {
      const d = new Date(g.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!monthly[key]) monthly[key] = []
      monthly[key].push(Number(g.score))
    })
    const trendData = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, scores]) => {
        const [, monthIdx] = key.split('-')
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        return { month: monthNames[Number(monthIdx)], avg: Math.round(avg) }
      })
    setGradeTrend(trendData)

    const acts: ActivityItem[] = []
    grades?.slice(0, 2).forEach(g => {
      const st = students?.find(s => s.id === g.student_id)
      acts.push({
        id: g.id, icon: Star, iconBg: 'bg-amber-50 text-amber-500',
        title: `Nilai ${g.type.toUpperCase()} ${st?.class_name ?? ''} diinput`,
        subtitle: `${st?.name ?? '-'} - ${g.subject}`,
      })
    })
    attendance?.slice(0, 2).forEach(a => {
      const st = students?.find(s => s.id === a.student_id)
      acts.push({
        id: a.id, icon: CalendarCheck, iconBg: 'bg-emerald-50 text-emerald-500',
        title: `Absensi kelas ${st?.class_name ?? ''} dicatat`,
        subtitle: `Status: ${a.status}`,
      })
    })
    students?.slice(0, 1).forEach(s => {
      acts.push({
        id: s.id, icon: UserPlus, iconBg: 'bg-purple-50 text-purple-500',
        title: 'Siswa baru ditambahkan',
        subtitle: `${s.name} - ${s.class_name}`,
      })
    })
    setActivities(acts.slice(0, 5))

    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAttendanceModalClose = () => {
    setShowAttendanceModal(false)
    fetchAll() // refresh data setelah absen disimpan
  }

  // --- Ringkasan turunan untuk tampilan (dihitung dari data yang sudah diambil, tanpa fetch baru) ---
  const avgWeeklyAttendance = weeklyAttendance.length
    ? Math.round(weeklyAttendance.reduce((a, b) => a + b.rate, 0) / weeklyAttendance.length)
    : 0
  const highestAttendance = weeklyAttendance.length
    ? weeklyAttendance.reduce((a, b) => (b.rate > a.rate ? b : a))
    : null
  const lowestAttendance = weeklyAttendance.length
    ? weeklyAttendance.reduce((a, b) => (b.rate < a.rate ? b : a))
    : null
  const gradeImprovement = gradeTrend.length >= 2
    ? gradeTrend[gradeTrend.length - 1].avg - gradeTrend[0].avg
    : 0

  const stats = [
    { label: 'Total Siswa', value: totalStudents, sub: 'siswa aktif', icon: Users, iconBg: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Kelas', value: totalClasses, sub: 'rombongan belajar', icon: BookOpen, iconBg: 'bg-emerald-50 text-emerald-600' },
    { label: 'Kehadiran Hari Ini', value: `${attendanceRate}%`, sub: 'tingkat hadir', icon: CalendarCheck, iconBg: 'bg-amber-50 text-amber-600' },
    { label: 'Rata-rata Nilai', value: avgScore || '-', sub: 'semua kelas', icon: Star, iconBg: 'bg-purple-50 text-purple-600' },
  ]

  const quickActions = [
    { label: 'Input Nilai Baru', sub: 'Tambah nilai siswa', icon: Plus, color: 'bg-indigo-600', href: '/kelas' },
    { label: 'Absensi Hari Ini', sub: 'Catat kehadiran cepat', icon: CalendarCheck, color: 'bg-emerald-600', onClick: () => setShowAttendanceModal(true) },
    { label: 'Import Data Siswa', sub: 'Upload file Excel', icon: Upload, color: 'bg-amber-500', href: '/import' },
    { label: 'Lihat Laporan', sub: 'Statistik lengkap', icon: BarChart3, color: 'bg-slate-700', href: '/students' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Selamat datang kembali, {userName} 👋</h1>
        <p className="text-sm text-slate-500 mt-0.5">Berikut adalah update dan aktivitas kelas hari ini.</p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={() => setShowAttendanceModal(true)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <CalendarCheck className="w-4 h-4" /> Absensi
        </button>
        <Link
          href="/import"
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Export Data
        </Link>
        <Link
          href="/kelas"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm shadow-indigo-200"
        >
          <Plus className="w-4 h-4" /> Tambah Nilai
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, iconBg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
            <p className="text-xs text-slate-400 mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Kehadiran Minggu Ini</h2>
              <p className="text-xs text-slate-400">Persentase hadir per hari</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50">
              Semua Kelas <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>
          {weeklyAttendance.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">Belum ada data absensi</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={weeklyAttendance} margin={{ top: 24, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  fill="url(#attendanceFill)"
                  dot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                >
                  <LabelList dataKey="rate" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="grid grid-cols-4 gap-2 mt-2 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400">Rata-rata Kehadiran</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{avgWeeklyAttendance}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Tertinggi</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{highestAttendance ? `${highestAttendance.rate}%` : '-'}</p>
              <p className="text-[11px] text-slate-400">{highestAttendance?.day ?? ''}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Terendah</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{lowestAttendance ? `${lowestAttendance.rate}%` : '-'}</p>
              <p className="text-[11px] text-slate-400">{lowestAttendance?.day ?? ''}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Siswa</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{totalStudents}</p>
              <p className="text-[11px] text-slate-400">Aktif</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Tren Nilai</h2>
              <p className="text-xs text-slate-400">Rata-rata nilai per bulan</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50">
              Semua Kelas <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>
          {gradeTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">Belum ada data nilai</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={gradeTrend} margin={{ top: 24, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="avg" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={38}>
                  <LabelList dataKey="avg" position="top" style={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400">Rata-rata Nilai</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{avgScore || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Peningkatan</p>
              <p className={`text-sm font-bold mt-0.5 ${gradeImprovement >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {gradeImprovement >= 0 ? '+' : ''}{gradeImprovement} dari bulan lalu
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 text-sm">Aktivitas Terbaru</h2>
            <button className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {activities.length === 0 ? (
            <div className="text-center py-10">
              <Sparkle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Belum ada aktivitas</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activities.map(act => (
                <div key={act.id} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${act.iconBg}`}>
                    <act.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{act.title}</p>
                    <p className="text-xs text-slate-400 truncate">{act.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 text-sm mb-4">Tindakan Cepat</h2>
          <div className="space-y-2.5">
            {quickActions.map(qa => {
              const content = (
                <>
                  <div className={`w-9 h-9 ${qa.color} rounded-xl flex items-center justify-center shrink-0`}>
                    <qa.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{qa.label}</p>
                    <p className="text-xs text-slate-400 truncate">{qa.sub}</p>
                  </div>
                </>
              )
              if (qa.onClick) {
                return (
                  <button
                    key={qa.label}
                    onClick={qa.onClick}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 w-full text-left"
                  >
                    {content}
                  </button>
                )
              }
              return (
                <Link
                  key={qa.label}
                  href={qa.href!}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100"
                >
                  {content}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {showAttendanceModal && (
        <QuickAttendanceModal onClose={handleAttendanceModalClose} />
      )}
    </div>
  )
}