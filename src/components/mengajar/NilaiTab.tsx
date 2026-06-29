'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, CheckCircle2, Pencil, X } from 'lucide-react'

interface StudentRow {
  studentId: string
  studentName: string
  nis: string
  score: string
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

interface Props {
  className: string
  subject: string
  isSemesterMode: boolean
}

export default function NilaiTab({ className, subject, isSemesterMode }: Props) {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<StudentRow[]>([])

  // Mode tugas: deskripsi tugas
  const [assignmentId, setAssignmentId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState('')

  // Mode semester
  const [semester, setSemester] = useState('1')
  const [academicYear, setAcademicYear] = useState(getAcademicYear())

  // ── Mode TUGAS: load assignment + scores ──
  const loadAssignmentMode = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: students } = await supabase
      .from('students')
      .select('id, name, nis')
      .eq('user_id', user.id)
      .eq('class_name', className)
      .order('name')

    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, description')
      .eq('user_id', user.id)
      .eq('class_name', className)
      .eq('subject', subject)
      .maybeSingle()

    let scoreMap: Record<string, string> = {}
    if (assignment) {
      setAssignmentId(assignment.id)
      setDescription(assignment.description ?? '')

      const { data: scores } = await supabase
        .from('assignment_scores')
        .select('student_id, score')
        .eq('assignment_id', assignment.id)

      scoreMap = Object.fromEntries((scores ?? []).map(s => [s.student_id, s.score != null ? String(s.score) : '']))
    } else {
      setAssignmentId(null)
      setDescription('')
    }

    setRows((students ?? []).map(s => ({
      studentId: s.id,
      studentName: s.name,
      nis: s.nis,
      score: scoreMap[s.id] ?? '',
    })))
    setLoading(false)
  }, [className, subject])

  // ── Mode SEMESTER: load nilai semester ──
  const loadSemesterMode = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: students } = await supabase
      .from('students')
      .select('id, name, nis')
      .eq('user_id', user.id)
      .eq('class_name', className)
      .order('name')

    const { data: grades } = await supabase
      .from('semester_grades')
      .select('student_id, score')
      .eq('user_id', user.id)
      .eq('class_name', className)
      .eq('subject', subject)
      .eq('semester', semester)
      .eq('academic_year', academicYear)

    const scoreMap = Object.fromEntries((grades ?? []).map(g => [g.student_id, g.score != null ? String(g.score) : '']))

    setRows((students ?? []).map(s => ({
      studentId: s.id,
      studentName: s.name,
      nis: s.nis,
      score: scoreMap[s.id] ?? '',
    })))
    setLoading(false)
  }, [className, subject, semester, academicYear])

  useEffect(() => {
    if (isSemesterMode) loadSemesterMode()
    else loadAssignmentMode()
  }, [isSemesterMode, loadAssignmentMode, loadSemesterMode])

  const updateScore = (studentId: string, val: string) => {
    if (val !== '' && (isNaN(Number(val)) || Number(val) < 0 || Number(val) > 100)) return
    setRows(prev => prev.map(r => r.studentId === studentId ? { ...r, score: val } : r))
    setSavedOk(false)
  }

  // ── Simpan deskripsi tugas ──
  const handleSaveDescription = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: upserted, error: err } = await supabase
      .from('assignments')
      .upsert(
        { user_id: user.id, class_name: className, subject, description: descDraft.trim() },
        { onConflict: 'user_id,class_name,subject' }
      )
      .select()
      .single()

    if (err) {
      setError('Gagal menyimpan deskripsi tugas.')
      return
    }

    setDescription(descDraft.trim())
    setAssignmentId(upserted?.id ?? assignmentId)
    setEditingDesc(false)
  }

  // ── Simpan nilai (mode tugas) ──
  const handleSaveAssignmentScores = async () => {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let currentAssignmentId = assignmentId
    if (!currentAssignmentId) {
      const { data: created, error: createErr } = await supabase
        .from('assignments')
        .upsert(
          { user_id: user.id, class_name: className, subject, description: description ?? '' },
          { onConflict: 'user_id,class_name,subject' }
        )
        .select()
        .single()
      if (createErr || !created) {
        setError('Gagal membuat tugas.')
        setSaving(false)
        return
      }
      currentAssignmentId = created.id
      setAssignmentId(created.id)
    }

    const upsertData = rows
      .filter(r => r.score !== '')
      .map(r => ({
        user_id: user.id,
        assignment_id: currentAssignmentId,
        student_id: r.studentId,
        score: Number(r.score),
      }))

    if (upsertData.length > 0) {
      const { error: err } = await supabase
        .from('assignment_scores')
        .upsert(upsertData, { onConflict: 'assignment_id,student_id' })
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

  // ── Simpan nilai (mode semester) ──
  const handleSaveSemesterScores = async () => {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const upsertData = rows
      .filter(r => r.score !== '')
      .map(r => ({
        user_id: user.id,
        student_id: r.studentId,
        class_name: className,
        subject,
        semester,
        academic_year: academicYear,
        score: Number(r.score),
        updated_at: new Date().toISOString(),
      }))

    if (upsertData.length > 0) {
      const { error: err } = await supabase
        .from('semester_grades')
        .upsert(upsertData, { onConflict: 'student_id,subject,semester,academic_year' })
      if (err) {
        setError('Gagal menyimpan nilai semester: ' + err.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 3000)
  }

  const handleSave = () => {
    if (isSemesterMode) handleSaveSemesterScores()
    else handleSaveAssignmentScores()
  }

  if (loading) {
    return <div className="card p-10 text-center text-slate-400 text-sm">Memuat data nilai...</div>
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Mode semester: pilih semester + tahun ajaran */}
      {isSemesterMode && (
        <div className="card p-4 flex flex-wrap items-end gap-3">
          <div className="w-36">
            <label className="label text-xs mb-1">Semester</label>
            <select
              className="input text-sm py-1.5"
              value={semester}
              onChange={e => setSemester(e.target.value)}
            >
              {SEMESTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="label text-xs mb-1">Tahun Pelajaran</label>
            <input
              className="input text-sm py-1.5"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="2024/2025"
            />
          </div>
        </div>
      )}

      {/* Mode tugas: deskripsi tugas, 1 baris + tombol edit */}
      {!isSemesterMode && (
        <div className="card p-4">
          {editingDesc ? (
            <div className="space-y-2">
              <label className="label text-xs">Deskripsi Tugas</label>
              <textarea
                className="input text-sm min-h-[100px]"
                value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                placeholder="Tuliskan deskripsi tugas di sini..."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingDesc(false)} className="btn-secondary text-xs py-1.5 px-3">
                  <X className="w-3.5 h-3.5" /> Batal
                </button>
                <button onClick={handleSaveDescription} className="btn-primary text-xs py-1.5 px-3">
                  <Save className="w-3.5 h-3.5" /> Simpan Deskripsi
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-1">Deskripsi Tugas</p>
                <p className="text-sm text-slate-700 truncate">
                  {description || <span className="text-slate-400 italic">Belum ada deskripsi tugas</span>}
                </p>
              </div>
              <button
                onClick={() => { setDescDraft(description); setEditingDesc(true) }}
                className="btn-secondary text-xs py-1.5 px-3 shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tabel nilai */}
      {rows.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">Belum ada siswa di kelas ini.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header w-8 text-center">No</th>
                  <th className="table-header">Nama Siswa</th>
                  <th className="table-header w-24">NIS</th>
                  <th className="table-header w-28 text-center">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell text-center text-slate-400">{i + 1}</td>
                    <td className="table-cell font-medium text-slate-900">{row.studentName}</td>
                    <td className="table-cell text-slate-500">{row.nis}</td>
                    <td className="table-cell p-1">
                      {/* inputMode="numeric" + pattern memunculkan keyboard angka
                          di Android/iOS tanpa perlu library tambahan */}
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                        value={row.score}
                        onChange={e => updateScore(row.studentId, e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="–"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">{rows.length} siswa · Nilai 0–100</p>
            <div className="flex items-center gap-3">
              {savedOk && (
                <span className="flex items-center gap-1.5 text-emerald-600 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan
                </span>
              )}
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Simpan Nilai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
