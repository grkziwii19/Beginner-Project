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

export default function MengajarPage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState<TabType>('absensi')

  const [isSemesterMode, setIsSemesterMode] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const selectedClass = classes.find(c => c.id === selectedClassId) ?? null

  // Daftar mapel yang tersedia untuk kelas terpilih
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

  // Reset pilihan mapel saat ganti kelas
  useEffect(() => {
    setSelectedSubject('')
    setIsSemesterMode(false)
  }, [selectedClassId])

  const handleToggleSemester = (checked: boolean) => {
    if (checked) {
      setShowConfirmModal(true)
    } else {
      setIsSemesterMode(false)
    }
  }

  const confirmSemesterMode = () => {
    setIsSemesterMode(true)
    setShowConfirmModal(false)
  }

  const readyToShowTabs = selectedClass && selectedSubject

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Absensi, nilai, dan catatan dalam satu tempat.</p>

      {/* Pilih Kelas + Mapel */}
      <div className="card p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
          {/* Kelas */}
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

          {/* Mapel */}
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
                    <option key={s} value={s}>{s === UMUM_VALUE ? 'Semua Mapel (Wali Kelas)' : s}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Tanggal + Checkbox Nilai Semester */}
        {readyToShowTabs && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-3 flex-1">
              <label className="text-sm font-medium text-slate-600 shrink-0 w-16 sm:w-auto">Tanggal</label>
              <input
                type="date"
                className="input flex-1 sm:max-w-xs"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer flex-1">
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

      {/* Belum pilih kelas/mapel */}
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
                  activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'absensi' && (
            <AbsensiTab className={selectedClass!.name} subject={selectedSubject} date={date} />
          )}

          {activeTab === 'nilai' && (
            <NilaiTab
              className={selectedClass!.name}
              subject={selectedSubject === UMUM_VALUE ? 'Umum' : selectedSubject}
              isSemesterMode={isSemesterMode}
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

      {/* Modal konfirmasi nilai semester */}
      {showConfirmModal && (
        <ConfirmSemesterModal
          onConfirm={confirmSemesterMode}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  )
}