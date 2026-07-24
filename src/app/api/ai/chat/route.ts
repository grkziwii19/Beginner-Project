import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
const supabase = await createServerSupabaseClient()

  // 1. Autentikasi User
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

  // 2. Cek Limit Tanya AI (Maks 30 pesan/hari bagi Free User)
  if (!isAdmin) {
    const { data: usage } = await supabase
      .from('ai_usage_logs')
      .select('request_count')
      .eq('user_id', user.id)
      .eq('feature_name', 'tanya_ai')
      .eq('date', today)
      .single()

    if (usage && usage.request_count >= 30) {
      return NextResponse.json({
        error: 'Limit Tanya AI Anda hari ini sudah habis. Silakan coba lagi besok.'
      }, { status: 429 })
    }
  }

  try {
    const { message, history } = await req.json()

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: 'Anda adalah asisten pengajar yang ramah dan cerdas bernama GR Assistant. Bantu guru menjawab pertanyaan mengenai penyusunan materi, pembahasan soal, tata bahasa Jepang, dan penjelasan konsep pendidikan dengan ringkas, akurat, dan mudah dipahami.'
    })

    // Konversi riwayat lokal ke format Gemini API Chat
    const chatSession = model.startChat({
      history: history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      }))
    })

    const result = await chatSession.sendMessage(message)
    const replyText = result.response.text()

    // 3. Catat Log Penggunaan Tanya AI
    if (!isAdmin) {
      const { data: existingLog } = await supabase
        .from('ai_usage_logs')
        .select('id, request_count')
        .eq('user_id', user.id)
        .eq('feature_name', 'tanya_ai')
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
            feature_name: 'tanya_ai',
            request_count: 1,
            date: today
          })
      }
    }

    return NextResponse.json({ reply: replyText })
  } catch (error: any) {
    console.error('Gemini Chat Error:', error)
    return NextResponse.json({ error: 'Gagal mengirim pesan ke AI.' }, { status: 500 })
  }
}