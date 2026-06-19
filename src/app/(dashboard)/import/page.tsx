'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Download, FileSpreadsheet, Users, Award, ClipboardCheck, CheckCircle, AlertCircle } from 'lucide-react'
import ExcelJS from 'exceljs'

export default function ImportPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportMsg(null)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      const sheet = workbook.worksheets[0]

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User tidak ditemukan')

      const rows: any[] = []
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const values = row.values as any[]
        rows.push({
          name: values[1]?.toString().trim(),
          nis: values[2]?.toString().trim(),
          class_name: values[3]?.toString().trim(),
          gender: values[4]?.toString().trim() === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
          user_id: user.id,
        })
      })

      const validRows = rows.filter(r => r.name && r.nis && r.class_name)
      if (validRows.length === 0) {
        setImportMsg({ type: 'error', text: 'Tidak ada data valid. Pastikan format: Nama, NIS, Kelas, Jenis Kelamin.' })
        return
      }

      // Auto-create classes that don't exist yet
      const { data: existingClasses } = await supabase.from('classes').select('name').eq('user_id', user.id)
      const existingNames = new Set((existingClasses ?? []).map(c => c.name))
      const newClassNames = [...new Set(validRows.map(r => r.class_name))].filter(n => !existingNames.has(n))
      if (newClassNames.length > 0) {
        await supabase.from('classes').insert(
          newClassNames.map(name => ({ name, user_id: user.id, status: 'aktif' }))
        )
      }

      const { error } = await supabase.from('students').insert(validRows)
      if (error) throw error

      setImportMsg({ type: 'success', text: `${validRows.length} siswa berhasil diimport! ${newClassNames.length > 0 ? `${newClassNames.length} kelas baru dibuat otomatis.` : ''}` })
    } catch (err: any) {
      setImportMsg({ type: 'error', text: err.message || 'Gagal mengimport file.' })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Data Siswa')
    sheet.addRow(['Nama', 'NIS', 'Kelas', 'Jenis Kelamin'])
    sheet.addRow(['Ahmad Fauzi', '2024001', '7A', 'Laki-laki'])
    sheet.addRow(['Siti Aisyah', '2024002', '7A', 'Perempuan'])
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'template_data_siswa.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = async (type: 'students' | 'grades' | 'attendance') => {
    setExporting(type)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const workbook = new ExcelJS.Workbook()

      if (type === 'students') {
        const { data } = await supabase.from('students').select('*').eq('user_id', user.id).order('class_name').order('name')
        const sheet = workbook.addWorksheet('Data Siswa')
        sheet.addRow(['Nama', 'NIS', 'Kelas', 'Jenis Kelamin'])
        data?.forEach(s => sheet.addRow([s.name, s.nis, s.class_name, s.gender]))
      }
      if (type === 'grades') {
        const [{ data: students }, { data: grades }] = await Promise.all([
          supabase.from('students').select('*').eq('user_id', user.id),
          supabase.from('grades').select('*').eq('user_id', user.id),
        ])
        const sheet = workbook.addWorksheet('Data Nilai')
        sheet.addRow(['Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Jenis', 'Nilai'])
        grades?.forEach(g => {
          const st = students?.find(s => s.id === g.student_id)
          sheet.addRow([st?.name ?? '-', st?.class_name ?? '-', g.subject, g.type, g.score])
        })
      }
      if (type === 'attendance') {
        const [{ data: students }, { data: att }] = await Promise.all([
          supabase.from('students').select('*').eq('user_id', user.id),
          supabase.from('attendance').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        ])
        const sheet = workbook.addWorksheet('Data Absensi')
        sheet.addRow(['Tanggal', 'Nama Siswa', 'Kelas', 'Status'])
        att?.forEach(a => {
          const st = students?.find(s => s.id === a.student_id)
          sheet.addRow([a.date, st?.name ?? '-', st?.class_name ?? '-', a.status])
        })
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.xlsx`; a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import & Export Data</h1>
        <p className="text-sm text-slate-500 mt-0.5">Import data siswa secara massal atau export data ke Excel</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'import', label: 'Import Data', icon: Upload },
          { id: 'export', label: 'Export Data', icon: Download },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as 'import' | 'export')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'import' && (
        <div className="max-w-xl">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Import Data Siswa</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Upload file Excel (.xlsx) berisi data siswa. Kelas baru akan dibuat otomatis jika belum ada.
              Format kolom: Nama, NIS, Kelas, Jenis Kelamin.
            </p>
            <button onClick={downloadTemplate} className="btn-secondary mb-4 text-xs">
              <Download className="w-3.5 h-3.5" /> Unduh Template Excel
            </button>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-8 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
              <Upload className="w-8 h-8 text-slate-300" />
              <span className="text-sm font-medium text-slate-600">{importing ? 'Mengimport...' : 'Klik untuk pilih file Excel'}</span>
              <span className="text-xs text-slate-400">.xlsx, .xls</span>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} disabled={importing} />
            </label>
            {importMsg && (
              <div className={`flex items-start gap-2 mt-4 p-3 rounded-lg text-sm ${
                importMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}>
                {importMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                {importMsg.text}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="max-w-xl space-y-3">
          {[
            { type: 'students' as const, label: 'Data Siswa', desc: 'Export semua data siswa terdaftar', icon: Users, color: 'bg-indigo-50 text-indigo-600' },
            { type: 'grades' as const, label: 'Data Nilai', desc: 'Export rekap nilai semua siswa', icon: Award, color: 'bg-purple-50 text-purple-600' },
            { type: 'attendance' as const, label: 'Data Absensi', desc: 'Export rekap absensi semua siswa', icon: ClipboardCheck, color: 'bg-amber-50 text-amber-600' },
          ].map(item => (
            <div key={item.type} className="card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900 text-sm">{item.label}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
              <button onClick={() => handleExport(item.type)} disabled={exporting === item.type} className="btn-secondary text-xs">
                <Download className="w-3.5 h-3.5" /> {exporting === item.type ? 'Mengexport...' : 'Export'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
