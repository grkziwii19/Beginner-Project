'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type ClassItem } from '@/types'
import { Plus, X, BookOpen, Search, Star } from 'lucide-react'
import Link from 'next/link'

interface ClassWithStats extends ClassItem {
  studentCount: number
  avgScore: number
}

const emptyForm = { name: '', homeroom_teacher: '', room: '', schedule_days: '' }

export default function ClassesPage() {
  const supabase = createClient()
  const [classes, setClasses] = useState<ClassWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'semua' | 'milik' | 'arsip'>('semua')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  const fetchClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const [{ data: classData }, { data: students }, { data: grades }] = await Promise.all([
      supabase.from('classes').select('*').eq('user_id', user.id).order('name'),
      supabase.from('students').select('id, class_name').eq('user_id', user.id),
      supabase.from('grades').select('student_id, score'),
    ])

    const withStats: ClassWithStats[] = (classData ?? []).map(c => {
      const studentIds = (students ?? []).filter(s => s.class_name === c.name).map(s => s.id)
      const studentCount = studentIds.length
      const classGrades = (grades ?? []).filter(g => studentIds.includes(g.student_id))
      const avgScore = classGrades.length
        ? Math.round(classGrades.reduce((a, g) => a + Number(g.score), 0) / classGrades.length)
        : 0
      return { ...c, studentCount, avgScore }
    })

    setClasses(withStats)
    setLoading(false)
  }

  useEffect(() => { fetchClasses() }, [])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('classes').insert({
      name: form.name.trim(),
      homeroom_teacher: form.homeroom_teacher.trim() || null,
      room: form.room.trim() || null,
      schedule_days: form.schedule_days.trim() || null,
      status: 'aktif',
      user_id: user.id,
    })

    await fetchClasses()
    setShowModal(false)
    setSaving(false)
    setForm(emptyForm)
  }

  const filtered = classes.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchTab =
      tab === 'semua' ? true :
      tab === 'arsip' ? c.status === 'arsip' :
      c.status === 'aktif'
    return matchSearch && matchTab
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daftar Kelas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manajemen seluruh kelas dan rombongan belajar sekolah Anda.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Tambah Kelas Baru
        </button>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200">
        <div className="flex gap-6">
          {[
            { id: 'semua', label: 'Semua Kelas' },
            { id: 'milik', label: 'Kelas Saya' },
            { id: 'arsip', label: 'Arsip' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9 w-56"
            placeholder="Cari kelas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Class grid */}
      {loading ? (
        <div className="card p-10 text-center text-slate-400 text-sm">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c => (
            <Link
              key={c.id}
              href={`/classes/${c.id}`}
              className="card p-5 hover:shadow-md hover:border-indigo-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  c.status === 'aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {c.status === 'aktif' ? 'Aktif' : 'Arsip'}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{c.homeroom_teacher || 'Belum ada wali kelas'}</p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-400">Siswa</p>
                  <p className="text-sm font-semibold text-slate-800">{c.studentCount}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-400">Ruang</p>
                  <p className="text-sm font-semibold text-slate-800">{c.room || '-'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">{c.schedule_days || 'Jadwal belum diatur'}</span>
                {c.avgScore > 0 && (
                  <span className="flex items-center gap-1 text-sm font-medium text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {c.avgScore}
                  </span>
                )}
              </div>
            </Link>
          ))}

          {/* Add new card */}
          <button
            onClick={() => setShowModal(true)}
            className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 p-5 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors min-h-[180px]"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <Plus className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-sm font-medium text-slate-500">Tambah Kelas</span>
          </button>
        </div>
      )}

      {!loading && filtered.length === 0 && classes.length > 0 && (
        <div className="card p-10 text-center">
          <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Tidak ada kelas yang cocok dengan filter.</p>
        </div>
      )}

      {/* Add Class Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Tambah Kelas Baru</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Nama Kelas</label>
                <input className="input" placeholder="Contoh: 7A, X IPA 1" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div>
                <label className="label">Wali Kelas</label>
                <input className="input" placeholder="Nama wali kelas" value={form.homeroom_teacher}
                  onChange={e => setForm({ ...form, homeroom_teacher: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Ruang</label>
                  <input className="input" placeholder="101" value={form.room}
                    onChange={e => setForm({ ...form, room: e.target.value })} />
                </div>
                <div>
                  <label className="label">Hari Jadwal</label>
                  <input className="input" placeholder="Senin, Rabu" value={form.schedule_days}
                    onChange={e => setForm({ ...form, schedule_days: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
