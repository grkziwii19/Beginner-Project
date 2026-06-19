'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type AttendanceStatus, getStatusColor, getStatusLabel } from '@/types'
import { ClipboardCheck, ChevronLeft, ChevronRight, Save, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

type AttendanceMap = Record<string, AttendanceStatus>
const STATUSES: AttendanceStatus[] = ['hadir', 'sakit', 'izin', 'alpha']

export default function AttendancePage() {
  const supabase = createClient()
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<AttendanceMap>({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [filterClass, setFilterClass] = useState('Semua')

  const classes = ['Semua', ...Array.from(new Set(students.map(s => s.class_name))).sort()]
  const filtered = filterClass === 'Semua' ? students : students.filter(s => s.class_name === filterClass)

  const fetchData = async (selectedDate: string) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: studentsData }, { data: attendanceData }] = await Promise.all([
      supabase.from('students').select('*').eq('user_id', user.id).order('class_name').order('name'),
      supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', selectedDate),
    ])

    setStudents(studentsData ?? [])
    const map: AttendanceMap = {}
    ;(attendanceData ?? []).forEach(a => { map[a.student_id] = a.status })
    setAttendance(map)
    setLoading(false)
  }

  useEffect(() => { fetchData(date) }, [date])

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }))
    setSaved(false)
  }

  const markAll = (status: AttendanceStatus) => {
    const map: AttendanceMap = {}
    filtered.forEach(s => { map[s.id] = status })
    setAttendance(prev => ({ ...prev, ...map }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const records = Object.entries(attendance).map(([student_id, status]) => ({
      user_id: user.id, student_id, date, status,
    }))

    await supabase.from('attendance').upsert(records, { onConflict: 'student_id,date' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const changeDate = (delta: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().split('T')[0])
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const summary = {
    hadir: filtered.filter(s => attendance[s.id] === 'hadir').length,
    sakit: filtered.filter(s => attendance[s.id] === 'sakit').length,
    izin:  filtered.filter(s => attendance[s.id] === 'izin').length,
    alpha: filtered.filter(s => attendance[s.id] === 'alpha').length,
    belum: filtered.filter(s => !attendance[s.id]).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Absensi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Input kehadiran siswa harian</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || students.length === 0}
          className={clsx('btn-primary', saved && 'bg-emerald-700 hover:bg-emerald-800')}
        >
          {saved ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</> : <><Save className="w-4 h-4" />{saving ? 'Menyimpan...' : 'Simpan Absensi'}</>}
        </button>
      </div>

      {/* Date Picker */}
      <div className="card p-4 flex items-center gap-4">
        <button onClick={() => changeDate(-1)} className="btn-secondary px-3">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="input text-center font-medium w-auto"
          />
          <p className="text-xs text-slate-400 mt-1 capitalize">{formatDate(date)}</p>
        </div>
        <button onClick={() => changeDate(1)} className="btn-secondary px-3">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { key: 'hadir', label: 'Hadir',  color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { key: 'sakit', label: 'Sakit',  color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { key: 'izin',  label: 'Izin',   color: 'bg-amber-50 text-amber-700 border-amber-100' },
          { key: 'alpha', label: 'Alpha',  color: 'bg-red-50 text-red-700 border-red-100' },
          { key: 'belum', label: 'Belum',  color: 'bg-slate-100 text-slate-500 border-slate-200' },
        ].map(({ key, label, color }) => (
          <div key={key} className={`rounded-xl p-3 text-center border ${color}`}>
            <p className="text-2xl font-bold">{summary[key as keyof typeof summary]}</p>
            <p className="text-xs font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter & Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <select className="input w-auto" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          {classes.map(c => <option key={c}>{c}</option>)}
        </select>
        <span className="text-slate-300">|</span>
        <span className="text-sm text-slate-500 font-medium">Tandai semua:</span>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => markAll(s)}
            className={clsx('badge cursor-pointer hover:opacity-80 py-1.5 px-3 text-xs', getStatusColor(s))}
          >
            {getStatusLabel(s)}
          </button>
        ))}
      </div>

      {/* Attendance Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Memuat data siswa...</div>
        ) : students.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Tambahkan siswa terlebih dahulu di menu Data Siswa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header w-10">No</th>
                  <th className="table-header">Nama Siswa</th>
                  <th className="table-header">Kelas</th>
                  <th className="table-header">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s, i) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell text-slate-400">{i + 1}</td>
                    <td className="table-cell font-medium text-slate-900">{s.name}</td>
                    <td className="table-cell">
                      <span className="badge bg-emerald-50 text-emerald-700">{s.class_name}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-2 flex-wrap">
                        {STATUSES.map(status => (
                          <button
                            key={status}
                            onClick={() => setStatus(s.id, status)}
                            className={clsx(
                              'px-3 py-1 rounded-lg text-xs font-medium border transition-all',
                              attendance[s.id] === status
                                ? `${getStatusColor(status)} border-transparent ring-2 ring-offset-1 ${
                                    status === 'hadir' ? 'ring-emerald-400' :
                                    status === 'sakit' ? 'ring-blue-400' :
                                    status === 'izin'  ? 'ring-amber-400' : 'ring-red-400'
                                  }`
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            )}
                          >
                            {getStatusLabel(status)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
              {filtered.length} siswa ditampilkan
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
