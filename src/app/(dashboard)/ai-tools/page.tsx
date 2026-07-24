'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, MessageSquare, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react'

function AIToolsDashboard() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [usageLogs, setUsageLogs] = useState({ generate_soal: 0, tanya_ai: 0 })

  const fetchUsage = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Ambil info role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setIsAdmin(profile?.role === 'admin')

    // Ambil log hari ini
    const today = new Date().toISOString().split('T')[0]
    const { data: logs } = await supabase
      .from('ai_usage_logs')
      .select('feature_name, request_count')
      .eq('user_id', user.id)
      .eq('date', today)

    const mapped = { generate_soal: 0, tanya_ai: 0 }
    logs?.forEach(l => {
      if (l.feature_name === 'generate_soal' || l.feature_name === 'tanya_ai') {
        // Tambahkan as 'generate_soal' | 'tanya_ai' di bawah ini
        mapped[l.feature_name as 'generate_soal' | 'tanya_ai'] = l.request_count
      }
    })
    setUsageLogs(mapped)
    setLoading(false)
  }

  useEffect(() => {
    fetchUsage()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-500">Gunakan kecerdasan buatan untuk membantu mempersiapkan bahan ajar dan menjawab kendala pengajaran Anda.</p>
      </div>

      {/* Grid Menu Fitur AI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Menu: Buat Soal AI */}
        <div className="card p-6 bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Buat Soal AI</h3>
            <p className="text-sm text-slate-500 mb-6">
              Buat latihan soal otomatis berdasarkan dokumen modul (PDF, DOCX, TXT) atau lewat instruksi manual Anda.
            </p>
          </div>
          <Link href="/ai-tools/buat-soal" className="btn-primary justify-center py-2.5 rounded-xl text-sm font-semibold shadow-sm w-full">
            Mulai Buat Soal
          </Link>
        </div>

        {/* Menu: Tanya AI */}
        <div className="card p-6 bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Tanya AI</h3>
            <p className="text-sm text-slate-500 mb-6">
              Diskusikan materi ajar, terjemahan bahasa Jepang, rincian soal, atau rancangan metode ajar interaktif dengan asisten AI.
            </p>
          </div>
          <Link href="/ai-tools/tanya-ai" className="btn-primary justify-center bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 py-2.5 rounded-xl text-sm font-semibold shadow-sm w-full">
            Buka Chat Tanya AI
          </Link>
        </div>
      </div>

      {/* Tampilan Penggunaan AI */}
      <div className="card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-900 text-sm">Status Batas Penggunaan AI Hari Ini</h4>
          <button onClick={fetchUsage} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Memuat info penggunaan...</p>
        ) : isAdmin ? (
          <div className="flex items-center gap-2 p-3.5 bg-indigo-50 border border-indigo-150 rounded-xl text-indigo-700 text-sm">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span className="font-semibold">Akun Admin: Anda memiliki akses tak terbatas ke semua fitur AI Tools.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-150">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pembuatan Soal</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-extrabold text-slate-900">{usageLogs.generate_soal}</span>
                <span className="text-xs font-semibold text-slate-400">/ 5 kali hari ini</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${Math.min((usageLogs.generate_soal / 5) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-150">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanya AI (Chat)</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-extrabold text-slate-900">{usageLogs.tanya_ai}</span>
                <span className="text-xs font-semibold text-slate-400">/ 30 pesan hari ini</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${Math.min((usageLogs.tanya_ai / 30) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const AIToolsPage = dynamic(() => Promise.resolve(AIToolsDashboard), { ssr: false })
export default AIToolsPage