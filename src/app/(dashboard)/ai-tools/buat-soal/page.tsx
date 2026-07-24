'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import mammoth from 'mammoth'
import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import {
  ArrowLeft, FileText, UploadCloud, HelpCircle,
  Settings2, Sparkles, Download, Database, CheckCircle2, AlertTriangle,
  ChevronDown, BookOpen, Layers, Info, Trash2
} from 'lucide-react'
import Link from 'next/link'

interface Question {
  type: string
  question: string
  options?: string[]
  correct_answer: string
  explanation?: string
  rubric?: string
  pairs?: { left: string; right: string }[]
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_TEXT_CHARS = 45000

const GRADE_OPTIONS = [
  { value: 'PAUD', label: 'PAUD' },
  { value: 'I', label: 'I (SD)' },
  { value: 'II', label: 'II (SD)' },
  { value: 'III', label: 'III (SD)' },
  { value: 'IV', label: 'IV (SD)' },
  { value: 'V', label: 'V (SD)' },
  { value: 'VI', label: 'VI (SD)' },
  { value: 'VII', label: 'VII (SMP)' },
  { value: 'VIII', label: 'VIII (SMP)' },
  { value: 'IX', label: 'IX (SMP)' },
  { value: 'X', label: 'X (SMA)' },
  { value: 'XI', label: 'XI (SMA)' },
  { value: 'XII', label: 'XII (SMA)' },
]

function BuatSoalAI() {
  const supabase = createClient()

  const [method, setMethod] = useState<'upload' | 'prompt'>('prompt')
  const [fileText, setFileText] = useState('')
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null)
  const [promptText, setPromptText] = useState('')

  // Konfigurasi soal
  const [grade, setGrade] = useState('I')
  const [questionType, setQuestionType] = useState('pilihan_ganda')
  const [count, setCount] = useState(10)
  const [difficulty, setDifficulty] = useState('Sedang')
  const [language, setLanguage] = useState('Indonesia')
  const [standard, setStandard] = useState('Umum')

  // State proses
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [successMsg, setSuccessMsg] = useState('')

