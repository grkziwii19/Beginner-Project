'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  UserCircle, Shield, Settings, HardDrive, LogOut,
  Save, CheckCircle, Eye, EyeOff, Download, Camera
} from 'lucide-react'
import clsx from 'clsx'

type AkunTab = 'profil' | 'keamanan' | 'preferensi' | 'backup'

interface ProfileData {
  full_name: string
  nip: string
  position: string
  phone: string
  subject: string
  school: string
  avatar_url: string | null
}

const emptyProfile: ProfileData = {
  full_name: '', nip: '', position: 'Guru', phone: '', subject: '', school: '', avatar_url: null,
}

export default function AkunPage() {
  const supabase = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<AkunTab>('profil')
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<ProfileData>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passMsg, setPassMsg] = useState('')
  const [passSaving, setPassSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
  setLoading(false)
  router.push('/login')
  return
}
      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (data) {
        setProfile({
          full_name: data.full_name ?? '',
          nip: data.nip ?? '',
          position: data.position ?? 'Guru',
          phone: data.phone ?? '',
          subject: data.subject ?? '',
          school: data.school ?? '',
          avatar_url: data.avatar_url ?? null,
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSaveProfile = async () => {
    setError('')
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

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

    setSaving(false)

    if (dbError) {
      setError('Gagal menyimpan: ' + dbError.message)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Gagal mengunggah foto: ' + uploadError.message)
      setUploadingPhoto(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, avatar_url: newUrl, updated_at: new Date().toISOString() })

    if (updateError) {
      setError('Gagal menyimpan foto: ' + updateError.message)
    } else {
      setProfile(prev => ({ ...prev, avatar_url: newUrl }))
    }
    setUploadingPhoto(false)
  }

  const handleChangePassword = async () => {
    if (!newPass || !confirmPass) { setPassMsg('Isi semua kolom password.'); return }
    if (newPass !== confirmPass) { setPassMsg('Konfirmasi password tidak cocok.'); return }
    if (newPass.length < 6) { setPassMsg('Password minimal 6 karakter.'); return }
    setPassSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPassSaving(false)
    if (error) { setPassMsg(error.message) }
    else {
      setPassMsg('Password berhasil diubah!')
      setNewPass(''); setConfirmPass('')
      setTimeout(() => setPassMsg(''), 3000)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = (profile.full_name || 'Guru').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const tabs = [
    { id: 'profil', label: 'Profil', icon: UserCircle },
    { id: 'keamanan', label: 'Keamanan', icon: Shield },
    { id: 'preferensi', label: 'Preferensi', icon: Settings },
    { id: 'backup', label: 'Backup Data', icon: HardDrive },
  ] as const

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pusat Akun</h1>
        <p className="text-sm text-slate-500 mt-0.5">Kelola profil, keamanan, dan preferensi akun Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Vertical tab sidebar */}
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

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profil */}
          {tab === 'profil' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : initials}
                    </div>
                    <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border border-slate-200 flex items-center justify-center cursor-pointer">
                      <Camera className="w-3 h-3 text-slate-500" />
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
                    </label>
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">{profile.full_name || 'Guru'}</h2>
                    <p className="text-sm text-slate-500">{profile.position} {profile.school && `· ${profile.school}`}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Akun Aktif</span>
                  </div>
                </div>
                <label className="btn-secondary text-xs cursor-pointer">
                  {uploadingPhoto ? 'Mengunggah...' : 'Ganti Foto'}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nama Lengkap</label>
                  <input className="input" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} />
                </div>
                <div><label className="label">NIP</label><input className="input" value={profile.nip} onChange={e => setProfile({ ...profile, nip: e.target.value })} /></div>
                <div><label className="label">Jabatan</label>
                  <select className="input" value={profile.position} onChange={e => setProfile({ ...profile, position: e.target.value })}>
                    <option>Guru</option>
                    <option>Wali Kelas</option>
                    <option>Guru BK</option>
                    <option>Kepala Sekolah</option>
                    <option>Wakil Kepala Sekolah</option>
                  </select>
                </div>
                <div><label className="label">Email</label><input className="input" value={email} disabled style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }} /></div>
                <div><label className="label">Nomor Telepon</label><input className="input" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
                <div><label className="label">Mata Pelajaran</label><input className="input" placeholder="Contoh: Matematika" value={profile.subject} onChange={e => setProfile({ ...profile, subject: e.target.value })} /></div>
                <div><label className="label">Nama Sekolah</label><input className="input" value={profile.school} onChange={e => setProfile({ ...profile, school: e.target.value })} /></div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">
                  {error}
                </div>
              )}

              <button onClick={handleSaveProfile} disabled={saving} className={`btn-primary w-full justify-center mt-5 ${saved ? 'bg-emerald-600' : ''}`}>
                {saved ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</> : <><Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}</>}
              </button>
            </div>
          )}

          {/* Keamanan */}
          {tab === 'keamanan' && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Ubah Kata Sandi</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="label">Kata Sandi Baru</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} className="input pr-10" placeholder="Minimal 6 karakter"
                      value={newPass} onChange={e => setNewPass(e.target.value)} />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Konfirmasi Kata Sandi Baru</label>
                  <input type="password" className="input" placeholder="Ulangi kata sandi baru" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                </div>
                {passMsg && (
                  <div className={`text-sm px-3 py-2 rounded-lg ${passMsg.includes('berhasil') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {passMsg}
                  </div>
                )}
                <button onClick={handleChangePassword} disabled={passSaving} className="btn-primary w-full justify-center">
                  <Shield className="w-4 h-4" /> {passSaving ? 'Mengubah...' : 'Perbarui Kata Sandi'}
                </button>
                <p className="text-xs text-slate-400">
                  Catatan: jika Anda login menggunakan Google, fitur ubah kata sandi ini tidak berlaku untuk akun Anda.
                </p>
              </div>
            </div>
          )}

          {/* Preferensi */}
          {tab === 'preferensi' && (
            <div className="card p-6 space-y-6">
              <div>
                <h2 className="font-semibold text-slate-900 mb-4">Tampilan & Bahasa</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Bahasa Antarmuka</label>
                    <select className="input"><option>Bahasa Indonesia</option><option>English</option></select>
                  </div>
                  <div><label className="label">Zona Waktu</label>
                    <select className="input"><option>WIB (UTC+7)</option><option>WITA (UTC+8)</option><option>WIT (UTC+9)</option></select>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">Preferensi tampilan akan tersimpan ke server pada update mendatang.</p>
            </div>
          )}

          {/* Backup */}
          {tab === 'backup' && (
            <div className="card p-6">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-lg mb-5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-800">Data Tersimpan Online</p>
                  <p className="text-xs text-emerald-600">Semua data Anda otomatis tersimpan di server, bisa diakses dari perangkat manapun.</p>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-3">Unduh Data (Backup Lokal)</h3>
              <div className="space-y-2">
                {[
                  { label: 'Data Siswa', desc: 'Semua data siswa dalam format .xlsx' },
                  { label: 'Data Nilai', desc: 'Rekap nilai semua siswa' },
                  { label: 'Data Absensi', desc: 'Rekap absensi semua siswa' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                    <a href="/import" className="btn-secondary py-1.5 px-3 text-xs">
                      <Download className="w-3.5 h-3.5" /> Unduh
                    </a>
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
