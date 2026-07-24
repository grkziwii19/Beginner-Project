'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, CheckCircle2 } from 'lucide-react'

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
  inputType: string // <-- Menerima jenis data global
}

const DEFAULT_ACTIVITY_TYPES = [
  { name: 'Tugas Harian', weight: 20, sort_order: 0 },
  { name: 'Ulangan Harian', weight: 25, sort_order: 1 },
  { name: 'Praktik', weight: 15, sort_order: 2 },
  { name: 'PTS', weight: 20, sort_order: 3 },
  { name: 'PAS', weight: 20, sort_order: 4 },
]

export default function NilaiTab({ className, subject, date, semester, academicYear, inputType }: Props) {
  const [supabase] = useState(() => createClient())

  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [loadingTypes, setLoadingTypes] = useState(true)

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
      } else {
        const { data: inserted } = await supabase
          .from('activity_types')
          .insert(DEFAULT_ACTIVITY_TYPES.map(d => ({ ...d, user_id: user.id })))
          .select('id, name, weight')
        if (inserted) {
          setActivityTypes(inserted)
        }
      }
      setLoadingTypes(false)
    }
    loadTypes()
  }, [])

  // ── Otomatis pilih Kegiatan Berdasarkan Input Global ──
  useEffect(() => {
    if (activityTypes.length > 0 && inputType) {
      const inputLower = inputType.toLowerCase()
      
      const matched = activityTypes.find(a => {
        const nameLower = a.name.toLowerCase()
        if (inputLower === 'harian') {
          return nameLower.includes('ulangan harian') || (nameLower.includes('harian') && !nameLower.includes('tugas'))
        }
        if (inputLower === 'tugas') {
          return nameLower.includes('tugas harian') || nameLower.includes('tugas')
        }
        if (inputLower === 'sts') {
          return nameLower.includes('pts') || nameLower.includes('sts') || nameLower.includes('tengah')
        }
        if (inputLower === 'sas') {
          return nameLower.includes('pas') || nameLower.includes('sas') || nameLower.includes('akhir')
        }
        return nameLower.includes(inputLower)
      })

      // Set ID kegiatan yang cocok, atau default ke pertama jika tidak ada yang cocok
      setSelectedActivityId(matched ? matched.id : (activityTypes[0]?.id || ''))
    }
  }, [inputType, activityTypes])

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
    if (!selectedActivityId) return
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

  const selectedActivity = activityTypes.find(a => a.id === selectedActivityId)

  if (loadingTypes) return (
    <div className="card p-10 text-center text-slate-400 text-sm">Memuat jenis kegiatan...</div>
  )

  return (
    <div className="space-y-3">
      {/* Tampilan Error */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* TABEL DATA NILAI */}
      {loading ? (
        <div className="card p-10 text-center text-slate-400 text-sm">Memuat data...</div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">Belum ada siswa di kelas ini.</div>
      ) : (
        <div className="card overflow-hidden border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 w-12 text-center">No</th>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-600">Nama Siswa</th>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 w-24">NIS</th>
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 w-28 text-center">
                    Nilai </th>
                    
                  <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-600">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {rows.map((row, i) => (
                  <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-1.5 text-sm text-slate-500 font-medium text-center">{i + 1}</td>
                    <td className="px-3 py-1.5 text-sm font-semibold text-slate-900">{row.studentName}</td>
                    <td className="px-3 py-1.5 text-sm font-bold text-slate-500">{row.nis}</td>
                    
                    {/* Input Nilai */}
                    <td className="px-2 py-1 text-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full text-center border border-slate-300 hover:border-slate-400 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent bg-white h-[32px]"
                        value={row.score}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '')
                          if (val === '' || Number(val) <= 100) updateRow(row.studentId, { score: val })
                        }}
                        placeholder="–"
                      />
                    </td>
                    
                    {/* Input Catatan */}
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        className="w-full border border-slate-300 hover:border-slate-400 rounded-lg px-2 py-1 text-sm font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent bg-white h-[32px]"
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

          {/* Baris Tindakan Bawah yang Ramping (Status Pertemuan ke-X Ditampilkan di Sini) */}
          <div className="p-2.5 border-t border-slate-150 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              <span>{rows.length} siswa</span>
              {selectedActivity?.name && (
                <>
                  <span>·</span>
                  <span>{selectedActivity.name}</span>
                </>
              )}
              {meetingCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-indigo-600">Pertemuan ke-{meetingCount}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {savedOk && (
                <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan
                </span>
              )}
              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm rounded-md"
              >
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