'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Student, type Grade, type GradeType, getPredicate, getPredicateColor } from '@/types'
import { Plus, Trash2, Award, X, ChevronDown, ChevronUp } from 'lucide-react'

const GRADE_TYPES: GradeType[] = ['tugas', 'uts', 'uas', 'proyek']
const TYPE_LABELS: Record<GradeType, string> = { tugas: 'Tugas', uts: 'UTS', uas: 'UAS', proyek: 'Proyek' }
const TYPE_COLORS: Record<GradeType, string> = {
  tugas:  'bg-sky-50 text-sky-700',
  uts:    'bg-violet-50 text-violet-700',
  uas:    'bg-orange-50 text-orange-700',
  proyek: 'bg-pink-50 text-pink-700',
}

interface StudentWithGrades extends Student {
  grades: Grade[]
  avg: number
}

export default function GradesPage() {
  const supabase = createClient()
  const [studentsWithGrades, setStudentsWithGrades] = useState<StudentWithGrades[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterClass, setFilterClass] = useState('Semua')
  const [form, setForm] = useState({ student_id: '', subject: 'Umum', type: 'tugas' as GradeType, score: '' })
  const [saving, setSaving] = useState(false)

  const classes = ['Semua', ...Array.from(new Set(studentsWithGrades.map(s => s.class_name))).sort()]

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: studentsData }, { data: gradesData }] = await Promise.all([
      supabase.from('students').select('*').eq('user_id', user.id).order('class_name').order('name'),
      supabase.from('grades').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])

    const combined: StudentWithGrades[] = (studentsData ?? []).map(s => {
      const sg = (gradesData ?? []).filter(g => g.student_id === s.id)
      const avg = sg.length ? Math.round(sg.reduce((a, g) => a + g.score, 0) / sg.length) : 0
      return { ...s, grades: sg, avg }
    })

    setStudentsWithGrades(combined)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    if (!form.student_id || !form.score) return
    const score = parseFloat(form.score)
    if (isNaN(score) || score < 0 || score > 100) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('grades').insert({
      user_id: user.id,
      student_id: form.student_id,
      subject: form.subject || 'Umum',
      type: form.type,
      score,
    })
    await fetchData()
    setShowModal(false)
    setSaving(false)
    setForm({ student_id: '', subject: 'Umum', type: 'tugas', score: '' })
  }

  const handleDelete = async (gradeId: string) => {
    await supabase.from('grades').delete().eq('id', gradeId)
    await fetchData()
  }

  const filtered = filterClass === 'Semua'
    ? studentsWithGrades
    : studentsWithGrades.filter(s => s.class_name === filterClass)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Nilai</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola nilai tugas, UTS, UAS, dan proyek</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Tambah Nilai
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500 font-medium">Filter Kelas:</span>
        <select className="input w-auto" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          {classes.map(c => <option key={c}>{c}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} siswa</span>
      </div>

      {/* Student list */}
      <div className="space-y-3">
        {loading ? (
          <div className="card p-10 text-center text-slate-400 text-sm">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Belum ada siswa. Tambahkan di menu Data Siswa.</p>
          </div>
        ) : (
          filtered.map(s => {
            const isExpanded = expanded === s.id
            const pred = s.avg > 0 ? getPredicate(s.avg) : null
            return (
              <div key={s.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : s.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold text-sm shrink-0">
                    {s.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.class_name} · {s.grades.length} nilai</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {pred ? (
                      <>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">{s.avg}</p>
                          <p className="text-xs text-slate-400">rata-rata</p>
                        </div>
                        <span className={`badge ${getPredicateColor(pred)} text-xs px-2.5 py-1`}>{pred}</span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400">Belum ada nilai</span>
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4">
                    {s.grades.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-2">
                        Belum ada nilai. Klik "Tambah Nilai" untuk mengisi.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {GRADE_TYPES.filter(t => s.grades.some(g => g.type === t)).map(type => (
                          <div key={type}>
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-1.5">{TYPE_LABELS[type]}</p>
                            <div className="flex flex-wrap gap-2">
                              {s.grades.filter(g => g.type === type).map(g => (
                                <div key={g.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${TYPE_COLORS[type]}`}>
                                  <span className="font-medium text-sm">{g.score}</span>
                                  {g.subject !== 'Umum' && <span className="text-xs opacity-70">{g.subject}</span>}
                                  <button onClick={() => handleDelete(g.id)} className="opacity-50 hover:opacity-100">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add Grade Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Tambah Nilai</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Siswa</label>
                <select className="input" value={form.student_id}
                  onChange={e => setForm({ ...form, student_id: e.target.value })}>
                  <option value="">-- Pilih Siswa --</option>
                  {studentsWithGrades.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.class_name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Mata Pelajaran</label>
                <input className="input" placeholder="Contoh: Matematika, IPA, ..." value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div>
                <label className="label">Jenis Nilai</label>
                <div className="flex gap-2 flex-wrap">
                  {GRADE_TYPES.map(t => (
                    <button key={t}
                      onClick={() => setForm({ ...form, type: t })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        form.type === t
                          ? `${TYPE_COLORS[t]} border-transparent`
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Nilai (0 – 100)</label>
                <input type="number" min="0" max="100" className="input" placeholder="85"
                  value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Menyimpan...' : 'Simpan Nilai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
