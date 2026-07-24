'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, Save, CheckCircle, Pencil, Users, BookOpen, GraduationCap,
  Award, FileText
} from 'lucide-react'
import clsx from 'clsx'

// Tab 'guru' telah dihapus agar fokus pada penggunaan guru personal
type SchoolTab = 'profil' | 'tahun' | 'dokumen'

interface SchoolProfileForm {
  name: string
  npsn: string
  nss: string
  address: string
  principalName: string
  principalNip: string
  phone: string
  email: string
  website: string
  accreditation: string
}

const emptyProfile: SchoolProfileForm = {
  name: '', npsn: '', nss: '', address: '', principalName: '', principalNip: '',
  phone: '', email: '', website: '', accreditation: 'A',
}

export default function SekolahPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<SchoolTab>('profil')
  const [profile, setProfile] = useState<SchoolProfileForm>(emptyProfile)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [stats, setStats] = useState({ students: 0, classes: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setLoading(false)
          return
        }

        const { data } = await supabase
          .from('school_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (data) {
          setProfile({
            name: data.name ?? '',
            npsn: data.npsn ?? '',
            nss: data.nss ?? '',
            address: data.address ?? '',
            principalName: data.principal_name ?? '',
            principalNip: data.principal_nip ?? '',
            phone: data.phone ?? '',
            email: data.email ?? '',
            website: data.website ?? '',
            accreditation: data.accreditation ?? 'A',
          })
        }

        const [{ count: students }, { count: classes }] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('classes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ])

        setStats({ students: students ?? 0, classes: classes ?? 0 })
      } catch (err: any) {
        console.error('Error loading school data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setError('')
    
    if (!profile.name || !profile.name.trim()) {
      setError('Nama Sekolah tidak boleh kosong.')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error: dbError } = await supabase.from('school_profiles').upsert({
      user_id: user.id,
      name: (profile.name || '').trim(),
      npsn: profile.npsn?.trim() || null,
      nss: profile.nss?.trim() || null,
      address: profile.address?.trim() || null,
      principal_name: profile.principalName?.trim() || null,
      principal_nip: profile.principalNip?.trim() || null,
      phone: profile.phone?.trim() || null,
      email: profile.email?.trim() || null,
      website: profile.website?.trim() || null,
      accreditation: profile.accreditation,
    })

    setSaving(false)

    if (dbError) {
      setError('Gagal menyimpan: ' + dbError.message)
      return
    }

    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  // List tab tanpa Data Guru
  const tabs = [
    { id: 'profil', label: 'Profil Sekolah' },
    { id: 'tahun', label: 'Tahun Ajaran' },
    { id: 'dokumen', label: 'Pengaturan Dokumen' },
  ] as const

  const profileDetails = [
    { key: 'NPSN', val: profile.npsn || '-', fullWidth: false },
    { key: 'NSS', val: profile.nss || '-', fullWidth: false },
    { key: 'Akreditasi', val: profile.accreditation, fullWidth: false },
    { key: 'Telepon', val: profile.phone || '-', fullWidth: false },
    { key: 'Kepala Sekolah', val: profile.principalName || '-', fullWidth: false },
    { key: 'NIP Kepala Sekolah', val: profile.principalNip || '-', fullWidth: false },
    { key: 'Email Sekolah', val: profile.email || '-', fullWidth: true },
    { key: 'Alamat Sekolah', val: profile.address || '-', fullWidth: true },
    { key: 'Website', val: profile.website || '-', fullWidth: true },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Informasi Sekolah</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Kelola profil institusi yang akan digunakan sebagai data resmi dokumen dan lembar rapor siswa.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profil Sekolah */}
      {tab === 'profil' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{profile.name || 'Nama Sekolah Belum Diatur'}</h2>
                  <p className="text-xs text-slate-400">NSS: {profile.nss || '-'}</p>
                </div>
              </div>
              <button onClick={() => setEditing(!editing)} className="btn-secondary text-xs">
                <Pencil className="w-3.5 h-3.5" /> {editing ? 'Batal' : 'Edit'}
              </button>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nama Sekolah</label>
                    <input className="input" value={profile.name || ''} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Contoh: SMAN 1 Sumarorong" />
                    <span className="text-[10px] text-slate-400 block mt-1">Dicetak pada bagian nama institusi di rapor</span>
                  </div>
                  <div>
                    <label className="label">NSS</label>
                    <input className="input" value={profile.nss || ''} onChange={e => setProfile({ ...profile, nss: e.target.value })} placeholder="12 digit nomor statistik" />
                  </div>
                  <div>
                    <label className="label">NPSN</label>
                    <input className="input" value={profile.npsn || ''} onChange={e => setProfile({ ...profile, npsn: e.target.value })} placeholder="8 digit nomor pokok" />
                  </div>
                  <div>
                    <label className="label">Akreditasi</label>
                    <select className="input" value={profile.accreditation || 'A'} onChange={e => setProfile({ ...profile, accreditation: e.target.value })}>
                      <option>A</option>
                      <option>B</option>
                      <option>C</option>
                      <option>Belum Terakreditasi</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Kepala Sekolah</label>
                    <input className="input" value={profile.principalName || ''} onChange={e => setProfile({ ...profile, principalName: e.target.value })} placeholder="Nama Lengkap & Gelar" />
                    <span className="text-[10px] text-slate-400 block mt-1">Dicetak pada lembar tanda tangan pengesahan rapor</span>
                  </div>
                  <div>
                    <label className="label">NIP Kepala Sekolah</label>
                    <input className="input" value={profile.principalNip || ''} onChange={e => setProfile({ ...profile, principalNip: e.target.value })} placeholder="NIP tanpa spasi" />
                    <span className="text-[10px] text-slate-400 block mt-1">Dicetak di bawah nama Kepala Sekolah</span>
                  </div>
                </div>
                <div>
                  <label className="label">Alamat Sekolah</label>
                  <input className="input" value={profile.address || ''} onChange={e => setProfile({ ...profile, address: e.target.value })} placeholder="Jalan, RT/RW, Desa/Kelurahan, Kecamatan, Kabupaten" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Telepon Sekolah</label>
                    <input className="input" value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="Nomor telepon resmi" />
                  </div>
                  <div>
                    <label className="label">Email Sekolah</label>
                    <input className="input" value={profile.email || ''} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="email@sekolah.sch.id" />
                  </div>
                </div>
                <div>
                  <label className="label">Website Resmi</label>
                  <input className="input" value={profile.website || ''} onChange={e => setProfile({ ...profile, website: e.target.value })} placeholder="www.sekolah.sch.id" />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <button onClick={handleSave} disabled={saving} className={`btn-primary w-full justify-center ${saved ? 'bg-emerald-600' : ''}`}>
                  {saved ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</> : <><Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Profil'}</>}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {profileDetails.map(item => (
                  <div 
                    key={item.key} 
                    className={clsx(
                      "bg-slate-50 rounded-lg px-3 py-2.5", 
                      item.fullWidth && "md:col-span-2"
                    )}
                  >
                    <p className="text-xs text-slate-400 uppercase font-semibold">{item.key}</p>
                    <p className="font-medium text-slate-800 mt-0.5">{item.val}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {[
              { label: 'Total Guru', value: 1, icon: Users, color: 'bg-purple-50 text-purple-600' },
              { label: 'Total Kelas', value: stats.classes, icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Total Siswa', value: stats.students, icon: GraduationCap, color: 'bg-indigo-50 text-indigo-600' },
              { label: 'Akreditasi', value: profile.accreditation, icon: Award, color: 'bg-amber-50 text-amber-600' },
            ].map(s => {
              const IconComponent = s.icon
              return (
                <div key={s.label} className="card p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{s.value}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tahun Ajaran */}
      {tab === 'tahun' && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Tahun Ajaran</h2>
          <div className="space-y-3">
            {[
              { year: '2024/2025', semester: 'Semester Genap', active: true },
              { year: '2024/2025', semester: 'Semester Ganjil', active: false },
              { year: '2023/2024', semester: 'Semester Genap', active: false },
            ].map((ta, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                ta.active ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50'
              }`}>
                <div>
                  <p className="text-sm font-medium text-slate-900">{ta.year}</p>
                  <p className="text-xs text-slate-500">{ta.semester}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  ta.active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {ta.active ? 'Aktif' : 'Selesai'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pengaturan Dokumen */}
      {tab === 'dokumen' && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Pengaturan Dokumen</h2>
          <div className="space-y-2">
            {['Header laporan nilai', 'Format raport', 'Cap & tanda tangan digital', 'Template surat keterangan'].map(item => (
              <div key={item} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700">{item}</span>
                </div>
                <button className="text-xs text-indigo-600 hover:underline font-medium">Atur</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}