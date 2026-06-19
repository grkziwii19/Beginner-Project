'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  UserCircle, Lock, Settings, Database,
  Save, CheckCircle, Eye, EyeOff, Download
} from 'lucide-react'

export default function AkunPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passMsg, setPassMsg] = useState('')
  const [passSaving, setPassSaving] = useState(false)

  const [activeTab, setActiveTab] = useState<'profil' | 'keamanan' | 'preferensi' | 'backup'>('profil')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '')
        const stored = localStorage.getItem(`profile_${data.user.id}`)
        if (stored) {
          const p = JSON.parse(stored)
          setDisplayName(p.displayName ?? '')
          setPhone(p.phone ?? '')
        }
      }
    })
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      localStorage.setItem(`profile_${user.id}`, JSON.stringify({ displayName, phone }))
    }
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
    if (error) {
      setPassMsg(error.message)
    } else {
      setPassMsg('Password berhasil diubah!')
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
      setTimeout(() => setPassMsg(''), 3000)
    }
  }

  const tabs = [
    { id: 'profil', label: 'Profil', icon: UserCircle },
    { id: 'keamanan', label: 'Keamanan', icon: Lock },
    { id: 'preferensi', label: 'Preferensi', icon: Settings },
    { id: 'backup', label: 'Backup Data', icon: Database },
  ] as const

  const initials = (displayName || email).slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pusat Akun</h1>
        <p className="text-sm text-slate-500 mt-0.5">Kelola profil, keamanan, dan preferensi akun Anda</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profil Tab */}
      {activeTab === 'profil' && (
        <div className="max-w-lg">
          <div className="card p-6 space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{displayName || 'Guru'}</p>
                <p className="text-sm text-slate-500">{email}</p>
              </div>
            </div>

            <div>
              <label className="label">Nama Lengkap</label>
              <input className="input" placeholder="Nama Anda" value={displayName}
                onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={email} disabled
                style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }} />
              <p className="text-xs text-slate-400 mt-1">Email tidak dapat diubah</p>
            </div>
            <div>
              <label className="label">Nomor HP</label>
              <input className="input" placeholder="08xxxxxxxxxx" value={phone}
                onChange={e => setPhone(e.target.value)} />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className={`btn-primary w-full justify-center ${saved ? 'bg-emerald-600' : ''}`}
            >
              {saved
                ? <><CheckCircle className="w-4 h-4" /> Tersimpan!</>
                : <><Save className="w-4 h-4" /> Simpan Perubahan</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Keamanan Tab */}
      {activeTab === 'keamanan' && (
        <div className="max-w-lg">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Ubah Password</h2>
            <div>
              <label className="label">Password Baru</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Minimal 6 karakter"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Konfirmasi Password Baru</label>
              <input
                type="password"
                className="input"
                placeholder="Ulangi password baru"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
              />
            </div>
            {passMsg && (
              <div className={`text-sm px-3 py-2 rounded-lg ${
                passMsg.includes('berhasil') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}>
                {passMsg}
              </div>
            )}
            <button onClick={handleChangePassword} disabled={passSaving} className="btn-primary w-full justify-center">
              {passSaving ? 'Mengubah...' : 'Ubah Password'}
            </button>
          </div>
        </div>
      )}

      {/* Preferensi Tab */}
      {activeTab === 'preferensi' && (
        <div className="max-w-lg">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Preferensi Tampilan</h2>
            {[
              { label: 'Bahasa', options: ['Indonesia', 'English'] },
              { label: 'Format Tanggal', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
            ].map(pref => (
              <div key={pref.label}>
                <label className="label">{pref.label}</label>
                <select className="input">
                  {pref.options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Notifikasi</h3>
              {[
                'Email untuk laporan mingguan',
                'Pengingat input absensi harian',
                'Notifikasi siswa baru ditambahkan',
              ].map(n => (
                <label key={n} className="flex items-center gap-3 py-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-600" />
                  <span className="text-sm text-slate-600">{n}</span>
                </label>
              ))}
            </div>
            <button className="btn-primary w-full justify-center">
              <Save className="w-4 h-4" /> Simpan Preferensi
            </button>
          </div>
        </div>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <div className="max-w-lg">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Backup Data</h2>
            <p className="text-sm text-slate-500">
              Unduh salinan data Anda dalam format Excel untuk disimpan secara lokal.
            </p>
            <div className="space-y-3">
              {[
                { label: 'Data Siswa', desc: 'Semua data siswa dalam format .xlsx' },
                { label: 'Data Nilai', desc: 'Rekap nilai semua siswa' },
                { label: 'Data Absensi', desc: 'Rekap absensi semua siswa' },
                { label: 'Semua Data', desc: 'Export lengkap semua data' },
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
        </div>
      )}
    </div>
  )
}
