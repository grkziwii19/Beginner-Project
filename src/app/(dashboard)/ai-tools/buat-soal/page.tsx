'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import mammoth from 'mammoth'
import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import {
  ArrowLeft, FileText, UploadCloud, HelpCircle,
  Settings2, Sparkles, Download, Database, CheckCircle2, AlertTriangle
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

function BuatSoalAI() {
  const supabase = createClient()

  const [method, setMethod] = useState<'upload' | 'prompt'>('prompt')
  const [fileText, setFileText] = useState('')
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null)
  const [promptText, setPromptText] = useState('')

  // Konfigurasi soal
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

  // Menerapkan batas panjang teks & memberi peringatan jika dipotong
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

  // Menangani pembacaan berkas TXT, PDF, dan DOCX di client-side
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

  // Generate Soal via Next.js API Route
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
          standard
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

  // Mengunduh Data Soal ke format JSON langsung dari Client
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

  // Mengunduh hasil soal ke format PDF
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

  // Mengunduh hasil soal ke format Word (.docx)
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

  // Menyimpan data hasil generate ke database Supabase secara aman
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ai-tools" className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 bg-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Buat Soal AI</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Input & Konfigurasi */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-600" /> Sumber & Metode
            </h3>

            {/* Switch metode */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setMethod('prompt')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${method === 'prompt' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Manual Prompt
              </button>
              <button
                type="button"
                onClick={() => setMethod('upload')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${method === 'upload' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Upload Modul
              </button>
            </div>

            {/* Form Input berdasarkan metode */}
            {method === 'prompt' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rincian Instruksi</label>
                <textarea
                  className="input min-h-[120px] text-sm py-2 bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full"
                  placeholder='Contoh: "Buat 10 soal IPA kelas 5 SD bab 2 tentang siklus air..."'
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Unggah Modul (.TXT / .PDF / .DOCX)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Klik untuk upload dokumen</p>
                  <p className="text-[10px] text-slate-400 mt-1">Mendukung .txt, .pdf, .docx — maks 10 MB</p>
                </div>
                {fileInfo && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{fileInfo.name}</p>
                      <p className="text-[10px] text-slate-400">{(fileInfo.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Konfigurasi detail */}
            <div className="space-y-3 pt-3 border-t border-slate-150">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipe Soal</label>
                <select
                  className="input bg-white border border-slate-300 rounded-lg text-sm h-[38px] w-full"
                  value={questionType}
                  onChange={e => setQuestionType(e.target.value)}
                >
                  <option value="pilihan_ganda">Pilihan Ganda</option>
                  <option value="essay">Essay</option>
                  <option value="true_false">Benar / Salah</option>
                  <option value="fill_in_the_blank">Isi Bagian Rumpang</option>
                  <option value="matching">Menjodohkan (Matching)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Jumlah Soal</label>
                  <select
                    className="input bg-white border border-slate-300 rounded-lg text-sm h-[38px] w-full"
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                  >
                    <option value={5}>5 Soal</option>
                    <option value={10}>10 Soal</option>
                    <option value={20}>20 Soal</option>
                    <option value={50}>50 Soal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tingkat</label>
                  <select
                    className="input bg-white border border-slate-300 rounded-lg text-sm h-[38px] w-full"
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                  >
                    <option value="Mudah">Mudah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Sulit">Sulit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Bahasa</label>
                  <select
                    className="input bg-white border border-slate-300 rounded-lg text-sm h-[38px] w-full"
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                  >
                    <option value="Indonesia">Indonesia</option>
                    <option value="Inggris">Inggris</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Standar</label>
                  <select
                    className="input bg-white border border-slate-300 rounded-lg text-sm h-[38px] w-full"
                    value={standard}
                    onChange={e => setStandard(e.target.value)}
                  >
                    <option value="Umum">Kurikulum Umum</option>
                    <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
                    <option value="Kurikulum 2013">Kurikulum 2013</option>
                    <option value="AKM">AKM (Asesmen Kompetensi Minimum)</option>
                    <option value="Ujian Sekolah">Ujian Sekolah</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary justify-center w-full py-2.5 rounded-xl text-sm font-semibold shadow-sm"
            >
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" /> {loading ? 'Sedang Membuat...' : 'Mulai Generate Soal'}
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Preview Hasil */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Penanganan Pesan Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-150 rounded-2xl flex items-start gap-2.5 text-red-700 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-start gap-2.5 text-emerald-700 text-sm animate-fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[400px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
                <h3 className="font-bold text-slate-900 text-sm">Pratinjau Soal Tergenerate</h3>
                {questions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={downloadPDF} className="btn-secondary py-1.5 px-3 text-xs font-semibold">
                      <Download className="w-3.5 h-3.5 mr-1" /> Unduh (.PDF)
                    </button>
                    <button onClick={downloadDOCX} className="btn-secondary py-1.5 px-3 text-xs font-semibold">
                      <Download className="w-3.5 h-3.5 mr-1" /> Unduh (.DOCX)
                    </button>
                    <button onClick={downloadJSON} className="btn-secondary py-1.5 px-3 text-xs font-semibold">
                      <Download className="w-3.5 h-3.5 mr-1" /> Unduh (.JSON)
                    </button>
                    <button onClick={handleSaveToBank} className="btn-primary py-1.5 px-3 text-xs font-semibold">
                      <Database className="w-3.5 h-3.5 mr-1" /> Simpan ke Bank Soal
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="py-20 text-center text-slate-400 text-sm">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
                  Mengontak Gemini AI... Mohon tunggu sebentar.
                </div>
              ) : questions.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <HelpCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">Hasil generate soal akan muncul di sini.</p>
                  <p className="text-xs text-slate-400 mt-1">Lakukan konfigurasi di sebelah kiri untuk memulai.</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                  {questions.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <p className="font-bold text-slate-900 text-sm">
                        {idx + 1}. {q.question}
                      </p>

                      {/* Tipe: Pilihan Ganda */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="text-xs font-medium text-slate-700">
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tipe: Matching (Pasangan) */}
                      {q.pairs && q.pairs.length > 0 && (
                        <div className="space-y-1.5 pl-4">
                          {q.pairs.map((p, pIdx) => (
                            <div key={pIdx} className="text-xs text-slate-700 flex gap-4">
                              <span className="font-bold text-slate-600">[{p.left}]</span>
                              <span>↔</span>
                              <span className="font-medium text-slate-800">{p.right}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-150 text-xs space-y-1 bg-white/60 p-2.5 rounded-lg">
                        <p className="text-emerald-700 font-bold">
                          Kunci Jawaban: {q.correct_answer}
                        </p>
                        {q.explanation && (
                          <p className="text-slate-600 font-medium">
                            <span className="font-bold text-slate-700">Pembahasan:</span> {q.explanation}
                          </p>
                        )}
                        {q.rubric && (
                          <p className="text-slate-600 font-medium">
                            <span className="font-bold text-slate-700">Kriteria Penilaian:</span> {q.rubric}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {questions.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-4 text-right">
                *Catatan: Data di atas disimpan dalam *state* lokal dan akan terhapus apabila di-generate ulang atau halaman ditutup tanpa menyimpannya ke Bank Soal.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const Page = dynamic(() => Promise.resolve(BuatSoalAI), { ssr: false })
export default Page