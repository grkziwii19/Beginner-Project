'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Award, CheckCircle2, Circle, BookOpen, ArrowRight, Construction } from 'lucide-react'
import Link from 'next/link'

interface ClassCheck {
  id: string
  name: string
  studentCount: number
  hasSubjects: boolean
}

export default function NilaiPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState<ClassCheck[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) { if (!cancelled) setError('Sesi tidak valid.'); return }

        const [{ data: classData }, { data: students }] = await Promise.all([
          supabase.from('classes').select('id, name, subjects').eq('user_id', user.id).order('name'),
          supabase.from('students').select('id, class_name').eq('user_id', user.id),
        ])

        const result: ClassCheck[] = (classData ?? []).map(c => ({
          id: c.id,
          name: c.name,
          studentCount: (students ?? []).filter(s => s.class_name === c.name).length,
          hasSubjects: Array.isArray(c.subjects) && c.subjects.length > 0,
        }))

        if (!cancelled) setClasses(result)
      } catch (err) {
        console.error(err)
        if (!cancelled) setError('Gagal memuat data kelas.')
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

  const hasAnyClass = classes.length > 0
  const hasAnyClassWithStudents = classes.some(c => c.studentCount > 0)
  const hasAnyClassWithSubjects = classes.some(c => c.hasSubjects)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nilai</h1>
        <p className="text-sm text-slate-500 mt-0.5">Penilaian berbasis Tugas — buat tugas, lalu input nilai per siswa.</p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
            <Construction className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Fitur Nilai Berbasis Tugas Sedang Disiapkan</h2>
            <p className="text-sm text-slate-500">Lengkapi langkah berikut agar fitur ini dapat digunakan.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            {hasAnyClass ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className={`text-sm font-medium ${hasAnyClass ? 'text-slate-700' : 'text-slate-500'}`}>Buat minimal 1 kelas</p>
              {!hasAnyClass && (
                <Link href="/data-siswa" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 mt-1">
                  Buat kelas sekarang <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            {hasAnyClassWithStudents ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className={`text-sm font-medium ${hasAnyClassWithStudents ? 'text-slate-700' : 'text-slate-500'}`}>Tambahkan siswa ke kelas</p>
              {hasAnyClass && !hasAnyClassWithStudents && (
                <Link href="/data-siswa" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 mt-1">
                  Tambah siswa <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            {hasAnyClassWithSubjects ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className={`text-sm font-medium ${hasAnyClassWithSubjects ? 'text-slate-700' : 'text-slate-500'}`}>Tambahkan mata pelajaran ke kelas</p>
              {hasAnyClass && !hasAnyClassWithSubjects ? (
                <Link href="/data-siswa" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 mt-1">
                  Atur mata pelajaran <ArrowRight className="w-3 h-3" />
                </Link>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5">Mata pelajaran diatur di halaman Data Siswa, saat menambah kelas.</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
            <Circle className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-700">Fitur "Buat Tugas/Penilaian" sedang dikembangkan</p>
              <p className="text-xs text-indigo-500 mt-0.5">Bagian ini akan tersedia pada update berikutnya — Anda akan bisa membuat tugas, lalu input nilai per siswa untuk tugas tersebut.</p>
            </div>
          </div>
        </div>
      </div>

      {classes.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Status Kesiapan Kelas</h3>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Kelas</th>
                <th className="table-header">Siswa</th>
                <th className="table-header">Mata Pelajaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-cell font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-400" /> {c.name}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={c.studentCount > 0 ? 'text-emerald-600' : 'text-slate-400'}>{c.studentCount} siswa</span>
                  </td>
                  <td className="table-cell">
                    <span className={c.hasSubjects ? 'text-emerald-600' : 'text-slate-400'}>
                      {c.hasSubjects ? 'Sudah diatur' : 'Belum diatur'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