  const finalizeExtractedText = (text: string) => {
    if (!text.trim()) {
      setError('Dokumen yang Anda unggah kosong atau tidak ada teks yang bisa dibaca.')
      setFileText('')
      return
    }
    if (text.length > MAX_TEXT_CHARS) {
      setFileText(text.slice(0, MAX_TEXT_CHARS))
      setError(`Dokumen terlalu panjang, hanya ${MAX_TEXT_CHARS.toLocaleString()} karakter pertama yang dipakai. Untuk modul panjang, sebaiknya generate per-bab.`)
    } else {
      setFileText(text)
      setError('')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setFileText('')
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      setError(`Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal 10 MB.`)
      return
    }

    setFileInfo({ name: file.name, size: file.size })

    try {
      if (file.type === 'text/plain') {
        const text = await file.text()
        finalizeExtractedText(text)

      } else if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()

        const buffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          fullText += content.items.map((item: any) => item.str).join(' ') + '\n'
        }
        if (!fullText.trim()) {
          setError('Tidak ada teks yang bisa diambil dari PDF ini (kemungkinan hasil scan/gambar, bukan teks asli).')
          return
        }
        finalizeExtractedText(fullText)

      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const buffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer: buffer })
        finalizeExtractedText(result.value)

      } else {
        setError('Format tidak didukung. Harap unggah file .txt, .pdf, atau .docx.')
      }
    } catch (err) {
      console.error(err)
      setError('Gagal membaca dokumen. Pastikan file tidak rusak.')
    }
  }

  const handleGenerate = async () => {
    setError('')
    setSuccessMsg('')
    setQuestions([])

    if (method === 'upload' && !fileText) {
      setError('Harap unggah dokumen modul belajar terlebih dahulu.')
      return
    }
    if (method === 'prompt' && !promptText.trim()) {
      setError('Harap masukkan rincian instruksi pembuatan soal terlebih dahulu.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          contextText: fileText,
          promptText,
          questionType,
          count,
          difficulty,
          language,
          standard,
          grade
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan sistem.')
      }

      setQuestions(data.questions)
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke modul AI.')
    } finally {
      setLoading(false)
    }
  }

  const downloadJSON = () => {
    if (questions.length === 0) return
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `soal_ai_${questionType}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const downloadPDF = () => {
    if (questions.length === 0) return
    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.height
    const marginLeft = 15
    const maxWidth = 180
    let y = 20

    doc.setFontSize(14)
    doc.text('Kumpulan Soal', marginLeft, y)
    y += 10
    doc.setFontSize(11)

    const checkPageBreak = (lines: number) => {
      if (y + lines * 6 > pageHeight - 20) {
        doc.addPage()
        y = 20
      }
    }

    questions.forEach((q, idx) => {
      const questionLines = doc.splitTextToSize(`${idx + 1}. ${q.question}`, maxWidth)
      checkPageBreak(questionLines.length)
      doc.text(questionLines, marginLeft, y)
      y += questionLines.length * 6 + 2

      if (q.options?.length) {
        q.options.forEach(opt => {
          const optLines = doc.splitTextToSize(opt, maxWidth - 5)
          checkPageBreak(optLines.length)
          doc.text(optLines, marginLeft + 5, y)
          y += optLines.length * 6
        })
        y += 2
      }

      if (q.pairs?.length) {
        q.pairs.forEach(p => {
          checkPageBreak(1)
          doc.text(`${p.left}  <->  ${p.right}`, marginLeft + 5, y)
          y += 6
        })
        y += 2
      }

      doc.setFont('helvetica', 'bold')
      const ansLines = doc.splitTextToSize(`Kunci Jawaban: ${q.correct_answer}`, maxWidth)
      checkPageBreak(ansLines.length)
      doc.text(ansLines, marginLeft, y)
      y += ansLines.length * 6
      doc.setFont('helvetica', 'normal')

      if (q.explanation) {
        const expLines = doc.splitTextToSize(`Pembahasan: ${q.explanation}`, maxWidth)
        checkPageBreak(expLines.length)
        doc.text(expLines, marginLeft, y)
        y += expLines.length * 6
      }
      if (q.rubric) {
        const rubLines = doc.splitTextToSize(`Kriteria Penilaian: ${q.rubric}`, maxWidth)
        checkPageBreak(rubLines.length)
        doc.text(rubLines, marginLeft, y)
        y += rubLines.length * 6
      }

      y += 6
    })

    doc.save(`soal_ai_${questionType}.pdf`)
  }

  const downloadDOCX = async () => {
    if (questions.length === 0) return

    const children: Paragraph[] = [
      new Paragraph({ text: 'Kumpulan Soal', heading: HeadingLevel.HEADING_1 })
    ]

    questions.forEach((q, idx) => {
      children.push(new Paragraph({
        children: [new TextRun({ text: `${idx + 1}. ${q.question}`, bold: true })],
        spacing: { before: 200 }
      }))

      q.options?.forEach(opt => {
        children.push(new Paragraph({ text: opt, indent: { left: 400 } }))
      })

      q.pairs?.forEach(p => {
        children.push(new Paragraph({ text: `${p.left}  ↔  ${p.right}`, indent: { left: 400 } }))
      })

      children.push(new Paragraph({
        children: [new TextRun({ text: `Kunci Jawaban: ${q.correct_answer}`, bold: true, color: '15803d' })],
        spacing: { before: 100 }
      }))

      if (q.explanation) {
        children.push(new Paragraph({ text: `Pembahasan: ${q.explanation}` }))
      }
      if (q.rubric) {
        children.push(new Paragraph({ text: `Kriteria Penilaian: ${q.rubric}` }))
      }
    })

    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soal_ai_${questionType}.docx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleSaveToBank = async () => {
    setError('')
    setSuccessMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesi login Anda kedaluwarsa.')
      return
    }

    const title = method === 'prompt' ? promptText.slice(0, 50) : `Hasil Unggahan Modul (${fileInfo?.name || 'Modul'})`

    const { error: saveError } = await supabase
      .from('bank_soal')
      .insert({
        user_id: user.id,
        title: title || 'Soal Buatan AI',
        questions: questions
      })

    if (saveError) {
      setError('Gagal menyimpan soal ke Bank Soal.')
    } else {
      setSuccessMsg('Kumpulan soal berhasil disimpan secara permanen di Bank Soal Anda!')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* HEADER BAR */}
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
        <Link 
          href="/ai-tools" 
          className="inline-flex items-center justify-center p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200/80 bg-white transition-all shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">Pembuat Soal AI</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Rancang bank soal berkualitas tinggi berbasis kurikulum modern dalam hitungan detik.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: CONFIGURATION PANEL */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Settings2 className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Sumber & Metode</h3>
            </div>

            {/* SEGMENTED CONTROL */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setMethod('prompt')}
                className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                  method === 'prompt' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                Manual Prompt
              </button>
              <button
                type="button"
                onClick={() => setMethod('upload')}
                className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                  method === 'upload' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                Upload Modul
              </button>
            </div>

            {/* INPUT METHOD: PROMPT OR UPLOAD */}
            {method === 'prompt' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-450 uppercase tracking-wider">Rincian Instruksi Pembuatan</label>
                <textarea
                  className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl p-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none min-h-[140px]"
                  placeholder='Contoh: "Buat 10 soal IPA kelas 5 SD bab 2 tentang siklus air dengan pendekatan HOTS..."'
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Unggah Dokumen Modul</label>
                <div className="border-2 border-dashed border-slate-250 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all rounded-xl p-6 text-center bg-slate-50/50 cursor-pointer relative group">
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-indigo-600 transition-colors mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-750">Pilih dokumen Anda</p>
                  <p className="text-xs text-slate-400 mt-1">Mendukung .txt, .pdf, .docx — maks 10 MB</p>
                </div>

                {fileInfo && (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{fileInfo.name}</p>
                      <p className="text-[10px] text-indigo-500 font-semibold">{(fileInfo.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONFIGURATION OPTIONS */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">Kelas</label>
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-slate-250 hover:border-slate-450 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-3 pr-8 py-2 text-sm font-bold text-slate-800 appearance-none cursor-pointer h-10"
                      value={grade}
                      onChange={e => setGrade(e.target.value)}
                    >
                      {GRADE_OPTIONS.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">Tipe Soal</label>
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-slate-250 hover:border-slate-450 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-3 pr-8 py-2 text-sm font-bold text-slate-800 appearance-none cursor-pointer h-10"
                      value={questionType}
                      onChange={e => setQuestionType(e.target.value)}
                    >
                      <option value="pilihan_ganda">Pilihan Ganda</option>
                      <option value="essay">Essay</option>
                      <option value="true_false">Benar / Salah</option>
                      <option value="fill_in_the_blank">Isi Bagian Rumpang</option>
                      <option value="matching">Menjodohkan (Matching)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">Jumlah Soal</label>
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-slate-250 hover:border-slate-450 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-3 pr-8 py-2 text-sm font-bold text-slate-800 appearance-none cursor-pointer h-10"
                      value={count}
                      onChange={e => setCount(Number(e.target.value))}
                    >
                      <option value={5}>5 Soal</option>
                      <option value={10}>10 Soal</option>
                      <option value={20}>20 Soal</option>
                      <option value={50}>50 Soal</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">Tingkat Kesulitan</label>
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-slate-250 hover:border-slate-450 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-3 pr-8 py-2 text-sm font-bold text-slate-800 appearance-none cursor-pointer h-10"
                      value={difficulty}
                      onChange={e => setDifficulty(e.target.value)}
                    >
                      <option value="Mudah">Mudah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Sulit">Sulit</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">Bahasa</label>
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-slate-250 hover:border-slate-450 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-3 pr-8 py-2 text-sm font-bold text-slate-800 appearance-none cursor-pointer h-10"
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                    >
                      <option value="Indonesia">Indonesia</option>
                      <option value="Inggris">Inggris</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">Standar Kurikulum</label>
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-slate-250 hover:border-slate-455 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-3 pr-8 py-2 text-sm font-bold text-slate-800 appearance-none cursor-pointer h-10"
                      value={standard}
                      onChange={e => setStandard(e.target.value)}
                    >
                      <option value="Umum">Kurikulum Umum</option>
                      <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
                      <option value="Kurikulum 2013">Kurikulum 2013</option>
                      <option value="AKM">AKM (Asesmen Kompetensi Minimum)</option>
                      <option value="Ujian Sekolah">Ujian Sekolah</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-150 hover:bg-indigo-500 hover:shadow transition-all duration-200 active:scale-[0.98] w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles className="w-4 h-4 animate-pulse" /> 
              {loading ? 'Sedang Merancang...' : 'Mulai Generate Soal'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW & ACTION PANEL */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-800 text-sm animate-fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[500px] flex flex-col justify-between p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <h3 className="font-extrabold text-slate-900 text-base">Pratinjau Hasil Soal</h3>
                {questions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={downloadPDF} 
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button 
                      onClick={downloadDOCX} 
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" /> DOCX
                    </button>
                    <button 
                      onClick={downloadJSON} 
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-250 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" /> JSON
                    </button>
                    <button 
                      onClick={handleSaveToBank} 
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-650 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-650/90 transition-all active:scale-95"
                    >
                      <Database className="w-3.5 h-3.5" /> Simpan ke Bank Soal
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-4">
                  <div className="animate-spin rounded-full h-9 w-9 border-2 border-slate-200 border-t-indigo-600" />
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">Menghubungkan asisten Gemini AI...</p>
                    <p className="text-xs text-slate-400">Harap tunggu, proses ini memerlukan waktu sekitar 10-20 detik.</p>
                  </div>
                </div>
              ) : questions.length === 0 ? (
                <div className="py-24 text-center max-w-sm mx-auto space-y-4">
                  <div className="p-4 bg-slate-50 text-slate-450 border border-slate-100 rounded-2xl inline-block">
                    <HelpCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-base">Hasil Soal Belum Tergenerate</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Konfigurasikan preferensi jenis soal, kelas, dan instruksi Anda di panel sebelah kiri, kemudian klik tombol generate.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2 divide-y divide-slate-100">
                  {questions.map((q, idx) => (
                    <div key={idx} className={`pt-5 ${idx === 0 ? 'pt-0' : ''} space-y-3`}>
                      <div className="flex gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-xs shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="font-bold text-slate-900 text-sm leading-relaxed">
                          {q.question}
                        </p>
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5 hover:bg-slate-100/55 transition-colors">
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.pairs && q.pairs.length > 0 && (
                        <div className="space-y-2 pl-9">
                          {q.pairs.map((p, pIdx) => (
                            <div key={pIdx} className="text-xs text-slate-700 flex items-center gap-3 bg-slate-50 border border-slate-150 rounded-lg p-2 max-w-md">
                              <span className="font-extrabold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded">[{p.left}]</span>
                              <span className="text-slate-400">↔</span>
                              <span className="font-semibold text-slate-800">{p.right}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ANSWER & EXPLANATION KEY */}
                      <div className="pl-9">
                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 space-y-2 text-xs">
                          <p className="text-emerald-800 font-extrabold flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Kunci Jawaban: {q.correct_answer}
                          </p>
                          {q.explanation && (
                            <p className="text-slate-600 leading-relaxed">
                              <span className="font-bold text-slate-700 block mb-0.5">Pembahasan:</span> {q.explanation}
                            </p>
                          )}
                          {q.rubric && (
                            <p className="text-slate-600 leading-relaxed">
                              <span className="font-bold text-slate-700 block mb-0.5">Kriteria Penilaian:</span> {q.rubric}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {questions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 p-3 rounded-xl">
                <Info className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                <span>
                  Hasil di atas disimpan sementara dalam memori lokal halaman. Pastikan klik <strong>Simpan ke Bank Soal</strong> agar tersimpan permanen.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const Page = dynamic(() => Promise.resolve(BuatSoalAI), { ssr: false })
export default Page