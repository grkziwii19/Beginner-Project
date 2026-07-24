import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  // 1. Autentikasi User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }

  // Ambil profil untuk cek apakah admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const today = new Date().toISOString().split('T')[0]

  // 2. Cek Limit Harian (Kecuali Admin)
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
    const { method, contextText, promptText, questionType, count, difficulty, language, standard } = await req.json()

    // Ambil maksimal soal yang boleh di-generate per request (max 50 untuk free user)
    const safeCount = Math.min(count || 10, isAdmin ? 100 : 50)

    let promptSystem = `Anda adalah asisten pembuat soal ujian profesional. Tugas Anda adalah membuat kumpulan soal berkualitas tinggi sebanyak ${safeCount} soal.
Bahasa soal wajib menggunakan bahasa: ${language || 'Indonesia'}.
Tingkat kesulitan soal: ${difficulty || 'Sedang'}.
Tipe soal wajib berupa: ${questionType || 'pilihan_ganda'}.
Standar kurikulum/ujian (jika ada): ${standard || 'Umum'}.

Format output wajib berupa ARRAY JSON murni dari objek soal sesuai dengan jenis tipe soal berikut, jangan sertakan teks pembuka atau markdown lainnya di luar array JSON:

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
]`

    let userContent = ''
    if (method === 'upload') {
      userContent = `Buatlah soal-soal tersebut HANYA berdasarkan isi teks modul berikut. Jangan gunakan pengetahuan umum Anda di luar modul ini:
---
${contextText}
---`
    } else {
      userContent = `Gunakan instruksi manual berikut sebagai sumber acuan pembuatan soal: "${promptText}"`
    }

    // 3. Panggil Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json', // Memaksa output berupa JSON valid
      }
    })

    // Cukup kirim string langsung
    const result = await model.generateContent(`${promptSystem}\n\n${userContent}`)

    const responseText = result.response.text()
    const questionsData = JSON.parse(responseText)

    // 4. Catat Log Penggunaan
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