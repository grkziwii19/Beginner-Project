'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, Loader2 } from 'lucide-react'
import ExcelJS from 'exceljs'

interface StudentAbsensi {
  id: string
  name: string
  nis: string
  hadir: number
  sakit: number
  izin: number
  alpha: number
  total: number
}

interface Props {
  className: string
  subject: string
  semester: string
  academicYear: string
}

const UMUM_VALUE = '__umum__'

export default function RekapAbsensi({ className, subject, semester, academicYear }: Props) {
  const [supabase] = useState(() => createClient())
  const [students, setStudents] = useState<StudentAbsensi[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const loadData = useCallback(async () => {
    if (!className) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: studentData } = await supabase
      .from('students').select('id, name, nis')
      .eq('user_id', user.id).eq('class_name', className).order('name')

    // Ambil rentang tanggal berdasarkan semester & tahun ajaran
    const [tahunAwal, tahunAkhir] = academicYear.split('/').map(Number)
    const startDate = semester === '1'
      ? `${tahunAwal}-07-01`
      : `${tahunAkhir}-01-01`
    const endDate = semester === '1'
      ? `${tahunAwal}-12-31`
      : `${tahunAkhir}-06-30`

    let attQuery = supabase
      .from('attendance')
      .select('student_id, status')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)

    if (subject) {
      attQuery = attQuery.eq('subject', subject)
    } else {
      // Ambil semua (termasuk UMUM_VALUE dan per mapel)
    }

    const { data: attData } = await attQuery

    const attMap: Record<string, Record<string, number>> = {}
    for (const a of attData ?? []) {
      if (!attMap[a.student_id]) attMap[a.student_id] = { hadir: 0, sakit: 0, izin: 0, alpha: 0 }
      attMap[a.student_id][a.status] = (attMap[a.student_id][a.status] ?? 0) + 1
    }

    const rows: StudentAbsensi[] = (studentData ?? []).map(s => {
    const att = attMap[s.id] ?? { hadir: 0, sakit: 0, izin: 0, alpha: 0 }
    const total = att.hadir + att.sakit + att.izin + att.alpha
    return {
      id: s.id,
      name: s.name,
      nis: s.nis,
      hadir: att.hadir,
      sakit: att.sakit,
      izin: att.izin,
      alpha: att.alpha,
      total,
    }
  })

    setStudents(rows)
    setLoading(false)
  }, [className, subject, semester, academicYear])

  useEffect(() => { loadData() }, [loadData])

  const handleExport = async () => {
    setExporting(true)
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Rekap Absensi')

    ws.addRow(['No', 'Nama Siswa', 'NIS', 'Hadir', 'Sakit', 'Izin', 'Alpha', 'Total Pertemuan'])
    ws.getRow(1).font = { bold: true }

    students.forEach((s, i) => {
      ws.addRow([i + 1, s.name, s.nis, s.hadir, s.sakit, s.izin, s.alpha, s.total])
    })

    ws.columns.forEach(col => { col.width = 16 })

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Rekap_Absensi_${className}_${semester === '1' ? 'Ganjil' : 'Genap'}_${academicYear.replace('/', '-')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  if (loading) return (
    <div className="card p-10 text-center text-slate-400 text-sm">Memuat rekap absensi...</div>
  )

  if (students.length === 0) return (
    <div className="card p-10 text-center text-slate-400 text-sm">Belum ada data absensi.</div>
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
                <th className="table-header w-20 text-center text-emerald-700">Hadir</th>
                <th className="table-header w-20 text-center text-blue-700">Sakit</th>
                <th className="table-header w-20 text-center text-amber-700">Izin</th>
                <th className="table-header w-20 text-center text-red-700">Alpha</th>
                <th className="table-header w-20 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="table-cell text-center text-slate-400">{i + 1}</td>
                  <td className="table-cell font-medium text-slate-900">{s.name}</td>
                  <td className="table-cell text-slate-500">{s.nis}</td>
                  <td className="table-cell text-center">
                    <span className="font-semibold text-emerald-700">{s.hadir}</span>
                  </td>
                  <td className="table-cell text-center">
                    <span className={s.sakit > 0 ? 'text-blue-700' : 'text-slate-300'}>
                      {s.sakit || '–'}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span className={s.izin > 0 ? 'text-amber-700' : 'text-slate-300'}>
                      {s.izin || '–'}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span className={s.alpha > 0 ? 'font-semibold text-red-700' : 'text-slate-300'}>
                      {s.alpha || '–'}
                    </span>
                  </td>
                  <td className="table-cell text-center text-slate-600">{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
