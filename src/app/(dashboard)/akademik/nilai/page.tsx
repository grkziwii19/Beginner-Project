'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type ClassItem, type Student } from '@/types'
import { ChevronDown, Save, CheckCircle2, Loader2 } from 'lucide-react'

interface NilaiRow {
  studentId: string
  studentName: string
  nis: string
  scores: Record<string, string> // mapel -> nilai (string agar bisa kosong)
}

const SEMESTER_OPTIONS = [
  { value: '1', label: 'I (Ganjil)' },
  { value: '2', label: 'II (Genap)' },
]

function getAcademicYear() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

export default function NilaiSemesterPage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [semester, setSemester] = useState('1')
  const [academicYear, setAcademicYear] = useState(getAcademicYear())
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState('')

  const [rows, setRows] = useState<NilaiRow[]>([])
  const [subjects, setSubjects] = useState<string[]>([])

  const selectedClass = classes.find(c => c.id === selectedClassId) ?? null

  // ── Load daftar kelas ──
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

  // ── Load siswa + nilai saat kelas/semester/tahun berubah ──
  const loadData = useCallback(async () => {
    if (!selectedClass) { setRows([]); setSubjects([]); return }
    setLoadingData(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Tentukan mapel dari kelas
    const mapelList: string[] = selectedClass.is_homeroom_only
      ? [] // wali kelas semua — mapel diisi manual
      : (selectedClass.subjects ?? [])

    // Ambil siswa
    const { data: students } = await supabase
      .from('students')
      .select('id, name, nis')
      .eq('user_id', user.id)
      .eq('class_name', selectedClass.name)
      .order('name')

    // Ambil nilai yang sudah ada
    const { data: existingGrades } = await supabase
      .from('semester_grades')
      .select('student_id, subject, score')
      .eq('user_id', user.id)
      .eq('class_name', selectedClass.name)
      .eq('semester', semester)
      .eq('academic_year', academicYear)

    // Build map nilai: studentId -> mapel -> score
    const gradeMap: Record<string, Record<string, string>> = {}
    for (const g of existingGrades ?? []) {
      if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {}
      gradeMap[g.student_id][g.subject] = String(g.score ?? '')
    }

    const newRows: NilaiRow[] = (students ?? []).map(s => ({
      studentId: s.id,
      studentName: s.name,
      nis: s.nis,
      scores: Object.fromEntries(mapelList.map(m => [m, gradeMap[s.id]?.[m] ?? ''])),
    }))

    setSubjects(mapelList)
    setRows(newRows)
    setLoadingData(false)
  }, [selectedClass, semester, academicYear])

  useEffect(() => { loadData() }, [loadData])

  // ── Update nilai di state ──
  const updateScore = (studentId: string, mapel: string, val: string) => {
    // hanya angka 0-100
    if (val !== '' && (isNaN(Number(val)) || Number(val) < 0 || Number(val) > 100)) return
    setRows(prev => prev.map(r =>
      r.studentId === studentId ? { ...r, scores: { ...r.scores, [mapel]: val } } : r
    ))
  }

  // ── Simpan semua nilai ──
  const handleSave = async () => {
    if (!selectedClass) return
    setSaving(true)
    setSavedOk(false)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const upsertData = []
    for (const row of rows) {
      for (const mapel of subjects) {
        const val = row.scores[mapel]
        if (val === '' || val === undefined) continue
        upsertData.push({
          user_id: user.id,
          student_id: row.studentId,
          class_name: selectedClass.name,
          subject: mapel,
          semester,
          academic_year: academicYear,
          score: Number(val),
          updated_at: new Date().toISOString(),
        })
      }
    }

    if (upsertData.length > 0) {
      const { error: err } = await supabase
        .from('semester_grades')
        .upsert(upsertData, { onConflict: 'student_id,subject,semester,academic_year' })

      if (err) {
        setError('Gagal menyimpan nilai: ' + err.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 3000)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nilai Semester</h1>
        <p className="text-sm text-slate-500 mt-0.5">Input nilai akhir per mata pelajaran per siswa.</p>
      </div>

      {/* ── Filter ── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Kelas */}
          <div className="flex-1 min-w-[160px]">
            <label className="label text-xs mb-1">Kelas</label>
            <div className="relative">
              <select
                className="input appearance-none pr-9 text-sm py-1.5"
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                disabled={loadingClasses}
              >
                <option value="">-- Pilih --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Semester */}
          <div className="w-36">
            <label className="label text-xs mb-1">Semester</label>
            <div className="relative">
              <select
                className="input appearance-none pr-9 text-sm py-1.5"
                value={semester}
                onChange={e => setSemester(e.target.value)}
              >
                {SEMESTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Tahun Pelajaran */}
          <div className="w-36">
            <label className="label text-xs mb-1">Tahun Pelajaran</label>
            <input
              className="input text-sm py-1.5"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="2024/2025"
            />
          </div>

          {/* Tombol Simpan */}
          {rows.length > 0 && subjects.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary py-1.5 text-sm shrink-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Menyimpan...' : 'Simpan Nilai'}
            </button>
          )}

          {savedOk && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Tersimpan
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* ── Tabel nilai ── */}
      {!selectedClassId && (
        <div className="card p-10 text-center text-slate-400 text-sm">Pilih kelas untuk mulai input nilai.</div>
      )}

      {selectedClassId && loadingData && (
        <div className="card p-10 text-center text-slate-400 text-sm">Memuat data...</div>
      )}

      {selectedClassId && !loadingData && subjects.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-slate-500 text-sm">Kelas ini belum memiliki mata pelajaran.</p>
          <p className="text-xs text-slate-400 mt-1">Tambahkan mata pelajaran di menu Data Siswa → Edit Kelas.</p>
        </div>
      )}

      {selectedClassId && !loadingData && rows.length === 0 && subjects.length > 0 && (
        <div className="card p-6 text-center text-slate-400 text-sm">Belum ada siswa di kelas ini.</div>
      )}

      {rows.length > 0 && subjects.length > 0 && !loadingData && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header w-8 text-center">No</th>
                  <th className="table-header min-w-[160px]">Nama Siswa</th>
                  <th className="table-header w-24">NIS</th>
                  {subjects.map(m => (
                    <th key={m} className="table-header min-w-[80px] text-center">
                      <span className="block leading-tight text-[11px]">{m}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell text-center text-slate-400">{i + 1}</td>
                    <td className="table-cell font-medium text-slate-900">{row.studentName}</td>
                    <td className="table-cell text-slate-500">{row.nis}</td>
                    {subjects.map(m => (
                      <td key={m} className="table-cell p-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-full text-center border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                          value={row.scores[m] ?? ''}
                          onChange={e => updateScore(row.studentId, m, e.target.value)}
                          placeholder="–"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer info */}
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">{rows.length} siswa · {subjects.length} mata pelajaran · Nilai 0–100</p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
