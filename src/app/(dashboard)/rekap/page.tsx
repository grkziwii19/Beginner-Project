'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileBarChart, CheckCircle2, Circle, ArrowRight, Construction, ClipboardCheck, Award } from 'lucide-react'
import Link from 'next/link'

export default function RekapPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasClasses, setHasClasses] = useState(false)
  const [hasAttendance, setHasAttendance] = useState(false)
  const [hasGrades, setHasGrades] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) { if (!cancelled) setError('Sesi tidak valid.'); return }

        const [{ count: classCount }, { count: attCount }, { count: gradeCount }] = await Promise.all([
          supabase.from('classes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('grades').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ])

        if (!cancelled) {
          setHasClasses((classCount ?? 0) > 0)
          setHasAttendance((attCount ?? 0) > 0)
          setHasGrades((gradeCount ?? 0) > 0)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) setError('Gagal memuat data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat...</div>
  }

  const ready = hasClasses && hasAttendance

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rekap</h1>
        <p className="text-sm text-slate-500 mt-0.5">Rekap absensi dan nilai per kelas, serta progress kelas.</p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
            <Construction className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Rekap Lengkap Sedang Disiapkan</h2>
            <p className="text-sm text-slate-500">Lengkapi data berikut agar Rekap dapat ditampilkan dengan akurat.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            {hasClasses ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className={`text-sm font-medium ${hasClasses ? 'text-slate-700' : 'text-slate-500'}`}>Memiliki minimal 1 kelas dengan siswa</p>
              {!hasClasses && (
                <Link href="/kelas" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 mt-1">
                  Buat kelas <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            {hasAttendance ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className={`text-sm font-medium ${hasAttendance ? 'text-slate-700' : 'text-slate-500'}`}>Memiliki data absensi</p>
              {hasClasses && !hasAttendance && (
                <Link href="/kelas" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 mt-1">
                  Mulai input absensi <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            {hasGrades ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className={`text-sm font-medium ${hasGrades ? 'text-slate-700' : 'text-slate-500'}`}>Memiliki data nilai (opsional untuk saat ini)</p>
              <p className="text-xs text-slate-400 mt-0.5">Rekap nilai berbasis Tugas akan aktif penuh setelah fitur Nilai selesai dikembangkan.</p>
            </div>
          </div>
        </div>

        {ready && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
              Data dasar sudah cukup. Rekap absensi sederhana dapat dilihat sementara melalui Detail Kelas → tab Absensi pada setiap kelas, sambil halaman Rekap terpusat ini disempurnakan.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-60">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-500">Rekap Absensi</h3>
          </div>
          <p className="text-xs text-slate-400">Akan menampilkan statistik kehadiran per kelas dan periode.</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-500">Rekap Nilai</h3>
          </div>
          <p className="text-xs text-slate-400">Akan menampilkan rata-rata dan ketuntasan per Tugas/Penilaian.</p>
        </div>
      </div>
    </div>
  )
}
