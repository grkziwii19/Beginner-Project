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
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* BARIS UTAMA TINDAKAN & RINGKASAN DATA (Sejajar dan Compact) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
        
        {/* Sisi Kiri: Tindakan & Progress Pengisian */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={markAllHadir} 
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Tandai Hadir Semua
          </button>
          <span className="text-xs text-slate-500 font-bold border-l border-slate-200 pl-3">
            {filledCount}/{students.length} Terisi
          </span>
        </div>

        {/* Bagian Tengah: Jumlah H, S, I, A, B Berukuran Kecil & Rapi */}
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            H: <span className="font-extrabold">{summary.hadir}</span>
          </span>
          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
            S: <span className="font-extrabold">{summary.sakit}</span>
          </span>
          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
            I: <span className="font-extrabold">{summary.izin}</span>
          </span>
          <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
            A: <span className="font-extrabold">{summary.alpha}</span>
          </span>
          <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            B: <span className="font-extrabold">{summary.belum}</span>
          </span>
        </div>

        {/* Sisi Kanan: Tombol Simpan Absensi */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={clsx(
            'btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm',
            saved && 'bg-emerald-600 hover:bg-emerald-700'
          )}
        >
          {saved ? (
            <><CheckCircle className="w-3.5 h-3.5" /> Tersimpan!</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Simpan Absensi'}</>
          )}
        </button>
      </div>

      {/* TABEL DATA SISWA (Padding baris dipadatkan py-1.5 agar ramping) */}
      <div className="card overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 w-12 text-center">No</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">Nama Siswa</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 w-72">Status Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {students.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-1.5 text-xs text-slate-500 font-medium text-center">{i + 1}</td>
                  <td className="px-3 py-1.5 text-xs font-semibold text-slate-900">{s.name}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUSES.map(status => (
                        <button
                          key={status}
                          onClick={() => setStatus(s.id, status)}
                          className={clsx(
                            'px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all',
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