'use client'

import { useState } from 'react'
import { X, Printer, FileDown, Loader2 } from 'lucide-react'
import { generateRaporDocx, downloadDocx, getNarasi, type RaporSiswa } from '@/lib/rapor/generateRapor'

interface MapelRow {
  name: string
  score: number | null
  description: string
}

interface EkstrakurikulerRow {
  name: string
  predicate: string
  note: string
}

interface SikapRow {
  dimensi: string
  penjelasan: string
}

export interface RaporPreviewProps {
  // Identitas siswa
  studentName: string
  nis: string
  nisn?: string | null
  className: string
  fase: string
  schoolName: string
  schoolAddress: string
  semester: string        // '1' | '2'
  semesterLabel: string   // 'I (Ganjil)' | 'II (Genap)'
  academicYear: string

  // Konten rapor
  mapelRows: MapelRow[]
  sikapRows: SikapRow[]
  ekstrakurikulerRows: EkstrakurikulerRow[]
  attendance: { sakit: number; izin: number; alpha: number }
  catatan: string

  // TTD
  principalName: string
  principalNip?: string
  homeroomTeacher: string
  homeroomNip?: string
  tempatTTD: string
  tanggalTTD: string

  onDescriptionChange: (index: number, newDescription: string) => void
  onSikapChange: (index: number, newPenjelasan: string) => void
  onClose: () => void
}

