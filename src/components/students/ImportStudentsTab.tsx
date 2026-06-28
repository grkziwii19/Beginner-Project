'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Gender, type ParentType } from '@/types'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, X } from 'lucide-react'
import ExcelJS from 'exceljs'

interface ImportRow {
  name: string
  nis: string
  nisn: string
  gender: Gender
  religion: string
  birth_place: string
  birth_date: string
  address: string
  parent_type: ParentType
  parent_name: string
  parent_phone: string
  valid: boolean
  error?: string
}

const HEADERS = [
  'Nama', 'NIS', 'NISN', 'Jenis Kelamin', 'Agama',
  'Tempat Lahir', 'Tanggal Lahir', 'Alamat',
  'Status Orang Tua/Wali', 'Nama Orang Tua/Wali', 'No HP Orang Tua/Wali',
]

interface Props {
  className: string
  onImported: () => void
}

export default function ImportStudentsTab({ className, onImported }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const parseDate = (value: unknown): string => {
    if (!value) return ''
    if (value instanceof Date) return value.toISOString().split('T')[0]
    const str = String(value).trim()
    const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (match) {
      const [, d, m, y] = match
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    return str
  }

  const processFile = async (file: File) => {
    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.worksheets[0]

    let headers: string[] = []
    const jsonRows: Record<string, unknown>[] = []

    sheet.eachRow((row, rowNumber) => {
      const values = (row.values as unknown[]).slice(1)
      if (rowNumber === 1) {
        headers = values.map(v => String(v ?? '').trim())
      } else {
        const obj: Record<string, unknown> = {}
        headers.forEach((h, i) => { obj[h] = values[i] })
        if (Object.values(obj).some(v => v !== undefined && v !== null && String(v).trim() !== '')) {
          jsonRows.push(obj)
        }
      }
    })

    const parsed: ImportRow[] = jsonRows.map(row => {
      const get = (key: string) => String(row[key] ?? '').trim()

      const name = get('Nama')
      const nis = get('NIS')
      const genderRaw = get('Jenis Kelamin')
      const gender: Gender = genderRaw.toLowerCase().startsWith('p') ? 'Perempuan' : 'Laki-laki'

      const parentTypeRaw = get('Status Orang Tua/Wali')
      let parent_type: ParentType = 'Ayah'
      if (parentTypeRaw.toLowerCase().startsWith('ibu')) parent_type = 'Ibu'
      else if (parentTypeRaw.toLowerCase().startsWith('wali')) parent_type = 'Wali'

      const errors: string[] = []
      if (!name) errors.push('Nama kosong')
      if (!nis) errors.push('NIS kosong')

      return {
        name,
        nis,
        nisn: get('NISN'),
        gender,
        religion: get('Agama'),
        birth_place: get('Tempat Lahir'),
        birth_date: parseDate(row['Tanggal Lahir']),
        address: get('Alamat'),
        parent_type,
        parent_name: get('Nama Orang Tua/Wali'),
        parent_phone: get('No HP Orang Tua/Wali'),
        valid: errors.length === 0,
        error: errors.join(', '),
      }
    })

    setRows(parsed)
    setResult(null)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleImport = async () => {
    const valid = rows.filter(r => r.valid)
    if (valid.length === 0) return
    setImporting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const records = valid.map(r => ({
      user_id: user.id,
      name: r.name,
      nis: r.nis,
      nisn: r.nisn || null,
      class_name: className,
      gender: r.gender,
      religion: r.religion || null,
      birth_place: r.birth_place || null,
      birth_date: r.birth_date || null,
      address: r.address || null,
      parent_type: r.parent_name ? r.parent_type : null,
      parent_name: r.parent_name || null,
      parent_phone: r.parent_phone || null,
    }))

    const { data, error } = await supabase.from('students').insert(records).select()
    setResult({ success: data?.length ?? 0, failed: error ? valid.length : 0 })
    setImporting(false)
    if (!error) {
      setRows([])
      onImported()
    }
  }

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Siswa')

    sheet.columns = HEADERS.map(h => ({ header: h, key: h, width: 20 }))

    sheet.addRow({
      'Nama': 'Ahmad Fauzi',
      'NIS': '2024001',
      'NISN': '0012345678',
      'Jenis Kelamin': 'Laki-laki',
      'Agama': 'Islam',
      'Tempat Lahir': 'Jakarta',
      'Tanggal Lahir': '15/08/2012',
      'Alamat': 'Jl. Merdeka No. 10',
      'Status Orang Tua/Wali': 'Ayah',
      'Nama Orang Tua/Wali': 'Budi Santoso',
      'No HP Orang Tua/Wali': '081298765432',
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-import-siswa.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const validCount = rows.filter(r => r.valid).length
  const invalidCount = rows.filter(r => !r.valid).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">Upload file Excel untuk menambahkan siswa ke kelas <strong>{className}</strong> sekaligus</p>
        <button onClick={downloadTemplate} className="btn-secondary">
          <Download className="w-4 h-4" /> Download Template
        </button>
      </div>

      {/* Upload Area */}
      {rows.length === 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`card p-10 text-center cursor-pointer transition-colors border-2 border-dashed ${
            dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-1">Seret file Excel ke sini, atau klik untuk memilih</p>
          <p className="text-sm text-slate-400">Gunakan template di atas agar kolom sesuai</p>
          <input ref={fileRef} type="file" accept=".xlsx" onChange={handleFile} className="hidden" />
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`card p-5 flex items-center gap-4 ${result.failed > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
          <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-slate-900">Import selesai</p>
            <p className="text-sm text-slate-600">{result.success} siswa berhasil ditambahkan ke {className}.</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle className="w-4 h-4" /> {validCount} valid
              </span>
              {invalidCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-600">
                  <AlertCircle className="w-4 h-4" /> {invalidCount} error
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRows([]); setResult(null) }} className="btn-secondary">
                <X className="w-4 h-4" /> Batal
              </button>
              <button onClick={handleImport} disabled={importing || validCount === 0} className="btn-primary">
                <Upload className="w-4 h-4" />
                {importing ? 'Mengimpor...' : `Import ${validCount} Siswa`}
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="table-header w-8">#</th>
                    <th className="table-header">Nama</th>
                    <th className="table-header">NIS</th>
                    <th className="table-header">JK</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={i} className={r.valid ? '' : 'bg-red-50'}>
                      <td className="table-cell text-slate-400">{i + 1}</td>
                      <td className="table-cell font-medium text-slate-900">{r.name || <span className="text-red-400 italic">kosong</span>}</td>
                      <td className="table-cell text-slate-500">{r.nis || '-'}</td>
                      <td className="table-cell text-slate-500 text-xs">{r.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                      <td className="table-cell">
                        {r.valid
                          ? <span className="badge bg-emerald-100 text-emerald-700">Valid</span>
                          : <span className="badge bg-red-100 text-red-700" title={r.error}>{r.error}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
