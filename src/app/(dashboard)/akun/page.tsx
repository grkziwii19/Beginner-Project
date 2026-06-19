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
  firstName: string
  lastName: string
  nip: string
  position: string
  phone: string
  subject: string
  gradeLevel: string
  school: string
}

const emptyProfile: ProfileData = {
  firstName: '', lastName: '', nip: '', position: 'Guru', phone: '', subject: '', gradeLevel: '', school: '',
}

export default function AkunPage() {
  const supabase = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<AkunTab>('profil')
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<ProfileData>(emptyProfile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passMsg, setPassMsg] = useState('')
  const [passSaving, setPassSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '')
        const stored = localStorage.getItem(`profile_${data.user.id}`)
        if (stored) {
          try { setProfile({ ...emptyProfile, ...JSON.parse(stored) }) } catch {}
        }
      }
    })
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) localStorage.setItem(`profile_${user.id}`, JSON.stringify(profile))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Guru'
  const initials = fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const tabs = [
    { id: 'profil', label: 'Profil', icon: UserCircle },
    { id: 'keamanan', label: 'Keamanan', icon: Shield },
    { id: 'preferensi', label: 'Preferensi', icon: Settings },
    { id: 'backup', label: 'Backup Data', icon: HardDrive },
  ] as const

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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                      {initials}
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border border-slate-200 flex items-center justify-center">
                      <Camera className="w-3 h-3 text-slate-500" />
                    </button>
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">{fullName}</h2>
                    <p className="text-sm text-slate-500">{profile.position} {profile.school && `· ${profile.school}`}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Akun Aktif</span>
                  </div>
                </div>
                <button className="btn-secondary text-xs">Ganti Foto</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Nama Depan</label><input className="input" value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} /></div>
                <div><label className="label">Nama Belakang</label><input className="input" value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} /></div>
                <div><label className="label">NIP</label><input className="input" value={profile.nip} onChange={e => setProfile({ ...profile, nip: e.target.value })} /></div>
                <div><label className="label">Jabatan</label><input className="input" value={profile.position} onChange={e => setProfile({ ...profile, position: e.target.value })} /></div>
                <div><label className="label">Email</label><input className="input" value={email} disabled style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }} /></div>
                <div><label className="label">Nomor Telepon</label><input className="input" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
                <div><label className="label">Mata Pelajaran</label><input className="input" value={profile.subject} onChange={e => setProfile({ ...profile, subject: e.target.value })} /></div>
                <div><label className="label">Tingkat Kelas</label><input className="input" placeholder="Contoh: X, XI, XII" value={profile.gradeLevel} onChange={e => setProfile({ ...profile, gradeLevel: e.target.value })} /></div>
              </div>

              <button onClick={handleSaveProfile} disabled={saving} className={`btn-primary w-full justify-center mt-5 ${saved ? 'bg-emerald-600' : ''}`}>
                {saved ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</> : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
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
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-3">Autentikasi Dua Faktor</h3>
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">Verifikasi 2 Langkah</p>
                      <p className="text-xs text-slate-500">Tambah lapisan keamanan ekstra</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Belum Aktif</span>
                </div>
                <button className="btn-primary mt-3 text-sm"><Shield className="w-3.5 h-3.5" /> Aktifkan 2FA</button>
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
                  <div><label className="label">Format Tanggal</label>
                    <select className="input"><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select>
                  </div>
                  <div><label className="label">Tema</label>
                    <select className="input"><option>Terang (Light)</option><option>Gelap (Dark)</option></select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-3">Notifikasi</h3>
                <div className="space-y-1">
                  {[
                    { label: 'Email untuk nilai baru', checked: true },
                    { label: 'Pengingat absensi harian', checked: true },
                    { label: 'Update sistem', checked: false },
                    { label: 'Laporan mingguan otomatis', checked: true },
                  ].map(n => (
                    <div key={n.label} className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-600">{n.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={n.checked} className="sr-only peer" />
                        <div className="w-10 h-5.5 bg-slate-200 peer-checked:bg-indigo-600 rounded-full transition-colors relative">
                          <div className="absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform peer-checked:translate-x-4.5 shadow-sm" />
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn-primary w-full justify-center"><Save className="w-4 h-4" /> Simpan Preferensi</button>
            </div>
          )}

          {/* Backup */}
          {tab === 'backup' && (
            <div className="card p-6">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-lg mb-5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-800">Backup Otomatis Aktif</p>
                  <p className="text-xs text-emerald-600">Terakhir backup: hari ini · Berhasil</p>
                </div>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">Terlindungi</span>
              </div>

              <h3 className="font-semibold text-slate-900 mb-3">Pengaturan Backup</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div><label className="label">Frekuensi Backup</label>
                  <select className="input"><option>Harian (Otomatis)</option><option>Mingguan</option><option>Manual</option></select>
                </div>
                <div><label className="label">Retensi Data</label>
                  <select className="input"><option>30 Hari</option><option>60 Hari</option><option>90 Hari</option></select>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-3">Unduh Data</h3>
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
                    <button className="btn-secondary py-1.5 px-3 text-xs">
                      <Download className="w-3.5 h-3.5" /> Unduh
                    </button>
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
