'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Users, BookOpen, CalendarCheck, Star, Download,
  Plus, UserPlus, Upload, BarChart3, Sparkle
} from 'lucide-react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Tooltip
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

  const stats = [
    { label: 'Total Siswa', value: totalStudents, sub: 'siswa aktif', icon: Users, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Kelas', value: totalClasses, sub: 'rombongan belajar', icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Kehadiran Hari Ini', value: `${attendanceRate}%`, sub: 'tingkat hadir', icon: CalendarCheck, color: 'bg-amber-50 text-amber-600' },
    { label: 'Rata-rata Nilai', value: avgScore || '-', sub: 'semua kelas', icon: Star, color: 'bg-purple-50 text-purple-600' },
  ]

  const quickActions = [
    { label: 'Input Nilai Baru', sub: 'Tambah nilai siswa', icon: Plus, color: 'bg-indigo-600', href: '/classes' },
    { label: 'Absensi Hari Ini', sub: 'Catat kehadiran cepat', icon: CalendarCheck, color: 'bg-emerald-600', onClick: () => setShowAttendanceModal(true) },
    { label: 'Import Data Siswa', sub: 'Upload file Excel', icon: Upload, color: 'bg-amber-500', href: '/import' },
    { label: 'Lihat Laporan', sub: 'Statistik lengkap', icon: BarChart3, color: 'bg-slate-700', href: '/students' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ringkasan Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Selamat datang kembali, {userName}. Berikut adalah update hari ini.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAttendanceModal(true)} className="btn-secondary text-sm">
            <CalendarCheck className="w-4 h-4" /> Absensi
          </button>
          <Link href="/import" className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export Data
          </Link>
          <Link href="/classes" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Tambah Nilai
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 text-sm">Kehadiran Minggu Ini</h2>
          <p className="text-xs text-slate-400 mb-4">Persentase hadir per hari</p>
          {weeklyAttendance.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">Belum ada data absensi</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyAttendance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip />
                <Bar dataKey="rate" fill="#facc15" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 text-sm">Tren Nilai</h2>
          <p className="text-xs text-slate-400 mb-4">Rata-rata nilai per bulan</p>
          {gradeTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">Belum ada data nilai</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={gradeTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[60, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Activity + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 text-sm">Aktivitas Terbaru</h2>
            <button className="text-xs text-indigo-600 hover:underline">Lihat Semua</button>
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
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${act.iconBg}`}>
                    <act.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{act.title}</p>
                    <p className="text-xs text-slate-400 truncate">{act.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 text-sm mb-4">Tindakan Cepat</h2>
          <div className="space-y-2.5">
            {quickActions.map(qa => {
              const content = (
                <>
                  <div className={`w-9 h-9 ${qa.color} rounded-lg flex items-center justify-center shrink-0`}>
                    <qa.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{qa.label}</p>
                    <p className="text-xs text-slate-400 truncate">{qa.sub}</p>
                  </div>
                </>
              )
              if (qa.onClick) {
                return (
                  <button
                    key={qa.label}
                    onClick={qa.onClick}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100 w-full text-left"
                  >
                    {content}
                  </button>
                )
              }
              return (
                <Link
                  key={qa.label}
                  href={qa.href!}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
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
