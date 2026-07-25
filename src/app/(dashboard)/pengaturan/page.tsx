'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  UserCircle, Shield, Settings, LogOut,
  Save, CheckCircle, Camera, Eye, EyeOff
} from 'lucide-react'
import clsx from 'clsx'

interface ProfileData {
  full_name: string
  nip: string
  position: string
  phone: string
  subject: string
  avatar_url: string | null
}

const emptyProfile: ProfileData = {
  full_name: '', nip: '', position: 'Guru', phone: '', subject: '', avatar_url: null,
}

export default function PengaturanPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<ProfileData>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // State untuk Profil Saya
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // State untuk Keamanan (Ubah Sandi)
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passMsg, setPassMsg] = useState('')
  const [passSaving, setPassSaving] = useState(false)

  // State untuk Preferensi
  const [lang, setLang] = useState('Bahasa Indonesia')
  const [timezone, setTimezone] = useState('WITA (UTC+8)')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) { if (!cancelled) router.push('/login'); return }

        if (!cancelled) setEmail(user.email ?? '')

        // Memuat data profil personal guru
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profileData && !cancelled) {
          setProfile({
            full_name: profileData.full_name ?? '',
            nip: profileData.nip ?? '',
            position: profileData.position ?? 'Guru',
            phone: profileData.phone ?? '',
            subject: profileData.subject ?? '',
            avatar_url: profileData.avatar_url ?? null,
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

  const handleChangePassword = async () => {
    setPassMsg('')
    if (!newPass || !confirmPass) { setPassMsg('Isi semua kolom password.'); return }
    if (newPass !== confirmPass) { setPassMsg('Konfirmasi password tidak cocok.'); return }
    if (newPass.length < 6) { setPassMsg('Password minimal 6 karakter.'); return }
    
    setPassSaving(true)
    const { error: passError } = await supabase.auth.updateUser({ password: newPass })
    setPassSaving(false)
    
    if (passError) { 
      setPassMsg(passError.message) 
    } else {
      setPassMsg('Password berhasil diubah!')
      setNewPass('')
      setConfirmPass('')
      setTimeout(() => setPassMsg(''), 3000)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = (profile.full_name || 'Guru')
    .trim()
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat...</div>
  }

  return (
    <div className="space-y-6">
      {/* HEADER KONTROL UTAMA */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-slate-900">Pengaturan Sistem</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all"
        >
          <LogOut className="w-3.5 h-3.5" /> Keluar dari Akun
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* GRID UTAMA KONTEN Halaman */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI (Lebar 2/3): PROFIL SAYA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-indigo-600" /> Profil Saya
              </h2>
              <p className="text-xs text-slate-400 mt-1">Kelola data informasi personal diri Anda di bawah ini.</p>
            </div>

            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden shadow-sm">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border border-slate-200 flex items-center justify-center cursor-pointer shadow-sm hover:border-slate-350 transition-colors">
                  <Camera className="w-3 h-3 text-slate-500" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
                </label>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">{profile.full_name || 'Guru'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{profile.position}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nama Lengkap</label>
                <input className="input" value={profile.full_name || ''} onChange={e => setProfile({ ...profile, full_name: e.target.value })} placeholder="Nama lengkap beserta gelar" />
              </div>
              <div>
                <label className="label">NIP</label>
                <input className="input" value={profile.nip || ''} onChange={e => setProfile({ ...profile, nip: e.target.value })} placeholder="NIP Guru" />
              </div>
              <div>
                <label className="label">Jabatan</label>
                <select className="input" value={profile.position || 'Guru'} onChange={e => setProfile({ ...profile, position: e.target.value })}>
                  <option>Guru</option>
                  <option>Wali Kelas</option>
                  <option>Guru BK</option>
                  <option>Kepala Sekolah</option>
                </select>
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" value={email} disabled style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }} />
              </div>
              <div>
                <label className="label">Nomor Telepon</label>
                <input className="input" value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Mata Pelajaran Utama</label>
                <input className="input" value={profile.subject || ''} onChange={e => setProfile({ ...profile, subject: e.target.value })} placeholder="Contoh: Matematika" />
              </div>
            </div>

            <button onClick={handleSaveProfile} disabled={savingProfile} className={`btn-primary w-full justify-center mt-5 ${savedProfile ? 'bg-emerald-600' : ''}`}>
              {savedProfile ? (
                <><CheckCircle className="w-4 h-4" /> Tersimpan!</>
              ) : (
                <><Save className="w-4 h-4" /> {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}</>
              )}
            </button>
          </div>
        </div>

        {/* KOLOM KANAN (Lebar 1/3): KEAMANAN & PREFERENSI */}
        <div className="space-y-6">
          
          {/* SEKSI: KEAMANAN AKUN */}
          <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" /> Keamanan Akun
              </h2>
              <p className="text-xs text-slate-400 mt-1">Lakukan pembaruan kata sandi akun Anda secara berkala.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Kata Sandi Baru</label>
                <div className="relative">
                  <input 
                    type={showPass ? 'text' : 'password'} 
                    className="input pr-10 text-sm h-[38px]" 
                    placeholder="Minimal 6 karakter"
                    value={newPass} 
                    onChange={e => setNewPass(e.target.value)} 
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Konfirmasi Kata Sandi Baru</label>
                <input 
                  type="password" 
                  className="input text-sm h-[38px]" 
                  placeholder="Ulangi kata sandi baru" 
                  value={confirmPass} 
                  onChange={e => setConfirmPass(e.target.value)} 
                />
              </div>
              
              {passMsg && (
                <div className={clsx(
                  "text-xs px-3 py-2 rounded-lg",
                  passMsg.includes('berhasil') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                )}>
                  {passMsg}
                </div>
              )}

              <button onClick={handleChangePassword} disabled={passSaving} className="btn-primary w-full justify-center text-xs h-[38px]">
                <Shield className="w-3.5 h-3.5" /> {passSaving ? 'Mengubah...' : 'Perbarui Kata Sandi'}
              </button>
              
              <p className="text-[11px] text-slate-400 leading-normal">
                Catatan: Jika Anda masuk menggunakan Google, fitur ubah kata sandi ini tidak berlaku untuk akun Anda.
              </p>
            </div>
          </div>

          {/* SEKSI: PREFERENSI SISTEM */}
          <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-600" /> Preferensi Sistem
              </h2>
              <p className="text-xs text-slate-400 mt-1">Konfigurasikan bahasa antarmuka dan zona waktu Anda.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Bahasa Antarmuka</label>
                <select className="input text-sm h-[38px]" value={lang} onChange={e => setLang(e.target.value)}>
                  <option>Bahasa Indonesia</option>
                  <option>English</option>
                </select>
              </div>
              <div>
                <label className="label">Zona Waktu</label>
                <select className="input text-sm h-[38px]" value={timezone} onChange={e => setTimezone(e.target.value)}>
                  <option>WIB (UTC+7)</option>
                  <option>WITA (UTC+8)</option>
                  <option>WIT (UTC+9)</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Pengaturan preferensi ini disinkronkan secara lokal untuk mempermudah navigasi Anda di sistem.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}