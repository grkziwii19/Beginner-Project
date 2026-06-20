'use client'

import { useState } from 'react'
import { X, Printer, RotateCcw } from 'lucide-react'

interface MapelRow {
  name: string
  score: number | null
  description: string
}

interface EkstrakurikulerRow {
  name: string
  note: string
}

interface RaporPreviewProps {
  studentName: string
  nisn: string
  className: string
  fase: string
  schoolName: string
  schoolAddress: string
  semester: string
  academicYear: string
  mapelRows: MapelRow[]
  ekstrakurikulerRows: EkstrakurikulerRow[]
  attendance: { sakit: number; izin: number; alpha: number }
  principalName: string
  homeroomTeacher: string
  onDescriptionChange: (index: number, newDescription: string) => void
  onClose: () => void
}

export default function RaporPreview({
  studentName, nisn, className, fase, schoolName, schoolAddress,
  semester, academicYear, mapelRows, ekstrakurikulerRows, attendance,
  principalName, homeroomTeacher, onDescriptionChange, onClose,
}: RaporPreviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col print:max-w-none print:max-h-none print:rounded-none print:shadow-none">

        {/* Toolbar - hidden saat print */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 print:hidden shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Preview Rapor</h2>
            <p className="text-xs text-slate-400">Klik teks capaian kompetensi untuk mengedit manual</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn-primary text-sm">
              <Printer className="w-4 h-4" /> Export PDF / Print
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rapor content - ini yang akan di-print */}
        <div className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="rapor-print p-8 print:p-10 max-w-3xl mx-auto" id="rapor-content">
            <style>{`
              @media print {
                @page { size: A4; margin: 1.5cm; }
                body * { visibility: hidden; }
                #rapor-content, #rapor-content * { visibility: visible; }
                #rapor-content { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `}</style>

            <h1 className="text-center font-bold text-lg mb-6 uppercase">Laporan Hasil Belajar (Rapor)</h1>

            {/* Identitas */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-6 border border-slate-300 rounded-lg p-4">
              <div className="flex"><span className="w-36 text-slate-500">Nama Peserta Didik</span><span>: {studentName}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">Kelas</span><span>: {className}</span></div>
              <div className="flex"><span className="w-36 text-slate-500">NISN</span><span>: {nisn || '-'}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">Fase</span><span>: {fase}</span></div>
              <div className="flex"><span className="w-36 text-slate-500">Sekolah</span><span>: {schoolName || '-'}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">Semester</span><span>: {semester}</span></div>
              <div className="flex"><span className="w-36 text-slate-500">Alamat</span><span>: {schoolAddress || '-'}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">Tahun Pelajaran</span><span>: {academicYear}</span></div>
            </div>

            {/* Tabel Nilai */}
            <table className="w-full border-collapse border border-slate-400 text-sm mb-6">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 px-2 py-2 w-8">No.</th>
                  <th className="border border-slate-400 px-2 py-2 text-left">Mata Pelajaran</th>
                  <th className="border border-slate-400 px-2 py-2 w-16">Nilai Akhir</th>
                  <th className="border border-slate-400 px-2 py-2 text-left">Capaian Kompetensi</th>
                </tr>
              </thead>
              <tbody>
                {mapelRows.map((row, i) => (
                  <tr key={row.name}>
                    <td className="border border-slate-400 px-2 py-2 text-center align-top">{i + 1}</td>
                    <td className="border border-slate-400 px-2 py-2 align-top">{row.name}</td>
                    <td className="border border-slate-400 px-2 py-2 text-center align-top font-medium">{row.score ?? '-'}</td>
                    <td className="border border-slate-400 px-2 py-2 align-top print:text-xs">
                      {editingIndex === i ? (
                        <textarea
                          className="w-full text-xs border border-indigo-300 rounded p-1.5 print:hidden"
                          rows={3}
                          value={row.description}
                          autoFocus
                          onChange={e => onDescriptionChange(i, e.target.value)}
                          onBlur={() => setEditingIndex(null)}
                        />
                      ) : (
                        <p
                          className="cursor-pointer hover:bg-indigo-50 rounded px-1 -mx-1 print:cursor-default print:hover:bg-transparent"
                          onClick={() => setEditingIndex(i)}
                          title="Klik untuk edit"
                        >
                          {row.description || '...'}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Ekstrakurikuler */}
            {ekstrakurikulerRows.length > 0 && (
              <table className="w-full border-collapse border border-slate-400 text-sm mb-6">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-400 px-2 py-2 w-8">No.</th>
                    <th className="border border-slate-400 px-2 py-2 text-left w-40">Ekstrakurikuler</th>
                    <th className="border border-slate-400 px-2 py-2 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {ekstrakurikulerRows.map((row, i) => (
                    <tr key={row.name}>
                      <td className="border border-slate-400 px-2 py-2 text-center">{i + 1}</td>
                      <td className="border border-slate-400 px-2 py-2">{row.name}</td>
                      <td className="border border-slate-400 px-2 py-2">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Ketidakhadiran + TTD */}
            <div className="grid grid-cols-2 gap-8 mb-10">
              <table className="border-collapse border border-slate-400 text-sm h-fit">
                <thead>
                  <tr className="bg-slate-100">
                    <th colSpan={2} className="border border-slate-400 px-2 py-2">Ketidakhadiran</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-slate-400 px-3 py-1.5">Sakit</td><td className="border border-slate-400 px-3 py-1.5 text-center">{attendance.sakit} hari</td></tr>
                  <tr><td className="border border-slate-400 px-3 py-1.5">Izin</td><td className="border border-slate-400 px-3 py-1.5 text-center">{attendance.izin} hari</td></tr>
                  <tr><td className="border border-slate-400 px-3 py-1.5">Tanpa Keterangan</td><td className="border border-slate-400 px-3 py-1.5 text-center">{attendance.alpha} hari</td></tr>
                </tbody>
              </table>

              <div className="text-sm text-right pt-2">
                <p>{schoolAddress?.split(',')[0] || '............'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            {/* Tanda tangan */}
            <div className="grid grid-cols-2 gap-8 text-sm text-center">
              <div>
                <p className="mb-16">Orang Tua/Wali Peserta Didik</p>
                <p className="border-t border-slate-400 pt-1 inline-block px-8">&nbsp;</p>
              </div>
              <div>
                <p className="mb-16">Wali Kelas</p>
                <p className="border-t border-slate-400 pt-1 inline-block px-8 font-medium">{homeroomTeacher || '............'}</p>
              </div>
            </div>
            <div className="text-center text-sm mt-10">
              <p className="mb-16">Mengetahui,<br />Kepala Sekolah</p>
              <p className="border-t border-slate-400 pt-1 inline-block px-12 font-medium">{principalName || '............'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
