'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, MessageSquare, ShieldCheck, RefreshCw, ChevronRight, HelpCircle } from 'lucide-react'

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
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 animate-fade-in">
      {/* HEADER SECTION */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kecerdasan Buatan (AI)</h1>
        <p className="text-sm sm:text-base text-slate-550 mt-1 max-w-3xl leading-relaxed">
          Gunakan kecerdasan buatan untuk membantu mempersiapkan bahan ajar, menyusun silabus latihan soal, dan memecahkan kendala pengajaran langsung di kelas.
        </p>
      </div>

      {/* GRID MENU FITUR AI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Menu: Buat Soal AI */}
        <div className="group bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">Buat Soal AI</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Rancang paket latihan soal terstruktur berdasarkan dokumen modul (PDF, DOCX, TXT) atau lewat instruksi spesifik Anda sendiri.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <Link 
              href="/ai-tools/buat-soal" 
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-650 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-indigo-600 transition-all w-full active:scale-[0.98]"
            >
              Mulai Buat Soal <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Menu: Tanya AI */}
        <div className="group bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:scale-105 transition-transform duration-300">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">Tanya AI</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Diskusikan materi ajar sulit, rancangan metode ajar interaktif, atau buat silabus modul pembelajaran dengan asisten AI kustom Anda.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <Link 
              href="/ai-tools/tanya-ai" 
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-500 transition-all w-full active:scale-[0.98]"
            >
              Buka Chat Tanya AI <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* STATUS BATAS PENGGUNAAN */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-slate-900 text-sm">Status Limit Penggunaan Harian</h4>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-slate-400 cursor-pointer" />
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-950 p-2 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 text-center shadow">
                Kouta harian di-reset otomatis setiap tengah malam.
              </span>
            </div>
          </div>
          <button 
            onClick={fetchUsage} 
            className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-250 hover:bg-slate-50 text-slate-550 transition-all active:scale-95 shadow-sm"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2.5 text-sm text-slate-400 py-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-200 border-t-indigo-650" />
            <span>Memuat informasi penggunaan harian...</span>
          </div>
        ) : isAdmin ? (
          <div className="flex items-center gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-indigo-800 text-sm">
            <ShieldCheck className="w-5 h-5 shrink-0 text-indigo-600" />
            <span className="font-bold">Akun Admin: Anda memiliki hak akses tak terbatas ke seluruh layanan AI Tools.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-150 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-450 uppercase tracking-wider">Pembuatan Soal</span>
                <span className="text-xs font-bold text-slate-500">{usageLogs.generate_soal} / 5 kali</span>
              </div>
              <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((usageLogs.generate_soal / 5) * 100, 100)}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Batas maksimum penggunaan adalah 5 kali pemrosesan per hari.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-150 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-455 uppercase tracking-wider">Tanya AI (Pesan)</span>
                <span className="text-xs font-bold text-slate-500">{usageLogs.tanya_ai} / 30 pesan</span>
              </div>
              <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((usageLogs.tanya_ai / 30) * 100, 100)}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Batas maksimum penggunaan adalah 30 pesan asisten per hari.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const AIToolsPage = dynamic(() => Promise.resolve(AIToolsDashboard), { ssr: false })
export default AIToolsPage