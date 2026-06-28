'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type ClassItem } from '@/types'
import { getNarasi, generateRaporDocx, downloadDocx, type RaporSiswa } from '@/lib/rapor/generateRapor'
import RaporPreview, { type RaporPreviewProps } from '@/components/rapor/RaporPreview'
import {
  ChevronDown, FileDown, Loader2, CheckCircle2, Pencil, Save, X, Eye,
} from 'lucide-react'

const SEMESTER_OPTIONS = [
  { value: '1', label: 'I (Ganjil)' },
  { value: '2', label: 'II (Genap)' },
]

const SIKAP_DIMENSI = [
  'Beriman, Bertakwa Kepada Tuhan YME, dan Berakhlak Mulia',
  'Berkebinekaan Global',
  'Bergotong-Royong',
  'Mandiri',
  'Bernalar Kritis',
  'Kreatif',
]

function getAcademicYear() {
  const y = new Date().getFullYear()
  return new Date().getMonth() + 1 >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

interface StudentRow {
  id: string
  name: string
  nis: string
  nisn?: string | null
  address?: string | null
  hasGrades: boolean
  gradeCount: number
}

interface DetailState {
  student: StudentRow
  catatan: string
  sakit: string
  izin: string
  tanpaKeterangan: string
  sikap: { dimensi: string; penjelasan: string }[]
  ekskul: { nama: string; predikat: string; keterangan: string }[]
  saving: boolean
}

// State untuk RaporPreview
interface PreviewState {
  props: Omit<RaporPreviewProps, 'onDescriptionChange' | 'onSikapChange' | 'onClose'>
  mapelRows: { name: string; score: number | null; description: string }[]
  sikapRows: { dimensi: string; penjelasan: string }[]
}

export default function LaporanPage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [semester, setSemester] = useState('1')
  const [academicYear, setAcademicYear] = useState(getAcademicYear())
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)

  // Profil sekolah — bisa dibuat halaman settings tersendiri nanti
  const [schoolName, setSchoolName] = useState('SD .....................')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [principalName, setPrincipalName] = useState('')
  const [principalNip, setPrincipalNip] = useState('')
  const [showSchoolSettings, setShowSchoolSettings] = useState(false)

  const selectedClass = classes.find(c => c.id === selectedClassId) ?? null

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

  const loadStudents = useCallback(async () => {
    if (!selectedClass) { setStudents([]); return }
    setLoadingStudents(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: studentData }, { data: gradeData }] = await Promise.all([
      supabase.from('students').select('id, name, nis, nisn, address').eq('user_id', user.id).eq('class_name', selectedClass.name).order('name'),
      supabase.from('semester_grades').select('student_id').eq('user_id', user.id).eq('class_name', selectedClass.name).eq('semester', semester).eq('academic_year', academicYear),
    ])

    const gradeCount: Record<string, number> = {}
    for (const g of gradeData ?? []) gradeCount[g.student_id] = (gradeCount[g.student_id] ?? 0) + 1

    setStudents((studentData ?? []).map(s => ({
      id: s.id, name: s.name, nis: s.nis, nisn: s.nisn, address: s.address,
      hasGrades: (gradeCount[s.id] ?? 0) > 0,
      gradeCount: gradeCount[s.id] ?? 0,
    })))
    setLoadingStudents(false)
  }, [selectedClass, semester, academicYear])

  useEffect(() => { loadStudents() }, [loadStudents])

  // ── Ambil semua data rapor satu siswa ──
  const fetchRaporData = async (studentId: string) => {
    if (!selectedClass) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const student = students.find(s => s.id === studentId)
    if (!student) return null

    const [
      { data: gradeRows },
      { data: attitudeRows },
      { data: ekskulRows },
      { data: noteRow },
      { data: attendanceRows },
    ] = await Promise.all([
      supabase.from('semester_grades').select('subject, score').eq('student_id', studentId).eq('semester', semester).eq('academic_year', academicYear),
      supabase.from('semester_attitudes').select('dimension, description').eq('student_id', studentId).eq('semester', semester).eq('academic_year', academicYear),
      supabase.from('semester_extracurricular').select('name, predicate, notes').eq('student_id', studentId).eq('semester', semester).eq('academic_year', academicYear),
      supabase.from('semester_notes').select('catatan_guru, sakit, izin, tanpa_keterangan').eq('student_id', studentId).eq('semester', semester).eq('academic_year', academicYear).maybeSingle(),
      supabase.from('attendance').select('status').eq('student_id', studentId),
    ])

    const sakit = noteRow?.sakit ?? (attendanceRows ?? []).filter((a: any) => a.status === 'sakit').length
    const izin  = noteRow?.izin  ?? (attendanceRows ?? []).filter((a: any) => a.status === 'izin').length
    const alpha = noteRow?.tanpa_keterangan ?? (attendanceRows ?? []).filter((a: any) => a.status === 'alpha').length

    const subjectOrder = selectedClass.subjects ?? []
    const gradesSorted = [...(gradeRows ?? [])].sort((a, b) => {
      const ia = subjectOrder.indexOf(a.subject)
      const ib = subjectOrder.indexOf(b.subject)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })

    const sikapMap: Record<string, string> = {}
    for (const a of attitudeRows ?? []) sikapMap[a.dimension] = a.description ?? ''
    const sikap = SIKAP_DIMENSI.map(d => ({
      dimensi: d,
      penjelasan: sikapMap[d] || 'Peserta didik menunjukkan perkembangan yang baik dalam dimensi ini.',
    }))

    const semesterLabel = semester === '1' ? 'I (Ganjil)' : 'II (Genap)'
    const tanggalTTD = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    return {
      raporData: {
        nama: student.name, nis: student.nis, nisn: student.nisn,
        kelas: selectedClass.name, fase: 'B',
        sekolah: schoolName, alamat: student.address,
        semester, semesterLabel, tahunPelajaran: academicYear,
        waliKelas: selectedClass.homeroom_teacher ?? '-',
        nipWaliKelas: '',
        kepalaSekolah: principalName || 'Kepala Sekolah',
        nipKepalaSekolah: principalNip,
        tempatTTD: schoolAddress?.split(',')[0]?.trim() || '-',
        tanggalTTD,
        nilaiMapel: gradesSorted.map((g, i) => ({ no: i + 1, mapel: g.subject, nilai: Number(g.score) })),
        sikap,
        ekskul: (ekskulRows ?? []).map((e: any, i: number) => ({ no: i + 1, nama: e.name, predikat: e.predicate ?? '-', keterangan: e.notes ?? '' })),
        catatan: noteRow?.catatan_guru ?? null,
        sakit, izin, tanpaKeterangan: alpha,
      } as RaporSiswa,
      mapelRows: gradesSorted.map((g, i) => ({
        name: g.subject,
        score: Number(g.score),
        description: getNarasi(g.subject, Number(g.score)),
      })),
      sikapRows: sikap,
      ekskulRows: (ekskulRows ?? []).map((e: any) => ({ name: e.name, predicate: e.predicate ?? '-', note: e.notes ?? '' })),
      attendance: { sakit, izin, alpha },
      catatan: noteRow?.catatan_guru ?? '',
      student, semesterLabel,
      tanggalTTD,
    }
  }

  // ── Preview satu siswa ──
  const handlePreview = async (studentId: string) => {
    setGenerating(studentId + '_preview')
    setError('')
    try {
      const d = await fetchRaporData(studentId)
      if (!d) throw new Error('Data tidak ditemukan')
      setPreview({
        mapelRows: d.mapelRows,
        sikapRows: d.sikapRows,
        props: {
          studentName: d.student.name,
          nis: d.student.nis,
          nisn: d.student.nisn,
          className: selectedClass?.name ?? '',
          fase: 'B',
          schoolName,
          schoolAddress,
          semester,
          semesterLabel: d.semesterLabel,
          academicYear,
          mapelRows: d.mapelRows,
          sikapRows: d.sikapRows,
          ekstrakurikulerRows: d.ekskulRows,
          attendance: d.attendance,
          catatan: d.catatan,
          principalName,
          principalNip,
          homeroomTeacher: selectedClass?.homeroom_teacher ?? '-',
          homeroomNip: '',
          tempatTTD: schoolAddress?.split(',')[0]?.trim() || '-',
          tanggalTTD: d.tanggalTTD,
        },
      })
    } catch (e: any) {
      setError('Gagal memuat preview: ' + e.message)
    } finally {
      setGenerating(null)
    }
  }

  // ── Download Word langsung (tanpa preview) ──
  const handleDownloadSatu = async (studentId: string) => {
    setGenerating(studentId)
    setError('')
    try {
      const d = await fetchRaporData(studentId)
      if (!d) throw new Error('Data tidak ditemukan')
      const buf = await generateRaporDocx([d.raporData])
      downloadDocx(buf, `Rapor_${d.student.name}_${semester === '1' ? 'Ganjil' : 'Genap'}_${academicYear.replace('/', '-')}.docx`)
    } catch (e: any) {
      setError('Gagal generate rapor: ' + e.message)
    } finally {
      setGenerating(null)
    }
  }

  // ── Download Word semua siswa ──
  const handleDownloadSemua = async () => {
    setGenerating('all')
    setError('')
    try {
      const dataList: RaporSiswa[] = []
      for (const s of students.filter(s => s.hasGrades)) {
        const d = await fetchRaporData(s.id)
        if (d) dataList.push(d.raporData)
      }
      if (dataList.length === 0) throw new Error('Tidak ada data nilai')
      const buf = await generateRaporDocx(dataList)
      downloadDocx(buf, `Rapor_${selectedClass?.name ?? 'kelas'}_${semester === '1' ? 'Ganjil' : 'Genap'}_${academicYear.replace('/', '-')}.docx`)
    } catch (e: any) {
      setError('Gagal generate rapor: ' + e.message)
    } finally {
      setGenerating(null)
    }
  }

  // ── Buka modal detail ──
  const openDetail = async (student: StudentRow) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: noteRow }, { data: attRows }, { data: ekskulRows }] = await Promise.all([
      supabase.from('semester_notes').select('*').eq('student_id', student.id).eq('semester', semester).eq('academic_year', academicYear).maybeSingle(),
      supabase.from('semester_attitudes').select('dimension, description').eq('student_id', student.id).eq('semester', semester).eq('academic_year', academicYear),
      supabase.from('semester_extracurricular').select('*').eq('student_id', student.id).eq('semester', semester).eq('academic_year', academicYear),
    ])
    const sikapMap: Record<string, string> = {}
    for (const a of attRows ?? []) sikapMap[a.dimension] = a.description ?? ''
    setDetail({
      student,
      catatan: noteRow?.catatan_guru ?? '',
      sakit: String(noteRow?.sakit ?? ''),
      izin: String(noteRow?.izin ?? ''),
      tanpaKeterangan: String(noteRow?.tanpa_keterangan ?? ''),
      sikap: SIKAP_DIMENSI.map(d => ({ dimensi: d, penjelasan: sikapMap[d] ?? '' })),
      ekskul: (ekskulRows ?? []).map((e: any) => ({ nama: e.name, predikat: e.predicate ?? 'Baik', keterangan: e.notes ?? '' })),
      saving: false,
    })
  }

  const saveDetail = async () => {
    if (!detail || !selectedClass) return
    setDetail(prev => prev ? { ...prev, saving: true } : null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const base = { user_id: user.id, student_id: detail.student.id, class_name: selectedClass.name, semester, academic_year: academicYear }

    await supabase.from('semester_notes').upsert({
      ...base,
      catatan_guru: detail.catatan,
      sakit: Number(detail.sakit) || 0,
      izin: Number(detail.izin) || 0,
      tanpa_keterangan: Number(detail.tanpaKeterangan) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,semester,academic_year' })

    for (const s of detail.sikap) {
      if (!s.penjelasan.trim()) continue
      await supabase.from('semester_attitudes').upsert({
        ...base, dimension: s.dimensi, description: s.penjelasan, updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id,dimension,semester,academic_year' })
    }

    await supabase.from('semester_extracurricular').delete().eq('student_id', detail.student.id).eq('semester', semester).eq('academic_year', academicYear)
    for (const e of detail.ekskul) {
      if (!e.nama.trim()) continue
      await supabase.from('semester_extracurricular').insert({ ...base, name: e.nama, predicate: e.predikat, notes: e.keterangan })
    }

    setDetail(null)
    loadStudents()
  }

  const studentsWithGrades = students.filter(s => s.hasGrades).length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Laporan / Rapor</h1>
        <p className="text-sm text-slate-500 mt-0.5">Preview dan download rapor Kurikulum Merdeka format Word (.docx).</p>
      </div>

      {/* Pengaturan Sekolah */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Identitas Sekolah</p>
          <button onClick={() => setShowSchoolSettings(v => !v)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            {showSchoolSettings ? 'Tutup' : 'Edit'}
          </button>
        </div>
        {showSchoolSettings ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs mb-1">Nama Sekolah</label>
              <input className="input text-sm py-1.5" value={schoolName} onChange={e => setSchoolName(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs mb-1">Alamat Sekolah</label>
              <input className="input text-sm py-1.5" value={schoolAddress} onChange={e => setSchoolAddress(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs mb-1">Kepala Sekolah</label>
              <input className="input text-sm py-1.5" value={principalName} onChange={e => setPrincipalName(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs mb-1">NIP Kepala Sekolah</label>
              <input className="input text-sm py-1.5" value={principalNip} onChange={e => setPrincipalNip(e.target.value)} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">{schoolName}{principalName ? ` · KS: ${principalName}` : ''}</p>
        )}
      </div>

      {/* Filter */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="label text-xs mb-1">Kelas</label>
            <div className="relative">
              <select className="input appearance-none pr-9 text-sm py-1.5" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={loadingClasses}>
                <option value="">-- Pilih --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="w-36">
            <label className="label text-xs mb-1">Semester</label>
            <div className="relative">
              <select className="input appearance-none pr-9 text-sm py-1.5" value={semester} onChange={e => setSemester(e.target.value)}>
                {SEMESTER_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="w-36">
            <label className="label text-xs mb-1">Tahun Pelajaran</label>
            <input className="input text-sm py-1.5" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2024/2025" />
          </div>
          {studentsWithGrades > 0 && (
            <button onClick={handleDownloadSemua} disabled={generating === 'all'} className="btn-primary py-1.5 text-sm shrink-0">
              {generating === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Download Semua ({studentsWithGrades})
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      {!selectedClassId && <div className="card p-10 text-center text-slate-400 text-sm">Pilih kelas untuk melihat daftar siswa.</div>}
      {selectedClassId && loadingStudents && <div className="card p-10 text-center text-slate-400 text-sm">Memuat...</div>}
      {selectedClassId && !loadingStudents && students.length === 0 && <div className="card p-8 text-center text-slate-400 text-sm">Belum ada siswa di kelas ini.</div>}

      {students.length > 0 && !loadingStudents && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Daftar Siswa</h3>
            <p className="text-xs text-slate-400 mt-0.5">{studentsWithGrades} dari {students.length} siswa memiliki nilai</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header w-8">No</th>
                <th className="table-header">Nama Siswa</th>
                <th className="table-header w-24">NIS</th>
                <th className="table-header w-28 text-center">Nilai</th>
                <th className="table-header w-52 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-cell text-slate-400 text-center">{i + 1}</td>
                  <td className="table-cell font-medium text-slate-900">{s.name}</td>
                  <td className="table-cell text-slate-500">{s.nis}</td>
                  <td className="table-cell text-center">
                    {s.hasGrades
                      ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />{s.gradeCount} mapel</span>
                      : <span className="text-xs text-slate-400">Belum ada</span>
                    }
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openDetail(s)} className="btn-secondary text-xs px-2 py-1">
                        <Pencil className="w-3.5 h-3.5" /> Detail
                      </button>
                      {s.hasGrades && (
                        <>
                          <button
                            onClick={() => handlePreview(s.id)}
                            disabled={generating === s.id + '_preview'}
                            className="btn-secondary text-xs px-2 py-1"
                          >
                            {generating === s.id + '_preview' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                            Preview
                          </button>
                          <button
                            onClick={() => handleDownloadSatu(s.id)}
                            disabled={generating === s.id}
                            className="btn-primary text-xs px-2 py-1"
                          >
                            {generating === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                            Word
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Detail ── */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <h2 className="font-semibold text-slate-900">Detail Rapor — {detail.student.name}</h2>
              <button onClick={() => setDetail(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Kehadiran */}
              <div>
                <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Kehadiran</h3>
                <div className="grid grid-cols-3 gap-3">
                  {([['sakit', 'Sakit (hari)'], ['izin', 'Izin (hari)'], ['tanpaKeterangan', 'Tanpa Ket.']] as const).map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
                      <input type="number" min={0} className="input text-sm" value={(detail as any)[key]} onChange={e => setDetail(prev => prev ? { ...prev, [key]: e.target.value } : null)} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Catatan */}
              <div>
                <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Catatan Wali Kelas</h3>
                <textarea className="input text-sm min-h-[72px] resize-none" value={detail.catatan} onChange={e => setDetail(prev => prev ? { ...prev, catatan: e.target.value } : null)} placeholder="Tulis catatan untuk siswa ini..." />
              </div>
              {/* Sikap */}
              <div>
                <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Sikap — Profil Pelajar Pancasila</h3>
                <div className="space-y-2">
                  {detail.sikap.map((s, i) => (
                    <div key={s.dimensi}>
                      <label className="text-xs text-slate-500 mb-1 block">{s.dimensi}</label>
                      <input className="input text-sm" value={s.penjelasan} onChange={e => setDetail(prev => { if (!prev) return null; const sikap = [...prev.sikap]; sikap[i] = { ...sikap[i], penjelasan: e.target.value }; return { ...prev, sikap } })} placeholder="Penjelasan sikap..." />
                    </div>
                  ))}
                </div>
              </div>
              {/* Ekskul */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Ekstrakurikuler</h3>
                  <button onClick={() => setDetail(prev => prev ? { ...prev, ekskul: [...prev.ekskul, { nama: '', predikat: 'Baik', keterangan: '' }] } : null)} className="text-xs text-indigo-600 font-medium">+ Tambah</button>
                </div>
                {detail.ekskul.length === 0 && <p className="text-xs text-slate-400">Belum ada.</p>}
                {detail.ekskul.map((e, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                    <input className="input text-sm" value={e.nama} onChange={ev => setDetail(prev => { if (!prev) return null; const ekskul = [...prev.ekskul]; ekskul[i] = { ...ekskul[i], nama: ev.target.value }; return { ...prev, ekskul } })} placeholder="Nama ekskul" />
                    <select className="input text-sm" value={e.predikat} onChange={ev => setDetail(prev => { if (!prev) return null; const ekskul = [...prev.ekskul]; ekskul[i] = { ...ekskul[i], predikat: ev.target.value }; return { ...prev, ekskul } })}>
                      <option>Sangat Baik</option><option>Baik</option><option>Cukup</option>
                    </select>
                    <div className="flex gap-1">
                      <input className="input text-sm flex-1" value={e.keterangan} onChange={ev => setDetail(prev => { if (!prev) return null; const ekskul = [...prev.ekskul]; ekskul[i] = { ...ekskul[i], keterangan: ev.target.value }; return { ...prev, ekskul } })} placeholder="Keterangan" />
                      <button onClick={() => setDetail(prev => prev ? { ...prev, ekskul: prev.ekskul.filter((_, j) => j !== i) } : null)} className="p-2 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100 shrink-0">
              <button onClick={() => setDetail(null)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={saveDetail} disabled={detail.saving} className="btn-primary flex-1 justify-center">
                {detail.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RaporPreview Modal ── */}
      {preview && (
        <RaporPreview
          {...preview.props}
          mapelRows={preview.mapelRows}
          sikapRows={preview.sikapRows}
          onDescriptionChange={(idx, val) => setPreview(prev => {
            if (!prev) return null
            const mapelRows = [...prev.mapelRows]
            mapelRows[idx] = { ...mapelRows[idx], description: val }
            return { ...prev, mapelRows, props: { ...prev.props, mapelRows } }
          })}
          onSikapChange={(idx, val) => setPreview(prev => {
            if (!prev) return null
            const sikapRows = [...prev.sikapRows]
            sikapRows[idx] = { ...sikapRows[idx], penjelasan: val }
            return { ...prev, sikapRows, props: { ...prev.props, sikapRows } }
          })}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
