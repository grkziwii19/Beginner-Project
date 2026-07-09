'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, Loader2 } from 'lucide-react'
import ExcelJS from 'exceljs'

interface StudentNilai {
  id: string
  name: string
  nis: string
  scores: Record<string, number[]> // activityName -> array nilai
  averages: Record<string, number>  // activityName -> rata-rata
  finalAverage: number | null
}

interface ActivityType {
  id: string
  name: string
  weight: number | null
}

interface Props {
  className: string
  subject: string
  semester: string
  academicYear: string
}

export default function RekapNilai({ className, subject, semester, academicYear }: Props) {
  const [supabase] = useState(() => createClient())
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([])
  const [students, setStudents] = useState<StudentNilai[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const loadData = useCallback(async () => {
    if (!className) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: studentData }, { data: activityData }, { data: scoreData }] = await Promise.all([
      supabase.from('students').select('id, name, nis')
        .eq('user_id', user.id).eq('class_name', className).order('name'),
      supabase.from('activity_types').select('id, name, weight')
        .eq('user_id', user.id).order('sort_order'),
      supabase.from('activity_scores').select('student_id, activity_type_id, score')
        .eq('user_id', user.id).eq('class_name', className)
        .eq('semester', semester).eq('academic_year', academicYear)
        .then(r => subject ? supabase.from('activity_scores').select('student_id, activity_type_id, score')
          .eq('user_id', user.id).eq('class_name', className)
          .eq('subject', subject).eq('semester', semester).eq('academic_year', academicYear) : r),
    ])

    const types = activityData ?? []
    setActivityTypes(types)

    const scoresByStudentActivity: Record<string, Record<string, number[]>> = {}
    for (const s of scoreData ?? []) {
      if (!scoresByStudentActivity[s.student_id]) scoresByStudentActivity[s.student_id] = {}
      const actId = s.activity_type_id
      if (!scoresByStudentActivity[s.student_id][actId]) scoresByStudentActivity[s.student_id][actId] = []
      if (s.score != null) scoresByStudentActivity[s.student_id][actId].push(Number(s.score))
    }

    const rows: StudentNilai[] = (studentData ?? []).map(s => {
      const byActivity = scoresByStudentActivity[s.id] ?? {}
      const averages: Record<string, number> = {}
      let weightedSum = 0
      let totalWeight = 0

      for (const t of types) {
        const vals = byActivity[t.id] ?? []
        if (vals.length > 0) {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length
          averages[t.id] = Math.round(avg)
          if (t.weight) { weightedSum += avg * t.weight; totalWeight += t.weight }
        }
      }

      const finalAverage = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null

      return { id: s.id, name: s.name, nis: s.nis, scores: byActivity, averages, finalAverage }
    })

    setStudents(rows)
    setLoading(false)
  }, [className, subject, semester, academicYear])

  useEffect(() => { loadData() }, [loadData])

  const handleExport = async () => {
    setExporting(true)
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Rekap Nilai')

    const headers = ['No', 'Nama Siswa', 'NIS', ...activityTypes.map(a => `${a.name}${a.weight ? ` (${a.weight}%)` : ''}`), 'Nilai Akhir']
    ws.addRow(headers)
    ws.getRow(1).font = { bold: true }

    students.forEach((s, i) => {
      ws.addRow([
        i + 1, s.name, s.nis,
        ...activityTypes.map(a => s.averages[a.id] ?? ''),
        s.finalAverage ?? '',
      ])
    })

    ws.columns.forEach(col => { col.width = 18 })

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Rekap_Nilai_${className}_${semester === '1' ? 'Ganjil' : 'Genap'}_${academicYear.replace('/', '-')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  if (loading) return <div className="card p-10 text-center text-slate-400 text-sm">Memuat rekap nilai...</div>

  if (students.length === 0) return (
    <div className="card p-10 text-center text-slate-400 text-sm">Belum ada data nilai.</div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button onClick={handleExport} disabled={exporting} className="btn-secondary text-sm">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export Excel
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header w-8 text-center">No</th>
                <th className="table-header">Nama Siswa</th>
                <th className="table-header w-24">NIS</th>
                {activityTypes.map(a => (
                  <th key={a.id} className="table-header w-24 text-center">
                    <span className="block leading-tight">{a.name}</span>
                    {a.weight && <span className="text-[10px] font-normal text-slate-400">{a.weight}%</span>}
                  </th>
                ))}
                <th className="table-header w-24 text-center font-bold">Nilai Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="table-cell text-center text-slate-400">{i + 1}</td>
                  <td className="table-cell font-medium text-slate-900">{s.name}</td>
                  <td className="table-cell text-slate-500">{s.nis}</td>
                  {activityTypes.map(a => (
                    <td key={a.id} className="table-cell text-center text-slate-700">
                      {s.averages[a.id] ?? <span className="text-slate-300">–</span>}
                    </td>
                  ))}
                  <td className="table-cell text-center font-bold text-slate-900">
                    {s.finalAverage ?? <span className="text-slate-300 font-normal">–</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
