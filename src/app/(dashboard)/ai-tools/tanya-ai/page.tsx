'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, Send, Trash2, Bot, User, Sparkles } from 'lucide-react'

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
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col justify-between">
      {/* Header Panel */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/ai-tools" className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 bg-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Tanya AI
          </h1>
        </div>

        {messages.length > 0 && (
          <button 
            onClick={clearChat} 
            className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 flex items-center gap-1.5 text-xs py-1.5 px-3 font-semibold"
          >
            <Trash2 className="w-4 h-4" /> Bersihkan Percakapan
          </button>
        )}
      </div>

      {/* Bagian Area Chat */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 text-slate-400">
            <Bot className="w-12 h-12 text-slate-300 mb-3 animate-bounce" />
            <h3 className="font-bold text-slate-800 text-sm">Ada yang bisa dibantu hari ini?</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Tanyakan rincian silabus, penjelasan konsep, rincian soal, atau materi pembelajaran secara langsung.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Balon Chat */}
                <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none font-medium' : 'bg-slate-50 border border-slate-150 text-slate-800 rounded-tl-none font-medium'}`}>
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>
              </div>
            ))}

            {/* Animasi Loading Response */}
            {loading && (
              <div className="flex gap-3 max-w-[80%] mr-auto">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
                </div>
              </div>
            )}

            {/* Tampilan Penanganan Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-150 text-red-700 text-xs rounded-xl max-w-sm mx-auto text-center">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Formulir Obrolan */}
      <form onSubmit={handleSend} className="flex gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Tanyakan topik, materi, atau rancangan pembelajaran Anda di sini..."
          disabled={loading}
          className="input flex-1 bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm py-2.5 h-[44px] rounded-xl font-medium text-slate-800 shadow-sm placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="btn-primary py-2.5 px-4 h-[44px] rounded-xl flex items-center justify-center shrink-0 shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

const Page = dynamic(() => Promise.resolve(TanyaAIChat), { ssr: false })
export default Page