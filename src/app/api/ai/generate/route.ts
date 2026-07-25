import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const ALLOWED_QUESTION_TYPES = ['pilihan_ganda', 'essay', 'true_false', 'fill_in_the_blank', 'matching']
const ALLOWED_DIFFICULTY = ['Mudah', 'Sedang', 'Sulit']
const ALLOWED_LANGUAGE = ['Indonesia', 'Inggris']
const ALLOWED_STANDARD = ['Umum', 'Kurikulum Merdeka', 'Kurikulum 2013', 'AKM', 'Ujian Sekolah']
const ALLOWED_GRADE = ['PAUD', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const ALLOWED_COUNT = [5, 10, 20, 50, 100]

const GRADE_LABELS: Record<string, string> = {
  PAUD: 'PAUD (usia dini)',
  I: 'Kelas I SD', II: 'Kelas II SD', III: 'Kelas III SD',
  IV: 'Kelas IV SD', V: 'Kelas V SD', VI: 'Kelas VI SD',
  VII: 'Kelas VII SMP', VIII: 'Kelas VIII SMP', IX: 'Kelas IX SMP',
  X: 'Kelas X SMA', XI: 'Kelas XI SMA', XII: 'Kelas XII SMA',
}

// ✅ Membersihkan simbol markdown (**, *, __, _, `, #) dari teks apa pun
function stripMarkdown(text: unknown): unknown {
  if (typeof text !== 'string') return text
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')   // **bold**
    .replace(/__(.*?)__/g, '$1')       // __bold__
    .replace(/\*(.*?)\*/g, '$1')       // *italic*
    .replace(/_(.*?)_/g, '$1')         // _italic_
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // `code`
    .replace(/#{1,6}\s?/g, '')         // # heading
    .replace(/\*/g, '')                // sisa tanda bintang lepas yang tidak berpasangan
    .trim()
}

// ✅ Menyapu bersih seluruh field teks dalam array soal, apa pun tipe soalnya
function sanitizeQuestions(questions: any[]): any[] {
  return questions.map((q) => ({
    ...q,
    question: stripMarkdown(q.question),
    correct_answer: stripMarkdown(q.correct_answer),
    explanation: q.explanation !== undefined ? stripMarkdown(q.explanation) : q.explanation,
    rubric: q.rubric !== undefined ? stripMarkdown(q.rubric) : q.rubric,
    options: Array.isArray(q.options) ? q.options.map((opt: string) => stripMarkdown(opt)) : q.options,
    pairs: Array.isArray(q.pairs)
      ? q.pairs.map((p: any) => ({
          left: stripMarkdown(p.left),
          right: stripMarkdown(p.right),
        }))
      : q.pairs,
  }))
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const today = new Date().toISOString().split('T')[0]

  if (!isAdmin) {
    const { data: usage } = await supabase
      .from('ai_usage_logs')
      .select('request_count')
      .eq('user_id', user.id)
      .eq('feature_name', 'generate_soal')
      .eq('date', today)
      .single()

    if (usage && usage.request_count >= 5) {
      return NextResponse.json({
        error: 'Limit AI hari ini sudah habis. Silakan coba lagi besok.'
      }, { status: 429 })
    }
  }

  try {
    const { method, contextText, promptText, questionType, count, difficulty, language, standard, grade } = await req.json()

    // ✅ Validasi ketat semua parameter — tolak sebelum sampai ke AI kalau ada nilai tak dikenal
    if (!ALLOWED_QUESTION_TYPES.includes(questionType)) {
      return NextResponse.json({ error: 'Tipe soal tidak valid.' }, { status: 400 })
    }
    if (!ALLOWED_DIFFICULTY.includes(difficulty)) {
      return NextResponse.json({ error: 'Tingkat kesulitan tidak valid.' }, { status: 400 })
    }
    if (!ALLOWED_LANGUAGE.includes(language)) {
      return NextResponse.json({ error: 'Bahasa tidak valid.' }, { status: 400 })
    }
    if (!ALLOWED_STANDARD.includes(standard)) {
      return NextResponse.json({ error: 'Standar tidak valid.' }, { status: 400 })
    }
    if (!ALLOWED_GRADE.includes(grade)) {
      return NextResponse.json({ error: 'Kelas tidak valid.' }, { status: 400 })
    }
    if (!ALLOWED_COUNT.includes(Number(count))) {
      return NextResponse.json({ error: 'Jumlah soal tidak valid.' }, { status: 400 })
    }
    if (method === 'upload' && contextText && contextText.length > 50000) {
      return NextResponse.json({
        error: 'Teks modul terlalu panjang. Maksimal ~50.000 karakter per generate.'
      }, { status: 400 })
    }

    const safeCount = Math.min(count, isAdmin ? 100 : 50)
    const gradeLabel = GRADE_LABELS[grade]

    let promptSystem = `Anda adalah asisten pembuat soal ujian profesional untuk jenjang pendidikan Indonesia (PAUD hingga SMA).

ATURAN WAJIB — jangan dilanggar dalam kondisi apa pun:
1. Buat TEPAT ${safeCount} soal — tidak boleh kurang, tidak boleh lebih.
2. SEMUA soal WAJIB bertipe "${questionType}" — jangan campur dengan tipe soal lain.
3. Tingkat kesulitan WAJIB konsisten "${difficulty}" untuk seluruh soal.
4. Bahasa soal WAJIB "${language}".
5. Soal harus mengikuti standar/kurikulum "${standard}".
6. Soal WAJIB disesuaikan dengan jenjang "${gradeLabel}" — sesuaikan kompleksitas bahasa, panjang kalimat, dan tingkat kesulitan konsep dengan usia dan kemampuan kognitif siswa di jenjang tersebut. Untuk PAUD/SD kelas awal gunakan bahasa sangat sederhana dan konkret; untuk SMA gunakan bahasa yang lebih akademis dan konsep lebih kompleks.
7. Untuk soal yang melibatkan notasi matematika (pangkat/eksponen, akar, pecahan, dan sejenisnya), WAJIB gunakan notasi matematika baku, JANGAN dieja dengan kata-kata. Contoh yang BENAR: "2³ × 2⁴" — contoh yang SALAH: "2 pangkat 3 dikali 2 pangkat 4". Gunakan karakter superskrip Unicode untuk pangkat (seperti ², ³, ⁴, ⁵, ⁶, ⁷, ⁸, ⁹, ⁰) atau notasi caret (misalnya 2^3) bila superskrip tidak tersedia. Untuk akar gunakan simbol "√" (misalnya "√16" bukan "akar dari 16"). Untuk pecahan gunakan bentuk "a/b" (misalnya "3/4" bukan "tiga per empat").
8. JANGAN PERNAH menggunakan format markdown apa pun — tidak boleh ada tanda bintang (*, **), garis bawah ganda (__), tanda pagar (#), atau tanda kutip siku backtick (\`). Tulis SEMUA teks (pertanyaan, opsi jawaban, kunci jawaban, pembahasan, rubrik) sebagai teks polos murni tanpa simbol pemformatan apa pun. Kalau ingin menekankan sebuah kata, cukup tulis apa adanya tanpa simbol.

Format output WAJIB berupa ARRAY JSON murni, jangan sertakan teks pembuka, penutup, atau markdown apa pun di luar array JSON tersebut.

Format sesuai tipe soal:

1. pilihan_ganda:
[
  {
    "type": "pilihan_ganda",
    "question": "teks pertanyaan",
    "options": ["A. opsi a", "B. opsi b", "C. opsi c", "D. opsi d"],
    "correct_answer": "A",
    "explanation": "pembahasan singkat"
  }
]

2. essay:
[
  {
    "type": "essay",
    "question": "teks pertanyaan",
    "correct_answer": "kunci jawaban yang diharapkan",
    "rubric": "rubrik penilaian kriteria nilai penuh"
  }
]

3. true_false:
[
  {
    "type": "true_false",
    "question": "pernyataan...",
    "correct_answer": "Benar" atau "Salah",
    "explanation": "penjelasan"
  }
]

4. fill_in_the_blank:
[
  {
    "type": "fill_in_the_blank",
    "question": "kalimat rumpang yang menggunakan [blank] untuk bagian kosong",
    "correct_answer": "kata pengisi jawaban"
  }
]

5. matching:
[
  {
    "type": "matching",
    "question": "instruksi pasangkan...",
    "pairs": [
      {"left": "item kiri 1", "right": "pasangan kanan 1"},
      {"left": "item kiri 2", "right": "pasangan kanan 2"}
    ]
  }
]

INGAT SEKALI LAGI: hasilkan TEPAT ${safeCount} soal, SEMUA bertipe "${questionType}", untuk jenjang ${gradeLabel}, gunakan notasi matematika baku (bukan dieja kata-kata) untuk pangkat/akar/pecahan, TANPA simbol markdown apa pun (tanpa **, tanpa *, tanpa __, tanpa #, tanpa backtick).`

    let userContent = ''
    if (method === 'upload') {
      userContent = `Buatlah soal-soal tersebut HANYA berdasarkan isi teks modul berikut. Jangan gunakan pengetahuan umum Anda di luar modul ini:
---
${contextText}
---`
    } else {
      userContent = `Gunakan instruksi manual berikut sebagai sumber acuan pembuatan soal: "${promptText}"`
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
      }
    })

    const result = await model.generateContent(`${promptSystem}\n\n${userContent}`)

    const responseText = result.response.text()
    let questionsData = JSON.parse(responseText)

    // ✅ Validasi hasil dari AI — pastikan benar-benar sesuai parameter yang diminta
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      return NextResponse.json({
        error: 'AI tidak menghasilkan format soal yang valid. Silakan coba generate ulang.'
      }, { status: 502 })
    }

    if (questionsData.length !== safeCount) {
      return NextResponse.json({
        error: `Jumlah soal yang dihasilkan AI tidak sesuai (diminta ${safeCount}, didapat ${questionsData.length}). Silakan coba generate ulang.`
      }, { status: 502 })
    }

    const invalidType = questionsData.some((q: any) => q.type !== questionType)
    if (invalidType) {
      return NextResponse.json({
        error: 'AI menghasilkan tipe soal yang tidak sesuai dengan permintaan. Silakan coba generate ulang.'
      }, { status: 502 })
    }

    // ✅ Bersihkan sisa simbol markdown yang mungkin masih terselip dari AI
    questionsData = sanitizeQuestions(questionsData)

    // 4. Catat Log Penggunaan (hanya setelah hasil dinyatakan valid)
    if (!isAdmin) {
      const { data: existingLog } = await supabase
        .from('ai_usage_logs')
        .select('id, request_count')
        .eq('user_id', user.id)
        .eq('feature_name', 'generate_soal')
        .eq('date', today)
        .single()

      if (existingLog) {
        await supabase
          .from('ai_usage_logs')
          .update({ request_count: existingLog.request_count + 1 })
          .eq('id', existingLog.id)
      } else {
        await supabase
          .from('ai_usage_logs')
          .insert({
            user_id: user.id,
            feature_name: 'generate_soal',
            request_count: 1,
            date: today
          })
      }
    }

    return NextResponse.json({ questions: questionsData })
  } catch (error: any) {
    console.error('Gemini Generate Error:', error)
    return NextResponse.json({ error: 'Gagal membuat soal. Coba periksa teks modul atau kurangi jumlah soal.' }, { status: 500 })
  }
}