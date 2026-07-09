'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, CheckCircle2, Plus, ChevronDown } from 'lucide-react'

interface StudentRow {
  studentId: string
  studentName: string
  nis: string
  score: string
  note: string
}

interface ActivityType {
  id: string
  name: string
  weight: number | null
}

interface Props {
  className: string
  subject: string
  date: string
  semester: string
  academicYear: string
}

const DEFAULT_ACTIVITY_TYPES = [
  { name: 'Tugas Harian', weight: 20, sort_order: 0 },
  { name: 'Ulangan Harian', weight: 25, sort_order: 1 },
  { name: 'Praktik', weight: 15, sort_order: 2 },
  { name: 'PTS', weight: 20, sort_order: 3 },
  { name: 'PAS', weight: 20, sort_order: 4 },
]

export default function NilaiTab({ className, subject, date, semester, academicYear }: Props) {
  const [supabase] = useState(() => createClient())

  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [addingType, setAddingType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')

  const [rows, setRows] = useState<StudentRow[]>([])
  const [meetingCount, setMeetingCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState('')

  // ── Load jenis kegiatan (sekali saat mount) ──
  useEffect(() => {
    const loadTypes = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('activity_types')
        .select('id, name, weight')
        .eq('user_id', user.id)
        .order('sort_order')

      if (data && data.length > 0) {
        setActivityTypes(data)
        setSelectedActivityId(data[0].id)
      } else {
        const { data: inserted } = await supabase
          .from('activity_types')
          .insert(DEFAULT_ACTIVITY_TYPES.map(d => ({ ...d, user_id: user.id })))
          .select('id, name, weight')
        if (inserted) {
          setActivityTypes(inserted)
          setSelectedActivityId(inserted[0].id)
        }
      }
      setLoadingTypes(false)
    }
    loadTypes()
  }, [])

  // ── Load siswa + nilai saat filter berubah ──
  const loadData = useCallback(async () => {
    if (!selectedActivityId || !className || !subject) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: students }, { data: todayScores }, { data: allDates }] = await Promise.all([
      supabase.from('students').select('id, name, nis')
        .eq('user_id', user.id).eq('class_name', className).order('name'),
      supabase.from('activity_scores').select('student_id, score, note')
        .eq('user_id', user.id).eq('class_name', className).eq('subject', subject)
        .eq('activity_type_id', selectedActivityId).eq('date', date),
      supabase.from('activity_scores').select('date')
        .eq('user_id', user.id).eq('class_name', className).eq('subject', subject)
        .eq('activity_type_id', selectedActivityId)
        .eq('semester', semester).eq('academic_year', academicYear),
    ])

    const scoreMap: Record<string, { score: string; note: string }> = {}
    todayScores?.forEach(s => {
      scoreMap[s.student_id] = { score: s.score != null ? String(s.score) : '', note: s.note ?? '' }
    })

    const uniqueDates = new Set(allDates?.map(s => s.date) ?? [])
    setMeetingCount(uniqueDates.has(date) ? uniqueDates.size : uniqueDates.size + 1)

    setRows((students ?? []).map(s => ({
      studentId: s.id,
      studentName: s.name,
      nis: s.nis,
      score: scoreMap[s.id]?.score ?? '',
      note: scoreMap[s.id]?.note ?? '',
    })))
    setLoading(false)
  }, [className, subject, date, selectedActivityId, semester, academicYear])

  useEffect(() => { loadData() }, [loadData])

  const updateRow = (studentId: string, patch: Partial<StudentRow>) => {
    setRows(prev => prev.map(r => r.studentId === studentId ? { ...r, ...patch } : r))
    setSavedOk(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const records = rows.filter(r => r.score !== '').map(r => ({
      user_id: user.id,
      student_id: r.studentId,
      activity_type_id: selectedActivityId,
      class_name: className,
      subject,
      semester,
      academic_year: academicYear,
      score: Number(r.score),
      note: r.note || null,
      date,
    }))

    if (records.length > 0) {
      const { error: err } = await supabase.from('activity_scores')
        .upsert(records, { onConflict: 'user_id,student_id,activity_type_id,class_name,subject,date' })
      if (err) { setError('Gagal menyimpan: ' + err.message); setSaving(false); return }
    }

    setSaving(false)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 3000)
    loadData()
  }

  const handleAddType = async () => {
    if (!newTypeName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: err } = await supabase.from('activity_types')
      .insert({ user_id: user.id, name: newTypeName.trim(), sort_order: activityTypes.length })
      .select('id, name, weight').single()

    if (!err && data) {
      setActivityTypes(prev => [...prev, data])
      setSelectedActivityId(data.id)
      setNewTypeName('')
      setAddingType(false)
    }
  }

  const selectedActivity = activityTypes.find(a => a.id === selectedActivityId)

  if (loadingTypes) return (
    <div className="card p-10 text-center text-slate-400 text-sm">Memuat jenis kegiatan...</div>
  )

  return (
    <div className="space-y-4">
      {/* Pilih Jenis Kegiatan */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-slate-600 shrink-0">Jenis Kegiatan</label>

          <div className="relative">
            <select
              className="input appearance-none pr-9 text-sm"
              value={selectedActivityId}
              onChange={e => setSelectedActivityId(e.target.value)}
            >
              {activityTypes.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.weight != null ? ` (${a.weight}%)` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {!addingType ? (
            <button onClick={() => setAddingType(true)} className="btn-secondary text-xs py-1.5 px-3">
              <Plus className="w-3.5 h-3.5" /> Jenis Baru
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                className="input text-sm py-1.5 w-44"
                placeholder="Nama jenis kegiatan"
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddType() }}
                autoFocus
              />
              <button onClick={handleAddType} className="btn-primary text-xs py-1.5 px-3">Tambah</button>
              <button onClick={() => { setAddingType(false); setNewTypeName('') }} className="btn-secondary text-xs py-1.5 px-3">Batal</button>
            </div>
          )}

          {meetingCount > 0 && (
            <span className="ml-auto text-xs text-slate-400">
              Pertemuan ke-{meetingCount}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {loading ? (
        <div className="card p-10 text-center text-slate-400 text-sm">Memuat data...</div>
      ) : rows.length === 0 ? (
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
                  <th className="table-header w-24 text-center">
                    Nilai
                    {selectedActivity?.weight != null && (
                      <span className="block text-[10px] text-slate-400 font-normal">bobot {selectedActivity.weight}%</span>
                    )}
                  </th>
                  <th className="table-header">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell text-center text-slate-400">{i + 1}</td>
                    <td className="table-cell font-medium text-slate-900">{row.studentName}</td>
                    <td className="table-cell text-slate-500">{row.nis}</td>
                    <td className="table-cell p-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                        value={row.score}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '')
                          if (val === '' || Number(val) <= 100) updateRow(row.studentId, { score: val })
                        }}
                        placeholder="–"
                      />
                    </td>
                    <td className="table-cell p-1">
                      <input
                        type="text"
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                        value={row.note}
                        onChange={e => updateRow(row.studentId, { note: e.target.value })}
                        placeholder="–"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {rows.length} siswa · {selectedActivity?.name}
            </p>
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
