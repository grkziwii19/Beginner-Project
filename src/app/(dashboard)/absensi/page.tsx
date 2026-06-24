'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type AttendanceStatus, getStatusColor, getStatusLabel } from '@/types'
import {
  ChevronLeft, ChevronRight, BookOpen, Search, Users,
  Save, CheckCircle, AlertCircle, ArrowLeft
} from 'lucide-react'
import clsx from 'clsx'

interface ClassOption {
  id: string
  name: string
  studentCount: number
}

interface StudentRow {
  id: string
  name: string
}

const STATUSES: AttendanceStatus[] = ['hadir', 'sakit', 'izin', 'alpha']

export default function AbsensiPage() {
  const supabase = createClient()

  const [step, setStep] = useState<'pilih-kelas' | 'absen'>('pilih-kelas')
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [errorClasses, setErrorClasses] = useState('')
  const [search, setSearch] = useState('')

  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [errorStudents, setErrorStudents] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // --- Load daftar kelas ---
  useEffect(() => {
    let cancelled = false
    const fetchClasses = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) { if (!cancelled) setErrorClasses('Sesi tidak valid. Silakan login ulang.'); return }

        const [{ data: classData, error: classError }, { data: studentsData }] = await Promise.all([
          supabase.from('classes').select('id, name').eq('user_id', user.id).order('name'),
          supabase.from('students').select('id, class_name').eq('user_id', user.id),
        ])

        if (classError) throw classError

        const counts: Record<string, number> = {}
        studentsData?.forEach(s => { counts[s.class_name] = (counts[s.class_name] ?? 0) + 1 })

        if (!cancelled) {
          setClasses((classData ?? []).map(c => ({ id: c.id, name: c.name, studentCount: counts[c.name] ?? 0 })))
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) setErrorClasses('Gagal memuat daftar kelas.')
      } finally {
        if (!cancelled) setLoadingClasses(false)
      }
    }
    fetchClasses()
    return () => { cancelled = true }
  }, [])

  // --- Load siswa + absensi saat kelas/tanggal dipilih ---
  const loadStudentsAndAttendance = async (cls: ClassOption, selectedDate: string) => {
    setLoadingStudents(true)
    setErrorStudents('')
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { setErrorStudents('Sesi tidak valid.'); return }

      const [{ data: studentsData, error: studentsError }, { data: attData }] = await Promise.all([
        supabase.from('students').select('id, name').eq('user_id', user.id).eq('class_name', cls.name).order('name'),
        supabase.from('attendance').select('student_id, status').eq('user_id', user.id).eq('date', selectedDate),
      ])

      if (studentsError) throw studentsError

      setStudents(studentsData ?? [])

      const map: Record<string, AttendanceStatus> = {}
      const studentIds = new Set((studentsData ?? []).map(s => s.id))
      attData?.forEach(a => { if (studentIds.has(a.student_id)) map[a.student_id] = a.status })
      setAttendance(map)
    } catch (err) {
      console.error(err)
      setErrorStudents('Gagal memuat data siswa atau absensi.')
    } finally {
      setLoadingStudents(false)
    }
  }

  const selectClass = (cls: ClassOption) => {
    setSelectedClass(cls)
    setStep('absen')
    loadStudentsAndAttendance(cls, date)
  }

  const changeDate = (delta: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    const newDate = d.toISOString().split('T')[0]
    setDate(newDate)
    if (selectedClass) loadStudentsAndAttendance(selectedClass, newDate)
  }

  const handleDateInput = (newDate: string) => {
    setDate(newDate)
    if (selectedClass) loadStudentsAndAttendance(selectedClass, newDate)
  }

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }))
    setSaved(false)
  }

  const markAll = (status: AttendanceStatus) => {
    const map: Record<string, AttendanceStatus> = {}
    students.forEach(s => { map[s.id] = status })
    setAttendance(prev => ({ ...prev, ...map }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setErrorStudents('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setErrorStudents('Sesi tidak valid.'); return }

      const records = Object.entries(attendance).map(([student_id, status]) => ({
        user_id: user.id, student_id, date, status,
      }))

      const { error: saveError } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id,date' })
      if (saveError) throw saveError

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err)
      setErrorStudents('Gagal menyimpan absensi. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const backToClassSelect = () => {
    setStep('pilih-kelas')
    setSelectedClass(null)
    setStudents([])
    setAttendance({})
    setErrorStudents('')
  }

  const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  const filledCount = students.filter(s => attendance[s.id]).length
  const dateLabel = new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const summary = {
    hadir: students.filter(s => attendance[s.id] === 'hadir').length,
    sakit: students.filter(s => attendance[s.id] === 'sakit').length,
    izin: students.filter(s => attendance[s.id] === 'izin').length,
    alpha: students.filter(s => attendance[s.id] === 'alpha').length,
    belum: students.filter(s => !attendance[s.id]).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Absensi</h1>
        <p className="text-sm text-slate-500 mt-0.5">Input kehadiran siswa secara cepat.</p>
      </div>

      {/* STEP 1: Pilih Kelas */}
      {step === 'pilih-kelas' && (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Cari kelas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loadingClasses ? (
            <div className="card p-10 text-center text-slate-400 text-sm">Memuat daftar kelas...</div>
          ) : errorClasses ? (
            <div className="card p-8 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600">{errorClasses}</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="card p-12 text-center">
              <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700">{classes.length === 0 ? 'Belum ada kelas' : 'Tidak ada kelas yang cocok'}</h3>
              <p className="text-sm text-slate-400 mt-1">{classes.length === 0 ? 'Buat kelas terlebih dahulu di menu Kelas.' : 'Coba kata kunci lain.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map(c => (
                <button
                  key={c.id}
                  onClick={() => selectClass(c)}
                  className="card p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-md transition-all text-left"
                >
                  <div className="w-11 h-11 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.studentCount} siswa</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* STEP 2: Absen Siswa */}
      {step === 'absen' && selectedClass && (
        <div className="space-y-5">
          <button onClick={backToClassSelect} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Pilih kelas lain
          </button>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">{selectedClass.name}</h2>
                <p className="text-xs text-slate-400">{students.length} siswa</p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || students.length === 0}
              className={clsx('btn-primary', saved && 'bg-emerald-600 hover:bg-emerald-700')}
            >
              {saved ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</> : <><Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Absensi'}</>}
            </button>
          </div>

          {/* Date navigation */}
          <div className="card p-3 flex items-center gap-3 max-w-sm">
            <button onClick={() => changeDate(-1)} className="btn-secondary px-2.5 py-1.5">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <input
                type="date"
                value={date}
                onChange={e => handleDateInput(e.target.value)}
                className="input text-center font-medium w-auto py-1.5"
              />
              <p className="text-xs text-slate-400 mt-1 capitalize">{dateLabel}</p>
            </div>
            <button onClick={() => changeDate(1)} className="btn-secondary px-2.5 py-1.5">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {errorStudents && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errorStudents}
            </div>
          )}

          {loadingStudents ? (
            <div className="card p-10 text-center text-slate-400 text-sm">Memuat data siswa...</div>
          ) : students.length === 0 ? (
            <div className="card p-12 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700">Belum ada siswa di kelas ini</h3>
              <p className="text-sm text-slate-400 mt-1">Tambahkan siswa lewat menu Kelas terlebih dahulu.</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { key: 'hadir', label: 'Hadir', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                  { key: 'sakit', label: 'Sakit', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                  { key: 'izin', label: 'Izin', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                  { key: 'alpha', label: 'Alpha', color: 'bg-red-50 text-red-700 border-red-100' },
                  { key: 'belum', label: 'Belum', color: 'bg-slate-100 text-slate-500 border-slate-200' },
                ].map(({ key, label, color }) => (
                  <div key={key} className={`rounded-xl p-3 text-center border ${color}`}>
                    <p className="text-2xl font-bold">{summary[key as keyof typeof summary]}</p>
                    <p className="text-xs font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Mark all */}
              <div className="flex flex-wrap items-center gap-3">
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
                <span className="text-xs text-slate-400 ml-auto">{filledCount}/{students.length} terisi</span>
              </div>

              {/* Student list */}
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
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
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
                                          status === 'hadir' ? 'ring-emerald-400' : status === 'sakit' ? 'ring-blue-400' :
                                          status === 'izin' ? 'ring-amber-400' : 'ring-red-400'
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
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
