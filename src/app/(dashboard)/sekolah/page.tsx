'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Save, GraduationCap, Calendar, CheckCircle } from 'lucide-react'

interface SchoolProfile {
  name: string
  npsn: string
  address: string
  principal: string
  phone: string
  accreditation: string
}

export default function SekolahPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<SchoolProfile>({
    name: '', npsn: '', address: '', principal: '', phone: '', accreditation: 'A',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Stats from actual data
  const [stats, setStats] = useState({ students: 0, classes: 0, grades: 0, attendance: 0 })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile from localStorage (simple MVP approach)
      const stored = localStorage.getItem(`school_profile_${user.id}`)
      if (stored) {
        try { setProfile(JSON.parse(stored)) } catch {}
      }

      // Load real stats
      const [{ count: students }, { count: classes }, { count: grades }, { count: attendance }] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('grades').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      setStats({
        students: students ?? 0,
        classes: classes ?? 0,
        grades: grades ?? 0,
        attendance: attendance ?? 0,
      })

      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    localStorage.setItem(`school_profile_${user.id}`, JSON.stringify(profile))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sekolah</h1>
        <p className="text-sm text-slate-500 mt-0.5">Kelola informasi profil sekolah dan tahun ajaran</p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Siswa', value: stats.students, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Kelas', value: stats.classes, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Data Nilai', value: stats.grades, color: 'text-purple-600 bg-purple-50' },
          { label: 'Data Absensi', value: stats.attendance, color: 'text-amber-600 bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color.split(' ')[0]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Profil Sekolah */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">Profil Sekolah</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Nama Sekolah</label>
              <input className="input" placeholder="SMP Negeri 1 ..." value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">NPSN</label>
                <input className="input" placeholder="12345678" value={profile.npsn}
                  onChange={e => setProfile({ ...profile, npsn: e.target.value })} />
              </div>
              <div>
                <label className="label">Akreditasi</label>
                <select className="input" value={profile.accreditation}
                  onChange={e => setProfile({ ...profile, accreditation: e.target.value })}>
                  <option>A</option>
                  <option>B</option>
                  <option>C</option>
                  <option>Belum Terakreditasi</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Alamat</label>
              <input className="input" placeholder="Jl. Pendidikan No. 1" value={profile.address}
                onChange={e => setProfile({ ...profile, address: e.target.value })} />
            </div>
            <div>
              <label className="label">Nama Kepala Sekolah</label>
              <input className="input" placeholder="Drs. ..." value={profile.principal}
                onChange={e => setProfile({ ...profile, principal: e.target.value })} />
            </div>
            <div>
              <label className="label">Nomor Telepon</label>
              <input className="input" placeholder="021-..." value={profile.phone}
                onChange={e => setProfile({ ...profile, phone: e.target.value })} />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`btn-primary w-full justify-center ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            >
              {saved ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</> : <><Save className="w-4 h-4" /> Simpan Profil</>}
            </button>
          </div>
        </div>

        {/* Tahun Ajaran */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">Tahun Ajaran</h2>
          </div>
          <div className="space-y-3">
            {[
              { year: '2024/2025', semester: 'Semester Genap', active: true },
              { year: '2024/2025', semester: 'Semester Ganjil', active: false },
              { year: '2023/2024', semester: 'Semester Genap', active: false },
            ].map((ta, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                ta.active ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'
              }`}>
                <div>
                  <p className="text-sm font-medium text-slate-900">{ta.year}</p>
                  <p className="text-xs text-slate-500">{ta.semester}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  ta.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {ta.active ? 'Aktif' : 'Selesai'}
                </span>
              </div>
            ))}
          </div>

          {/* Pengaturan Dokumen */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Pengaturan Dokumen</h3>
            </div>
            <div className="space-y-2 text-sm">
              {[
                'Header laporan nilai',
                'Format raport',
                'Cap & tanda tangan',
              ].map(item => (
                <div key={item} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">{item}</span>
                  <button className="text-xs text-emerald-600 hover:underline">Atur</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