export default function RaporPreview({
  studentName, nis, nisn, className, fase, schoolName, schoolAddress,
  semester, semesterLabel, academicYear, mapelRows, sikapRows,
  ekstrakurikulerRows, attendance, catatan,
  principalName, principalNip, homeroomTeacher, homeroomNip,
  tempatTTD, tanggalTTD,
  onDescriptionChange, onSikapChange, onClose,
}: RaporPreviewProps) {
  const [editingMapel, setEditingMapel] = useState<number | null>(null)
  const [editingSikap, setEditingSikap] = useState<number | null>(null)
  const [generatingDocx, setGeneratingDocx] = useState(false)

  const handlePrint = () => window.print()

  const handleDownloadDocx = async () => {
    setGeneratingDocx(true)
    try {
      const data: RaporSiswa = {
        nama: studentName,
        nis,
        nisn,
        kelas: className,
        fase,
        sekolah: schoolName,
        alamat: schoolAddress,
        semester,
        semesterLabel,
        tahunPelajaran: academicYear,
        waliKelas: homeroomTeacher,
        nipWaliKelas: homeroomNip,
        kepalaSekolah: principalName,
        nipKepalaSekolah: principalNip,
        tempatTTD,
        tanggalTTD,
        nilaiMapel: mapelRows.map((m, i) => ({ no: i + 1, mapel: m.name, nilai: m.score ?? 0 })),
        sikap: sikapRows,
        ekskul: ekstrakurikulerRows.map((e, i) => ({ no: i + 1, nama: e.name, predikat: e.predicate, keterangan: e.note })),
        catatan,
        sakit: attendance.sakit,
        izin: attendance.izin,
        tanpaKeterangan: attendance.alpha,
      }
      const buf = await generateRaporDocx([data])
      downloadDocx(buf, `Rapor_${studentName}_${semester === '1' ? 'Ganjil' : 'Genap'}_${academicYear.replace('/', '-')}.docx`)
    } catch (e) {
      console.error(e)
    } finally {
      setGeneratingDocx(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col print:max-w-none print:max-h-none print:rounded-none print:shadow-none">

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 print:hidden shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Preview Rapor — {studentName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Klik teks capaian/sikap untuk mengedit. Lalu download Word atau Print PDF.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadDocx} disabled={generatingDocx} className="btn-secondary text-sm">
              {generatingDocx ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Download Word
            </button>
            <button onClick={handlePrint} className="btn-primary text-sm">
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rapor content */}
        <div className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="rapor-print p-8 print:p-10 max-w-3xl mx-auto font-serif" id="rapor-content">
            <style>{`
              @media print {
                @page { size: A4; margin: 1.5cm; }
                body * { visibility: hidden; }
                #rapor-content, #rapor-content * { visibility: visible; }
                #rapor-content { position: absolute; left: 0; top: 0; width: 100%; }
                .print-hide { display: none !important; }
              }
            `}</style>

            {/* Judul */}
            <div className="text-center mb-4">
              <p className="font-bold text-base uppercase">{schoolName || 'SD .....................'}</p>
              <p className="font-bold text-lg uppercase tracking-wide mt-1">LAPORAN HASIL BELAJAR</p>
            </div>

            {/* Identitas */}
            <table className="w-full text-sm mb-4">
              <tbody>
                <tr>
                  <td className="w-44 py-0.5 text-slate-600">Nama Peserta Didik</td>
                  <td className="w-4 py-0.5">:</td>
                  <td className="py-0.5">{studentName}</td>
                  <td className="w-28 py-0.5 text-slate-600">Kelas</td>
                  <td className="w-4 py-0.5">:</td>
                  <td className="py-0.5">{className}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-600">NIS/NISN</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{nis} / {nisn || '-'}</td>
                  <td className="py-0.5 text-slate-600">Fase</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{fase}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-600">Sekolah</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{schoolName || '-'}</td>
                  <td className="py-0.5 text-slate-600">Semester</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{semesterLabel}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-600">Alamat</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{schoolAddress || '-'}</td>
                  <td className="py-0.5 text-slate-600">Tahun Pelajaran</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{academicYear}</td>
                </tr>
              </tbody>
            </table>

            {/* A. SIKAP */}
            <p className="font-bold text-sm mb-2 border-b border-black pb-0.5">A. SIKAP</p>
            <table className="w-full border-collapse text-sm mb-4">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 px-2 py-1.5 text-left w-56">Dimensi</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-left">Penjelasan</th>
                </tr>
              </thead>
              <tbody>
                {sikapRows.map((s, i) => (
                  <tr key={s.dimensi}>
                    <td className="border border-slate-400 px-2 py-1.5 align-top text-xs">{s.dimensi}</td>
                    <td className="border border-slate-400 px-2 py-1.5 align-top text-xs">
                      {editingSikap === i ? (
                        <textarea
                          className="w-full text-xs border border-indigo-300 rounded p-1 print:hidden"
                          rows={2}
                          value={s.penjelasan}
                          autoFocus
                          onChange={e => onSikapChange(i, e.target.value)}
                          onBlur={() => setEditingSikap(null)}
                        />
                      ) : (
                        <p
                          className="cursor-pointer hover:bg-indigo-50 rounded px-1 -mx-1 print:cursor-default"
                          onClick={() => setEditingSikap(i)}
                          title="Klik untuk edit"
                        >
                          {s.penjelasan || '...'}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* B. MATA PELAJARAN */}
            <p className="font-bold text-sm mb-2 border-b border-black pb-0.5">B. MATA PELAJARAN</p>
            <table className="w-full border-collapse text-sm mb-4">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 px-2 py-1.5 w-8">No.</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-left w-44">Mata Pelajaran</th>
                  <th className="border border-slate-400 px-2 py-1.5 w-14">Nilai</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-left">Capaian Kompetensi</th>
                </tr>
              </thead>
              <tbody>
                {mapelRows.map((row, i) => (
                  <tr key={row.name}>
                    <td className="border border-slate-400 px-2 py-1.5 text-center align-top">{i + 1}</td>
                    <td className="border border-slate-400 px-2 py-1.5 align-top text-xs">{row.name}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center align-top font-bold">{row.score ?? '-'}</td>
                    <td className="border border-slate-400 px-2 py-1.5 align-top text-xs">
                      {editingMapel === i ? (
                        <textarea
                          className="w-full text-xs border border-indigo-300 rounded p-1 print:hidden"
                          rows={3}
                          value={row.description}
                          autoFocus
                          onChange={e => onDescriptionChange(i, e.target.value)}
                          onBlur={() => setEditingMapel(null)}
                        />
                      ) : (
                        <p
                          className="cursor-pointer hover:bg-indigo-50 rounded px-1 -mx-1 print:cursor-default"
                          onClick={() => setEditingMapel(i)}
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

            {/* C. EKSTRAKURIKULER */}
            {ekstrakurikulerRows.length > 0 && (
              <>
                <p className="font-bold text-sm mb-2 border-b border-black pb-0.5">C. EKSTRAKURIKULER</p>
                <table className="w-full border-collapse text-sm mb-4">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-400 px-2 py-1.5 w-8">No.</th>
                      <th className="border border-slate-400 px-2 py-1.5 text-left w-40">Ekstrakurikuler</th>
                      <th className="border border-slate-400 px-2 py-1.5 w-28 text-center">Predikat</th>
                      <th className="border border-slate-400 px-2 py-1.5 text-left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ekstrakurikulerRows.map((row, i) => (
                      <tr key={i}>
                        <td className="border border-slate-400 px-2 py-1.5 text-center text-xs">{i + 1}</td>
                        <td className="border border-slate-400 px-2 py-1.5 text-xs">{row.name}</td>
                        <td className="border border-slate-400 px-2 py-1.5 text-center text-xs">{row.predicate}</td>
                        <td className="border border-slate-400 px-2 py-1.5 text-xs">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* D. CATATAN */}
            {catatan && (
              <>
                <p className="font-bold text-sm mb-2 border-b border-black pb-0.5">D. CATATAN</p>
                <p className="text-sm mb-4">{catatan}</p>
              </>
            )}

            {/* E. KEHADIRAN */}
            <p className="font-bold text-sm mb-2 border-b border-black pb-0.5">E. CATATAN KEHADIRAN</p>
            <div className="text-sm mb-6">
              <p>Ketidakhadiran</p>
              <div className="ml-4 space-y-0.5">
                <p>- Sakit : {attendance.sakit} hari</p>
                <p>- Izin : {attendance.izin} hari</p>
                <p>- Tanpa Keterangan : {attendance.alpha} hari</p>
              </div>
            </div>

            {/* TTD */}
            <div className="grid grid-cols-2 gap-8 text-sm mt-6">
              <div className="text-center">
                <p>Orang Tua/Wali</p>
                <div className="h-16" />
                <p>.................................</p>
              </div>
              <div className="text-center">
                <p>{tempatTTD}, {tanggalTTD}</p>
                <p className="mt-1">Guru Kelas</p>
                <div className="h-16" />
                <p className="font-semibold">{homeroomTeacher || '.................................'}</p>
                {homeroomNip && <p>NIP. {homeroomNip}</p>}
              </div>
            </div>
            <div className="text-center text-sm mt-8">
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <div className="h-16" />
              <p className="font-semibold">{principalName || '.................................'}</p>
              {principalNip && <p>NIP. {principalNip}</p>}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
