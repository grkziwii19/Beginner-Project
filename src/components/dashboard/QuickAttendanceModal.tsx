'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type AttendanceStatus, getStatusColor, getStatusLabel } from '@/types'
import { X, ChevronLeft, BookOpen, Save, CheckCircle, Search, Users } from 'lucide-react'
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

export default function QuickAttendanceModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const [step, setStep] = useState<'pilih-kelas' | 'absen'>('pilih-kelas')
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [search, setSearch] = useState('')

  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  useEffect(() => {
    const fetchClasses = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: classData }, { data: studentsData }] = await Promise.all([
        supabase.from('classes').select('id, name').eq('user_id', user.id).order('name'),
        supabase.from('students').select('id, class_name').eq('user_id', user.id),
      ])

      const counts: Record<string, number> = {}
      studentsData?.forEach(s => { counts[s.class_name] = (counts[s.class_name] ?? 0) + 1 })

      setClasses((classData ?? []).map(c => ({
        id: c.id, name: c.name, studentCount: counts[c.name] ?? 0,
      })))
      setLoadingClasses(false)
    }
    fetchClasses()
  }, [])

  const selectClass = async (cls: ClassOption) => {
    setSelectedClass(cls)
    setStep('absen')
    setLoadingStudents(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: studentsData }, { data: attData }] = await Promise.all([
      supabase.from('students').select('id, name').eq('user_id', user.id).eq('class_name', cls.name).order('name'),
      supabase.from('attendance').select('student_id, status').eq('date', today),
    ])

    setStudents(studentsData ?? [])

    const map: Record<string, AttendanceStatus> = {}
    const studentIds = new Set((studentsData ?? []).map(s => s.id))
    attData?.forEach(a => { if (studentIds.has(a.student_id)) map[a.student_id] = a.status })
    setAttendance(map)

    setLoadingStudents(false)
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const records = Object.entries(attendance).map(([student_id, status]) => ({
      user_id: user.id, student_id, date: today, status,
    }))

    await supabase.from('attendance').upsert(records, { onConflict: 'student_id,date' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => {
      onClose()
    }, 1200)
  }

  const backToClassSelect = () => {
    setStep('pilih-kelas')
    setSelectedClass(null)
    setStudents([])
    setAttendance({})
  }

  const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  const filledCount = students.filter(s => attendance[s.id]).length

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            {step === 'absen' && (
              <button onClick={backToClassSelect} className="p-1 text-slate-400 hover:text-slate-600 -ml-1">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="font-semibold text-slate-900">
                {step === 'pilih-kelas' ? 'Absensi Cepat' : selectedClass?.name}
              </h2>
              <p className="text-xs text-slate-400">{todayLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Pilih Kelas */}
        {step === 'pilih-kelas' && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Cari kelas..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {loadingClasses ? (
              <div className="text-center py-10 text-sm text-slate-400">Memuat kelas...</div>
            ) : filteredClasses.length === 0 ? (
              <div className="text-center py-10">
                <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Belum ada kelas. Buat kelas dulu di menu Kelas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredClasses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectClass(c)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.studentCount} siswa</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Absen Siswa */}
        {step === 'absen' && (
          <>
            <div className="px-5 pt-4 pb-2 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">Tandai semua:</span>
                <span className="text-xs text-slate-400">{filledCount}/{students.length} terisi</span>
              </div>
              <div className="flex gap-2 flex-wrap">
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
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2">
              {loadingStudents ? (
                <div className="text-center py-10 text-sm text-slate-400">Memuat siswa...</div>
              ) : students.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Belum ada siswa di kelas ini.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {students.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-400 w-5 shrink-0">{i + 1}</span>
                      <span className="flex-1 text-sm font-medium text-slate-800 truncate">{s.name}</span>
                      <div className="flex gap-1.5 shrink-0">
                        {STATUSES.map(status => (
                          <button
                            key={status}
                            onClick={() => setStatus(s.id, status)}
                            className={clsx(
                              'w-8 h-8 rounded-lg text-xs font-bold border transition-all flex items-center justify-center',
                              attendance[s.id] === status
                                ? `${getStatusColor(status)} border-transparent ring-2 ring-offset-1 ${
                                    status === 'hadir' ? 'ring-emerald-400' : status === 'sakit' ? 'ring-blue-400' :
                                    status === 'izin' ? 'ring-amber-400' : 'ring-red-400'
                                  }`
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            )}
                            title={getStatusLabel(status)}
                          >
                            {getStatusLabel(status)[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 shrink-0">
              <button
                onClick={handleSave}
                disabled={saving || students.length === 0}
                className={clsx('btn-primary w-full justify-center', saved && 'bg-emerald-600 hover:bg-emerald-700')}
              >
                {saved
                  ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</>
                  : <><Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Absensi'}</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
