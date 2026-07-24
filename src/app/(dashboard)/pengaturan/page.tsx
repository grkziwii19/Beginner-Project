'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  UserCircle, Building2, Calendar, LogOut,
  Save, CheckCircle, Camera, Pencil, ChevronDown, ShieldAlert
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

// ── SKELETON LOADER FOR PREMIUM UX ──
const SettingsSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-pulse">
    <div className="space-y-3">
      {[1, 2, 3, 4].map(n => (
        <div key={n} className="h-11 bg-slate-100 rounded-xl w-full" />
      ))}
    </div>
    <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-6 space-y-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-150" />
        <div className="space-y-2">
          <div className="h-5 bg-slate-150 rounded w-40" />
          <div className="h-4 bg-slate-100 rounded w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} className="space-y-2">
            <div className="h-3 bg-slate-100 rounded w-16" />
            <div className="h-10 bg-slate-100 rounded-xl w-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
)

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
    { id: 'profil', label: 'Profil Akun', icon: UserCircle },
    { id: 'sekolah', label: 'Data Sekolah', icon: Building2 },
    { id: 'tahun', label: 'Tahun Ajaran', icon: Calendar },
  ] as const

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        <div className="border-b border-slate-100 pb-5">
          <div className="h-8 bg-slate-100 rounded w-48 animate-pulse mb-2" />
          <div className="h-4 bg-slate-50 rounded w-80 animate-pulse" />
        </div>
        <SettingsSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* HEADER BAR */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pengaturan</h1>
        <p className="text-sm text-slate-500 mt-1">Konfigurasi data profil guru, riwayat lembaga sekolah, serta tahun ajaran aktif.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-800 text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* LEFT COLUMN: NAVIGATION SIDEBAR */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm h-fit space-y-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150',
                tab === t.id 
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              <t.icon className={clsx('w-4 h-4 shrink-0', tab === t.id ? 'text-white' : 'text-slate-400')} /> 
              {t.label}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-3 pt-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-bold text-rose-600 hover:bg-rose-50/70 transition-all duration-150"
            >
              <LogOut className="w-4 h-4 shrink-0" /> Keluar
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE TAB PANEL */}
        <div className="lg:col-span-3">
          {tab === 'profil' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-5">
                  <div className="relative group">
                    <div className="w-18 h-18 rounded-2xl bg-indigo-550 flex items-center justify-center text-white text-2xl font-black overflow-hidden shadow-sm border border-indigo-100">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border border-slate-250 flex items-center justify-center cursor-pointer hover:border-indigo-500 shadow-sm transition-all duration-200">
                      <Camera className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handlePhotoChange} 
                        disabled={uploadingPhoto} 
                      />
                    </label>
                  </div>
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-lg leading-snug">{profile.full_name || 'Guru'}</h2>
                    <p className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5 mt-1 inline-block">
                      {profile.position}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Nama Lengkap</label>
                  <input 
                    className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none" 
                    value={profile.full_name} 
                    onChange={e => setProfile({ ...profile, full_name: e.target.value })} 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">NIP</label>
                  <input 
                    className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none" 
                    value={profile.nip} 
                    onChange={e => setProfile({ ...profile, nip: e.target.value })} 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Jabatan</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold text-slate-800 appearance-none cursor-pointer" 
                      value={profile.position} 
                      onChange={e => setProfile({ ...profile, position: e.target.value })}
                    >
                      <option>Guru</option>
                      <option>Wali Kelas</option>
                      <option>Guru BK</option>
                      <option>Kepala Sekolah</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Email Terdaftar</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-450 cursor-not-allowed outline-none" 
                    value={email} 
                    disabled 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Nomor Telepon</label>
                  <input 
                    className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none" 
                    value={profile.phone} 
                    onChange={e => setProfile({ ...profile, phone: e.target.value })} 
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Mata Pelajaran Utama</label>
                  <input 
                    className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none" 
                    value={profile.subject} 
                    onChange={e => setProfile({ ...profile, subject: e.target.value })} 
                  />
                </div>
              </div>

              <button 
                onClick={handleSaveProfile} 
                disabled={savingProfile} 
                className={clsx(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 active:scale-[0.98] w-full",
                  savedProfile ? "bg-emerald-600 shadow-emerald-100" : "bg-indigo-600 shadow-indigo-150 hover:bg-indigo-500"
                )}
              >
                {savedProfile ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Tersimpan!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
                  </>
                )}
              </button>
            </div>
          )}

          {tab === 'sekolah' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-150">
                <h2 className="font-extrabold text-slate-900 text-base">Informasi Lembaga Sekolah</h2>
                <button 
                  onClick={() => setEditingSchool(!editingSchool)} 
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-250 bg-white px-3 py-1.5 text-xs font-bold text-slate-750 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                >
                  <Pencil className="w-3.5 h-3.5" /> {editingSchool ? 'Batal' : 'Edit Data'}
                </button>
              </div>

              {editingSchool ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Nama Sekolah</label>
                    <input 
                      className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none" 
                      value={school.name} 
                      onChange={e => setSchool({ ...school, name: e.target.value })} 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">NPSN</label>
                      <input 
                        className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none" 
                        value={school.npsn} 
                        onChange={e => setSchool({ ...school, npsn: e.target.value })} 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Akreditasi</label>
                      <div className="relative">
                        <select 
                          className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold text-slate-800 appearance-none cursor-pointer" 
                          value={school.accreditation} 
                          onChange={e => setSchool({ ...school, accreditation: e.target.value })}
                        >
                          <option>A</option>
                          <option>B</option>
                          <option>C</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Alamat Sekolah</label>
                    <input 
                      className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none" 
                      value={school.address} 
                      onChange={e => setSchool({ ...school, address: e.target.value })} 
                    />
                  </div>

                  <div className="space-y-1.5 pb-2">
                    <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Nama Kepala Sekolah</label>
                    <input 
                      className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none" 
                      value={school.principalName} 
                      onChange={e => setSchool({ ...school, principalName: e.target.value })} 
                    />
                  </div>

                  <button 
                    onClick={handleSaveSchool} 
                    disabled={savingSchool} 
                    className={clsx(
                      "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 active:scale-[0.98] w-full",
                      savedSchool ? "bg-emerald-600 shadow-emerald-100" : "bg-indigo-600 shadow-indigo-150 hover:bg-indigo-500"
                    )}
                  >
                    {savedSchool ? (
                      <>
                        <CheckCircle className="w-4 h-4" /> Tersimpan!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> {savingSchool ? 'Menyimpan...' : 'Simpan Data'}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    ['Nama Sekolah', school.name || '-'], 
                    ['NPSN', school.npsn || '-'],
                    ['Akreditasi', school.accreditation], 
                    ['Kepala Sekolah', school.principalName || '-'],
                    ['Alamat Lengkap', school.address || '-'],
                  ].map(([k, v]) => (
                    <div 
                      key={k} 
                      className={clsx(
                        "bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between",
                        k === 'Alamat Lengkap' ? 'sm:col-span-2' : ''
                      )}
                    >
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k}</p>
                      <p className="font-bold text-slate-800 mt-1.5 text-sm leading-relaxed">{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'tahun' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="pb-4 border-b border-slate-150">
                <h2 className="font-extrabold text-slate-900 text-base">Manajemen Tahun Ajaran</h2>
              </div>
              <div className="space-y-4">
                {[
                  { year: '2024/2025', semester: 'Semester Genap', active: true },
                  { year: '2024/2025', semester: 'Semester Ganjil', active: false },
                ].map((ta, i) => (
                  <div 
                    key={i} 
                    className={clsx(
                      'flex items-center justify-between p-4 rounded-2xl border transition-all duration-200',
                      ta.active 
                        ? 'border-indigo-100 bg-indigo-50/40 shadow-sm' 
                        : 'border-slate-150 bg-slate-50/30'
                    )}
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-snug">{ta.year}</p>
                      <p className="text-xs font-semibold text-slate-450 mt-0.5">{ta.semester}</p>
                    </div>
                    <span 
                      className={clsx(
                        'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                        ta.active 
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-200/50' 
                          : 'bg-slate-100 text-slate-500 border-slate-200/40'
                      )}
                    >
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