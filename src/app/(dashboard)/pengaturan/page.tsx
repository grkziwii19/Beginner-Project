'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  UserCircle, Building2, Calendar, LogOut,
  Save, CheckCircle, Camera, Pencil
} from 'lucide-react'
import clsx from 'clsx'

type SettingsTab = 'profil' | 'sekolah' | 'tahun'

interface ProfileData {
  full_name: string
  nip: string
  position: string
  phone: string
  subject: string
  school: string
  avatar_url: string | null
}

interface SchoolData {
  name: string
  npsn: string
  address: string
  principalName: string
  accreditation: string
}

const emptyProfile: ProfileData = {
  full_name: '', nip: '', position: 'Guru', phone: '', subject: '', school: '', avatar_url: null,
}

const emptySchool: SchoolData = {
  name: '', npsn: '', address: '', principalName: '', accreditation: 'A',
}

export default function PengaturanPage() {
  const supabase = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<SettingsTab>('profil')
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<ProfileData>(emptyProfile)
  const [school, setSchool] = useState<SchoolData>(emptySchool)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [savingSchool, setSavingSchool] = useState(false)
  const [savedSchool, setSavedSchool] = useState(false)
  const [editingSchool, setEditingSchool] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) { if (!cancelled) router.push('/login'); return }

        if (!cancelled) setEmail(user.email ?? '')

        const [{ data: profileData }, { data: schoolData }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('school_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        ])

        if (profileData && !cancelled) {
          setProfile({
            full_name: profileData.full_name ?? '',
            nip: profileData.nip ?? '',
            position: profileData.position ?? 'Guru',
            phone: profileData.phone ?? '',
            subject: profileData.subject ?? '',
            school: profileData.school ?? '',
            avatar_url: profileData.avatar_url ?? null,
          })
        }

        if (schoolData && !cancelled) {
          setSchool({
            name: schoolData.name ?? '',
            npsn: schoolData.npsn ?? '',
            address: schoolData.address ?? '',
            principalName: schoolData.principal_name ?? '',
            accreditation: schoolData.accreditation ?? 'A',
          })
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) setError('Gagal memuat data pengaturan.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleSaveProfile = async () => {
    setError('')
    setSavingProfile(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingProfile(false); return }

    const { error: dbError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: profile.full_name.trim(),
      nip: profile.nip.trim() || null,
      position: profile.position.trim() || 'Guru',
      phone: profile.phone.trim() || null,
      subject: profile.subject.trim() || null,
      school: profile.school.trim() || null,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })

    setSavingProfile(false)
    if (dbError) { setError('Gagal menyimpan profil: ' + dbError.message); return }

    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 2000)
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadingPhoto(false); return }

    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Gagal mengunggah foto: ' + uploadError.message)
      setUploadingPhoto(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`

    await supabase.from('profiles').upsert({ id: user.id, avatar_url: newUrl, updated_at: new Date().toISOString() })
    setProfile(prev => ({ ...prev, avatar_url: newUrl }))
    setUploadingPhoto(false)
  }

  const handleSaveSchool = async () => {
    setError('')
    setSavingSchool(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingSchool(false); return }

    const { error: dbError } = await supabase.from('school_profiles').upsert({
      user_id: user.id,
      name: school.name.trim(),
      npsn: school.npsn.trim() || null,
      address: school.address.trim() || null,
      principal_name: school.principalName.trim() || null,
      accreditation: school.accreditation,
    })

    setSavingSchool(false)
    if (dbError) { setError('Gagal menyimpan data sekolah: ' + dbError.message); return }

    setSavedSchool(true)
    setEditingSchool(false)
    setTimeout(() => setSavedSchool(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = (profile.full_name || 'Guru').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const tabs = [
    { id: 'profil', label: 'Profil', icon: UserCircle },
    { id: 'sekolah', label: 'Data Sekolah', icon: Building2 },
    { id: 'tahun', label: 'Tahun Ajaran', icon: Calendar },
  ] as const

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500 mt-0.5">Profil, data sekolah, dan tahun ajaran.</p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="card p-2 h-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-2 pt-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
          {tab === 'profil' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                      {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
                    </div>
                    <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border border-slate-200 flex items-center justify-center cursor-pointer">
                      <Camera className="w-3 h-3 text-slate-500" />
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
                    </label>
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">{profile.full_name || 'Guru'}</h2>
                    <p className="text-sm text-slate-500">{profile.position}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nama Lengkap</label>
                  <input className="input" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} />
                </div>
                <div><label className="label">NIP</label><input className="input" value={profile.nip} onChange={e => setProfile({ ...profile, nip: e.target.value })} /></div>
                <div><label className="label">Jabatan</label>
                  <select className="input" value={profile.position} onChange={e => setProfile({ ...profile, position: e.target.value })}>
                    <option>Guru</option><option>Wali Kelas</option><option>Guru BK</option><option>Kepala Sekolah</option>
                  </select>
                </div>
                <div><label className="label">Email</label><input className="input" value={email} disabled style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }} /></div>
                <div><label className="label">Nomor Telepon</label><input className="input" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
                <div><label className="label">Mata Pelajaran</label><input className="input" value={profile.subject} onChange={e => setProfile({ ...profile, subject: e.target.value })} /></div>
              </div>

              <button onClick={handleSaveProfile} disabled={savingProfile} className={`btn-primary w-full justify-center mt-5 ${savedProfile ? 'bg-emerald-600' : ''}`}>
                {savedProfile ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</> : <><Save className="w-4 h-4" /> {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}</>}
              </button>
            </div>
          )}

          {tab === 'sekolah' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-slate-900">Data Sekolah</h2>
                <button onClick={() => setEditingSchool(!editingSchool)} className="btn-secondary text-xs">
                  <Pencil className="w-3.5 h-3.5" /> {editingSchool ? 'Batal' : 'Edit'}
                </button>
              </div>

              {editingSchool ? (
                <div className="space-y-4">
                  <div><label className="label">Nama Sekolah</label><input className="input" value={school.name} onChange={e => setSchool({ ...school, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">NPSN</label><input className="input" value={school.npsn} onChange={e => setSchool({ ...school, npsn: e.target.value })} /></div>
                    <div><label className="label">Akreditasi</label>
                      <select className="input" value={school.accreditation} onChange={e => setSchool({ ...school, accreditation: e.target.value })}>
                        <option>A</option><option>B</option><option>C</option>
                      </select>
                    </div>
                  </div>
                  <div><label className="label">Alamat</label><input className="input" value={school.address} onChange={e => setSchool({ ...school, address: e.target.value })} /></div>
                  <div><label className="label">Kepala Sekolah</label><input className="input" value={school.principalName} onChange={e => setSchool({ ...school, principalName: e.target.value })} /></div>
                  <button onClick={handleSaveSchool} disabled={savingSchool} className={`btn-primary w-full justify-center ${savedSchool ? 'bg-emerald-600' : ''}`}>
                    {savedSchool ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</> : <><Save className="w-4 h-4" /> {savingSchool ? 'Menyimpan...' : 'Simpan'}</>}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Nama Sekolah', school.name || '-'], ['NPSN', school.npsn || '-'],
                    ['Akreditasi', school.accreditation], ['Kepala Sekolah', school.principalName || '-'],
                    ['Alamat', school.address || '-'],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-slate-400 uppercase">{k}</p>
                      <p className="font-medium text-slate-800 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'tahun' && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Tahun Ajaran</h2>
              <div className="space-y-3">
                {[
                  { year: '2024/2025', semester: 'Semester Genap', active: true },
                  { year: '2024/2025', semester: 'Semester Ganjil', active: false },
                ].map((ta, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${ta.active ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{ta.year}</p>
                      <p className="text-xs text-slate-500">{ta.semester}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ta.active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                      {ta.active ? 'Aktif' : 'Selesai'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
