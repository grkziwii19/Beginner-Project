'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type AttendanceStatus, getStatusColor, getStatusLabel } from '@/types'
import { CheckCircle, AlertCircle, Save, Users, CheckCheck } from 'lucide-react'
import clsx from 'clsx'

interface StudentRow { id: string; name: string }

const STATUSES: AttendanceStatus[] = ['hadir', 'sakit', 'izin', 'alpha']
const UMUM_VALUE = '__umum__'

interface Props {
  className: string
  subject: string
  date: string
}

export default function AbsensiTab({ className, subject, date }: Props) {
  const [supabase] = useState(() => createClient())
  const [students, setStudents] = useState<StudentRow[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Sesi tidak valid.'); return }

        const subjectQuery = subject || UMUM_VALUE
        const [{ data: studentsData, error: studentsError }, { data: attData }] = await Promise.all([
          supabase.from('students').select('id, name')
            .eq('user_id', user.id).eq('class_name', className).order('name'),
          supabase.from('attendance').select('student_id, status')
            .eq('user_id', user.id).eq('date', date).eq('subject', subjectQuery),
        ])

        if (studentsError) throw studentsError
        setStudents(studentsData ?? [])

        const map: Record<string, AttendanceStatus> = {}
        const ids = new Set((studentsData ?? []).map(s => s.id))
        attData?.forEach(a => { if (ids.has(a.student_id)) map[a.student_id] = a.status })
        setAttendance(map)
      } catch (err) {
        console.error(err)
        setError('Gagal memuat data absensi.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [className, subject, date])

  const setStatus = (id: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [id]: status }))
    setSaved(false)
  }

  const markAllHadir = () => {
    const map: Record<string, AttendanceStatus> = {}
    students.forEach(s => { map[s.id] = 'hadir' })
    setAttendance(prev => ({ ...prev, ...map }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Sesi tidak valid.'); return }

      const records = Object.entries(attendance).map(([student_id, status]) => ({
        user_id: user.id, student_id, date, status,
        subject: subject || UMUM_VALUE,
      }))

      const { error: saveError } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,date,subject' })
      if (saveError) throw saveError

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err)
      setError('Gagal menyimpan absensi. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const filledCount = students.filter(s => attendance[s.id]).length
  const summary = {
    hadir: students.filter(s => attendance[s.id] === 'hadir').length,
    sakit: students.filter(s => attendance[s.id] === 'sakit').length,
    izin: students.filter(s => attendance[s.id] === 'izin').length,
    alpha: students.filter(s => attendance[s.id] === 'alpha').length,
    belum: students.filter(s => !attendance[s.id]).length,
  }

  if (loading) return <div className="card p-10 text-center text-slate-400 text-sm">Memuat data absensi...</div>

  if (students.length === 0) return (
    <div className="card p-10 text-center">
      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p className="text-slate-500 text-sm">Belum ada siswa di kelas ini.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-5 gap-2">
        {[
          { key: 'hadir', label: 'Hadir', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { key: 'sakit', label: 'Sakit', color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { key: 'izin', label: 'Izin', color: 'bg-amber-50 text-amber-700 border-amber-100' },
          { key: 'alpha', label: 'Alpha', color: 'bg-red-50 text-red-700 border-red-100' },
          { key: 'belum', label: 'Belum', color: 'bg-slate-100 text-slate-500 border-slate-200' },
        ].map(({ key, label, color }) => (
          <div key={key} className={`rounded-xl p-2.5 text-center border ${color}`}>
            <p className="text-xl font-bold">{summary[key as keyof typeof summary]}</p>
            <p className="text-xs font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={markAllHadir} className="btn-secondary text-sm">
          <CheckCheck className="w-4 h-4" /> Tandai Hadir Semua
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{filledCount}/{students.length} terisi</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className={clsx('btn-primary text-sm', saved && 'bg-emerald-600 hover:bg-emerald-700')}
          >
            {saved
              ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</>
              : <><Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Absensi'}</>}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header w-10">No</th>
                <th className="table-header">Nama Siswa</th>
                <th className="table-header">Status Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="table-cell text-slate-400">{i + 1}</td>
                  <td className="table-cell font-medium text-slate-900">{s.name}</td>
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
                                  status === 'hadir' ? 'ring-emerald-400'
                                  : status === 'sakit' ? 'ring-blue-400'
                                  : status === 'izin' ? 'ring-amber-400'
                                  : 'ring-red-400'}`
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
        </div>
      </div>
    </div>
  )
}
