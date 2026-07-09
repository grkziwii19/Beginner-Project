'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type ClassItem } from '@/types'
import AbsensiTab from '@/components/mengajar/AbsensiTab'
import NilaiTab from '@/components/mengajar/NilaiTab'
import CatatanTab from '@/components/mengajar/CatatanTab'
import ConfirmSemesterModal from '@/components/mengajar/ConfirmSemesterModal'
import { ChevronDown, ClipboardCheck, Award, NotebookPen, GraduationCap } from 'lucide-react'

type TabType = 'absensi' | 'nilai' | 'catatan'

const UMUM_VALUE = '__umum__'

const SEMESTER_OPTIONS = [
  { value: '1', label: 'I (Ganjil)' },
  { value: '2', label: 'II (Genap)' },
]

function getAcademicYear() {
  const y = new Date().getFullYear()
  return new Date().getMonth() + 1 >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

export default function MengajarPage() {
  const [supabase] = useState(() => createClient())

  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [semester, setSemester] = useState('1')
  const [academicYear, setAcademicYear] = useState(getAcademicYear())
  const [activeTab, setActiveTab] = useState<TabType>('absensi')

  const [isSemesterMode, setIsSemesterMode] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const selectedClass = classes.find(c => c.id === selectedClassId) ?? null

  const subjectOptions = selectedClass?.is_homeroom_only
    ? [UMUM_VALUE]
    : (selectedClass?.subjects ?? [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('classes').select('*').eq('user_id', user.id).order('name')
      setClasses(data ?? [])
      setLoadingClasses(false)
    }
    load()
  }, [])

  useEffect(() => {
    setSelectedSubject('')
    setIsSemesterMode(false)
  }, [selectedClassId])

  const handleToggleSemester = (checked: boolean) => {
    if (checked) setShowConfirmModal(true)
    else setIsSemesterMode(false)
  }

  const readyToShowTabs = selectedClass && selectedSubject

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Absensi, nilai, dan catatan dalam satu tempat.</p>

      {/* Pilih Kelas + Mapel + Tanggal */}
      <div className="card p-4 sm:p-5 space-y-3">
        {/* Baris 1: Kelas + Mapel */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600 shrink-0">Kelas</label>
            <div className="relative flex-1 sm:max-w-xs">
              <select
                className="input appearance-none pr-9"
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                disabled={loadingClasses}
              >
                <option value="">-- Pilih kelas --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {selectedClass && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600 shrink-0">Mapel</label>
              <div className="relative flex-1 sm:max-w-xs">
                <select
                  className="input appearance-none pr-9"
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                >
                  <option value="">-- Pilih mapel --</option>
                  {subjectOptions.map(s => (
                    <option key={s} value={s}>
                      {s === UMUM_VALUE ? 'Semua Mapel (Wali Kelas)' : s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Baris 2: Tanggal + Semester + Tahun Ajaran + Checkbox Nilai Semester */}
        {readyToShowTabs && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600 shrink-0">Tanggal</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600 shrink-0">Semester</label>
              <div className="relative">
                <select
                  className="input appearance-none pr-9"
                  value={semester}
                  onChange={e => setSemester(e.target.value)}
                >
                  {SEMESTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600 shrink-0">Tahun Pelajaran</label>
              <input
                type="text"
                className="input w-32"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="2024/2025"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer ml-auto">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={isSemesterMode}
                onChange={e => handleToggleSemester(e.target.checked)}
              />
              <span className="text-sm font-medium text-slate-600">Nilai Semester</span>
            </label>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!readyToShowTabs && !loadingClasses && (
        <div className="card p-10 text-center">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700">Pilih kelas dan mata pelajaran</h3>
          <p className="text-sm text-slate-400 mt-1">Pilih kelas dan mapel di atas untuk mulai mengajar.</p>
        </div>
      )}

      {/* Tabs */}
      {readyToShowTabs && (
        <>
          <div className="flex gap-6 border-b border-slate-200">
            {[
              { id: 'absensi', label: 'Absensi', icon: ClipboardCheck },
              { id: 'nilai', label: 'Nilai', icon: Award },
              { id: 'catatan', label: 'Catatan', icon: NotebookPen },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as TabType)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'absensi' && (
            <AbsensiTab
              className={selectedClass!.name}
              subject={selectedSubject}
              date={date}
            />
          )}

          {activeTab === 'nilai' && (
            <NilaiTab
              className={selectedClass!.name}
              subject={selectedSubject === UMUM_VALUE ? 'Umum' : selectedSubject}
              date={date}
              semester={semester}
              academicYear={academicYear}
            />
          )}

          {activeTab === 'catatan' && (
            <CatatanTab
              className={selectedClass!.name}
              subject={selectedSubject === UMUM_VALUE ? 'Umum' : selectedSubject}
            />
          )}
        </>
      )}

      {showConfirmModal && (
        <ConfirmSemesterModal
          onConfirm={() => { setIsSemesterMode(true); setShowConfirmModal(false) }}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  )
}
