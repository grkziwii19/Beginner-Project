'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, BarChart2, ClipboardCheck, Filter, FileText } from 'lucide-react'
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 animate-fade-in">
      {/* HEADER BAR */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Laporan Pembelajaran</h1>
        <p className="text-sm text-slate-500 mt-1">Pantau dan rekap seluruh nilai serta data absensi murid Anda.</p>
      </div>

      {/* FILTER GLOBAL PANEL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
          <Filter className="w-4 h-4 text-slate-450" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Filter Data Rekapitulasi</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filter: Kelas */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">Kelas</label>
            <div className="relative">
              <select
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-4 pr-10 text-sm py-2.5 font-semibold text-slate-800 appearance-none cursor-pointer h-11"
                value={selectedClassId}
                onChange={e => { setSelectedClassId(e.target.value); setSelectedSubject('') }}
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Filter: Mapel */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">Mata Pelajaran</label>
            <div className="relative">
              <select
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-4 pr-10 text-sm py-2.5 font-semibold text-slate-800 appearance-none cursor-pointer h-11 disabled:opacity-55 disabled:bg-slate-50"
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                disabled={!selectedClass || selectedClass.is_homeroom_only}
              >
                <option value="">{selectedClass?.is_homeroom_only ? 'Semua Mapel (Wali Kelas)' : '-- Semua Mapel --'}</option>
                {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Filter: Semester */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">Semester</label>
            <div className="relative">
              <select
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-4 pr-10 text-sm py-2.5 font-semibold text-slate-800 appearance-none cursor-pointer h-11"
                value={semester}
                onChange={e => setSemester(e.target.value)}
              >
                {SEMESTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Filter: Tahun Pelajaran */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">Tahun Pelajaran</label>
            <input
              type="text"
              className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl px-4 text-sm py-2.5 font-semibold text-slate-800 h-11 outline-none"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="e.g. 2024/2025"
            />
          </div>
        </div>
      </div>

      {/* SEGMENTED TABS CONTROLLERS */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'nilai', label: 'Rekap Nilai Siswa', icon: BarChart2 },
          { id: 'absensi', label: 'Rekap Absensi Siswa', icon: ClipboardCheck },
        ].map(t => {
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={`flex items-center gap-2 pb-3.5 px-3 text-sm font-bold border-b-2 transition-all duration-150 ${
                isActive
                  ? 'border-indigo-650 text-indigo-650'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <t.icon className={`w-4 h-4 ${isActive ? 'text-indigo-650' : 'text-slate-450'}`} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* RENDER CONTENT SECTION */}
      {!selectedClassId ? (
        <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-slate-50/50 border border-slate-200 border-dashed rounded-2xl shadow-inner max-w-xl mx-auto mt-6">
          <div className="p-4 bg-white border border-slate-100 text-slate-400 rounded-2xl mb-4 shadow-sm">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-850 text-base">Laporan Siap Ditampilkan</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
            Silakan pilih kelas terlebih dahulu pada menu dropdown filter di atas untuk menampilkan seluruh laporan dan statistik murid Anda.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mt-4">
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
        </div>
      )}
    </div>
  )
}