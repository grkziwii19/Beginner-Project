'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, BarChart2, ClipboardCheck } from 'lucide-react'
import RekapNilai from '@/components/laporan/RekapNilai'
import RekapAbsensi from '@/components/laporan/RekapAbsensi'

type TabType = 'nilai' | 'absensi'

interface ClassOption {
  id: string
  name: string
  subjects: string[] | null
  is_homeroom_only: boolean
}

const SEMESTER_OPTIONS = [
  { value: '1', label: 'I (Ganjil)' },
  { value: '2', label: 'II (Genap)' },
]

function getAcademicYear() {
  const y = new Date().getFullYear()
  return new Date().getMonth() + 1 >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

export default function LaporanPage() {
  const [supabase] = useState(() => createClient())
  const [activeTab, setActiveTab] = useState<TabType>('nilai')

  // Filter global — satu state, tidak ter-reset saat pindah tab
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [semester, setSemester] = useState('1')
  const [academicYear, setAcademicYear] = useState(getAcademicYear())

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('classes')
        .select('id, name, subjects, is_homeroom_only')
        .eq('user_id', user.id)
        .order('name')
      setClasses(data ?? [])
    }
    load()
  }, [])

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const subjectOptions = selectedClass?.is_homeroom_only
    ? []
    : (selectedClass?.subjects ?? [])

  const className = selectedClass?.name ?? ''

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Rekap nilai dan absensi siswa.</p>

      {/* Filter Global */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600 shrink-0">Kelas</label>
            <div className="relative">
              <select
                className="input appearance-none pr-9 text-sm"
                value={selectedClassId}
                onChange={e => { setSelectedClassId(e.target.value); setSelectedSubject('') }}
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {selectedClass && !selectedClass.is_homeroom_only && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600 shrink-0">Mapel</label>
              <div className="relative">
                <select
                  className="input appearance-none pr-9 text-sm"
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                >
                  <option value="">-- Semua --</option>
                  {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600 shrink-0">Semester</label>
            <div className="relative">
              <select
                className="input appearance-none pr-9 text-sm"
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
              className="input w-28 text-sm"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="2024/2025"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        {[
          { id: 'nilai', label: 'Rekap Nilai', icon: BarChart2 },
          { id: 'absensi', label: 'Rekap Absensi', icon: ClipboardCheck },
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

      {!selectedClassId ? (
        <div className="card p-10 text-center text-slate-400 text-sm">
          Pilih kelas untuk melihat rekap.
        </div>
      ) : (
        <>
          {activeTab === 'nilai' && (
            <RekapNilai
              className={className}
              subject={selectedSubject}
              semester={semester}
              academicYear={academicYear}
            />
          )}
          {activeTab === 'absensi' && (
            <RekapAbsensi
              className={className}
              subject={selectedSubject}
              semester={semester}
              academicYear={academicYear}
            />
          )}
        </>
      )}
    </div>
  )
}
