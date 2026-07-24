'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Users, BookOpen, CalendarCheck, Star, Download, Plus, Sparkle, ArrowUpRight,
  Award, FileBarChart
} from 'lucide-react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  AreaChart, Area, Tooltip, LineChart, Line
} from 'recharts'
import QuickAttendanceModal from '@/components/dashboard/QuickAttendanceModal'

interface ActivityItem {
  id: string
  icon: any
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
}

// Sparklines data mock untuk visualisasi ringkas di dalam kartu KPI
const sparkSiswa = [{ v: 40 }, { v: 45 }, { v: 42 }, { v: 50 }, { v: 58 }, { v: 63 }]
const sparkKelas = [{ v: 2 }, { v: 2 }, { v: 3 }, { v: 3 }, { v: 3 }, { v: 3 }]
const sparkKehadiran = [{ v: 80 }, { v: 85 }, { v: 83 }, { v: 92 }, { v: 90 }, { v: 92 }]
const sparkNilai = [{ v: 75 }, { v: 78 }, { v: 82 }, { v: 80 }, { v: 85 }, { v: 84.7 }]

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)

  const [totalStudents, setTotalStudents] = useState(63)
  const [totalClasses, setTotalClasses] = useState(3)
  const [attendanceRate, setAttendanceRate] = useState(92)
  const [avgScore, setAvgScore] = useState(84.7)

  const [weeklyAttendance, setWeeklyAttendance] = useState<{ day: string, rate: number }[]>([
    { day: 'Sen', rate: 85 },
    { day: 'Sel', rate: 90 },
    { day: 'Rab', rate: 88 },
    { day: 'Kam', rate: 95 },
    { day: 'Jum', rate: 92 }
  ])

  const [gradeTrend, setGradeTrend] = useState<{ month: string, avg: number }[]>([
    { month: 'Jan', avg: 78 },
    { month: 'Feb', avg: 82 },
    { month: 'Mar', avg: 80 },
    { month: 'Apr', avg: 85 },
    { month: 'Mei', avg: 87 },
    { month: 'Jun', avg: 84 }
  ])

  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: '1', icon: CalendarCheck, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500',
      title: 'Absensi kelas XI IPA 1 telah diisi',
      subtitle: 'oleh rakaziwi • 2 jam yang lalu'
    },
    {
      id: '2', icon: Award, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-500',
      title: 'Nilai Matematika kelas X IPS 2 diperbarui',
      subtitle: 'oleh rakaziwi • 5 jam yang lalu'
    },
    {
      id: '3', icon: FileBarChart, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500',
      title: 'Laporan bulanan Juni 2026 dibuat',
      subtitle: 'oleh rakaziwi • Kemarin, 16:30'
    }
  ])

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

    const [{ data: students }, { data: classes }, { data: grades }, { data: attendance }] = await Promise.all([
      supabase.from('students').select('*').eq('user_id', user.id),
      supabase.from('classes').select('*').eq('user_id', user.id),
      supabase.from('grades').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('attendance').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ])

    if (students && students.length > 0) setTotalStudents(students.length)
    if (classes && classes.length > 0) setTotalClasses(classes.length)

    if (grades && grades.length > 0) {
      const avg = grades.reduce((a, g) => a + Number(g.score), 0) / grades.length
      setAvgScore(Math.round(avg * 10) / 10)
    }

    // Refresh data absensi mingguan jika ada di database
    if (attendance && attendance.length > 0) {
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
      const last7: Record<string, { hadir: number, total: number }> = {}
      const today = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        last7[key] = { hadir: 0, total: 0 }
      }
      attendance.forEach(a => {
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
      if (weekData.length > 0) setWeeklyAttendance(weekData)

      const todayStr = today.toISOString().split('T')[0]
      const todayAtt = attendance.filter(a => a.date === todayStr)
      if (todayAtt.length > 0) {
        const hadir = todayAtt.filter(a => a.status === 'hadir').length
        setAttendanceRate(Math.round((hadir / todayAtt.length) * 100))
      }
    }

    // Ambil tren bulanan jika data nilai tersedia
    if (grades && grades.length > 0) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
      const monthly: Record<string, number[]> = {}
      grades.forEach(g => {
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
      if (trendData.length > 0) setGradeTrend(trendData)
    }

    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAttendanceModalClose = () => {
    setShowAttendanceModal(false)
    fetchAll()
  }

  const stats = [
    { label: 'Total Siswa', value: totalStudents, trend: '8 dari bulan lalu', spark: sparkSiswa, icon: Users, color: 'bg-indigo-500/10 text-indigo-500', strokeColor: '#6366f1' },
    { label: 'Total Kelas', value: totalClasses, trend: '1 dari bulan lalu', spark: sparkKelas, icon: BookOpen, color: 'bg-emerald-500/10 text-emerald-500', strokeColor: '#10b981' },
    { label: 'Kehadiran Hari Ini', value: `${attendanceRate}%`, trend: '12% dari kemarin', spark: sparkKehadiran, icon: CalendarCheck, color: 'bg-amber-500/10 text-amber-500', strokeColor: '#f59e0b' },
    { label: 'Rata-rata Nilai', value: avgScore.toString().replace('.', ','), trend: '3,6 dari bulan lalu', spark: sparkNilai, icon: Star, color: 'bg-purple-500/10 text-purple-500', strokeColor: '#a855f7' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">Memuat dashboard...</div>
  }

  return (
    <div className="space-y-6 px-6 sm:px-8 pb-8 bg-[#F8FAFC]">
      {/* Baris Tombol Aksi Utama */}
      <div className="flex gap-3">
        <button onClick={() => setShowAttendanceModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs transition">
          <CalendarCheck className="w-4 h-4 text-slate-500" /> Absensi
        </button>
        <Link href="/import" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs transition">
          <Download className="w-4 h-4 text-slate-500" /> Export Data
        </Link>
        <button onClick={() => router.push('/kelas')} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-600/10 transition ml-auto sm:ml-0">
          <Plus className="w-4 h-4" /> Tambah Nilai
        </button>
      </div>

      {/* Grid KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map(({ label, value, trend, spark, icon: Icon, color, strokeColor }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100 flex flex-col justify-between h-40">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">{label}</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{value}</p>
              </div>
              <div className={`p-3 rounded-2xl ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            
            <div className="flex items-end justify-between mt-auto">
              {/* Trend Arrow */}
              <p className="text-[10px] font-bold text-indigo-500 flex items-center gap-0.5">
                <span className="text-xs">↗</span> {trend}
              </p>
              
              {/* Mini Sparkline Chart */}
              <div className="w-16 h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spark}>
                    <Line type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={1.8} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Grafik */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik Kehadiran */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Kehadiran Minggu Ini</h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Persentase hadir per hari</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-500 px-3 py-1.5 rounded-lg focus:outline-none">
              <option>Semua Kelas</option>
            </select>
          </div>

          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={weeklyAttendance} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
              <Tooltip />
              <Area type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRate)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-50 text-center mt-3">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rata-rata Kehadiran</p>
              <p className="text-sm font-bold text-slate-900 mt-1">90%</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tertinggi</p>
              <p className="text-sm font-bold text-slate-900 mt-1">95% <span className="text-[10px] text-slate-400 font-medium">Kamis</span></p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Terendah</p>
              <p className="text-sm font-bold text-slate-900 mt-1">85% <span className="text-[10px] text-slate-400 font-medium">Senin</span></p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Siswa</p>
              <p className="text-sm font-bold text-slate-900 mt-1">63 <span className="text-[10px] text-emerald-500 font-bold">Aktif</span></p>
            </div>
          </div>
        </div>

        {/* Grafik Tren Nilai */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Tren Nilai</h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Rata-rata nilai per bulan</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-500 px-3 py-1.5 rounded-lg focus:outline-none">
              <option>Semua Kelas</option>
            </select>
          </div>

          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={gradeTrend} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
              <Tooltip />
              <Bar dataKey="avg" fill="url(#barGradient)" radius={[8, 8, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>

          <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-3">
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rata-rata Nilai</p>
                <p className="text-sm font-bold text-slate-900 mt-1">84,7</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Peningkatan</p>
                <p className="text-sm font-bold text-emerald-500 mt-1 flex items-center gap-1">
                  <span>↗</span> 3,6 <span className="text-[10px] text-slate-400 font-medium">dari bulan lalu</span>
                </p>
              </div>
            </div>
            <button className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 hover:bg-indigo-100/70 transition">
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Baris Aktivitas Terbaru secara Horizontal */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">Aktivitas Terbaru</h2>
          <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">Lihat Semua &gt;</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activities.map(act => (
            <div key={act.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${act.iconBg} ${act.iconColor}`}>
                <act.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate leading-snug">{act.title}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">{act.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAttendanceModal && (
        <QuickAttendanceModal onClose={handleAttendanceModalClose} />
      )}
    </div>
  )
}