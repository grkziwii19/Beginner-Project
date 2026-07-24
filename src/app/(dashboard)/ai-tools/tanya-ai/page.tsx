'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, Send, Trash2, Bot, User, Sparkles, HelpCircle, AlertCircle } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
}

function TanyaAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll otomatis ke bagian pesan terbawah
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Menangani Pengiriman Pesan
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || loading) return

    setError('')
    const userMsgText = inputText.trim()
    setInputText('')

    // 1. Tambah Pesan User ke State Lokal
    const newHistory: ChatMessage[] = [...messages, { role: 'user', text: userMsgText }]
    setMessages(newHistory)
    setLoading(true)

    try {
      // 2. Kirim ke API Route Next.js
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsgText,
          history: messages // Mengirimkan riwayat percakapan untuk konteks Gemini
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan pengiriman.')
      }

      // 3. Tambah Balasan AI ke State Lokal
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }])
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke AI.')
    } finally {
      setLoading(false)
    }
  }

  // Mengosongkan riwayat percakapan secara lokal
  const clearChat = () => {
    setMessages([])
    setError('')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-[calc(100vh-120px)] flex flex-col justify-between gap-4">
      {/* HEADER PANEL */}
      <div className="flex items-center justify-between shrink-0 pb-3 border-b border-slate-150">
        <div className="flex items-center gap-3.5">
          <Link 
            href="/ai-tools" 
            className="inline-flex items-center justify-center p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl border border-slate-200 bg-white transition-all shadow-sm active:scale-95"
            title="Kembali ke AI Tools"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Tanya AI Assistant
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Asisten pengajaran pribadi Anda untuk materi, silabus, dan ide kelas.</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button 
            onClick={clearChat} 
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50/40 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all active:scale-95 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" /> Bersihkan Chat
          </button>
        )}
      </div>

      {/* AREA PERCAKAPAN */}
      <div className="flex-1 min-h-0 bg-slate-50/40 border border-slate-200 rounded-2xl shadow-inner overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12 space-y-5">
            <div className="p-4 bg-white border border-slate-150 text-indigo-600 rounded-2xl shadow-sm">
              <Bot className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-slate-900 text-base">Ada yang bisa saya bantu hari ini?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tanyakan penjelasan materi, rancangan strategi pembelajaran interaktif, referensi soal HOTS, atau topik pengajaran lainnya.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full pt-4">
              <div className="bg-white border border-slate-150 p-3 rounded-xl text-left text-xs text-slate-650 hover:border-indigo-300 hover:bg-indigo-50/10 cursor-pointer transition-all" onClick={() => setInputText('Berikan ide kegiatan interaktif untuk mengajar materi siklus air di kelas 5 SD.')}>
                💡 &quot;Berikan ide kegiatan interaktif siklus air...&quot;
              </div>
              <div className="bg-white border border-slate-150 p-3 rounded-xl text-left text-xs text-slate-650 hover:border-indigo-300 hover:bg-indigo-50/10 cursor-pointer transition-all" onClick={() => setInputText('Buat rancangan rubrik penilaian untuk tugas proyek praktik IPA.')}>
                📊 &quot;Buat rancangan rubrik penilaian tugas proyek...&quot;
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border ${
                  m.role === 'user' 
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                  {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Balon Chat */}
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none font-semibold shadow-sm shadow-indigo-100' 
                    : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-none font-medium shadow-sm'
                }`}>
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>
              </div>
            ))}

            {/* Animasi Loading Response */}
            {loading && (
              <div className="flex gap-3 max-w-[80%] mr-auto">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 bg-white border border-slate-200/80 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
                </div>
              </div>
            )}

            {/* Tampilan Penanganan Error */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-150 text-rose-800 text-xs font-semibold rounded-xl max-w-sm mx-auto text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* INPUT FORMULIR OBROLAN */}
      <form onSubmit={handleSend} className="flex gap-3 shrink-0 pb-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Tanyakan topik, materi, atau rancangan pembelajaran Anda di sini..."
          disabled={loading}
          className="flex-1 bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm px-4 h-[48px] rounded-xl font-semibold text-slate-800 shadow-sm placeholder:text-slate-400 outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-650 hover:bg-indigo-600 w-12 h-[48px] text-white shadow-sm hover:shadow transition-all duration-200 active:scale-95 shrink-0 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

const Page = dynamic(() => Promise.resolve(TanyaAIChat), { ssr: false })
export default Page