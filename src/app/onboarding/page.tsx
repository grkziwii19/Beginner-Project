'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, Check, User, Camera, CheckCircle2 } from 'lucide-react'

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()

  const [step, setStep] = useState<2 | 3>(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    school: '',
    position: 'Guru',
    subject: '',
    nip: '',
    phone: '',
  })

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const isValid = form.full_name.trim() !== ''

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Nama Lengkap wajib diisi.')
      return
    }
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesi login tidak ditemukan. Silakan login ulang.')
      setLoading(false)
      router.push('/login')
      return
    }

    let avatarUrl: string | null = null

    // Upload foto jika ada
    if (photoFile) {
      setUploadingPhoto(true)
      const ext = photoFile.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, photoFile, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
      }
      setUploadingPhoto(false)
    }

    const { error: dbError } = await supabase.from('profiles').upsert({
      id: user.id,
      ...form,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })

    setLoading(false)

    if (dbError) {
      console.error('Gagal menyimpan profil:', dbError)
      setError(`Gagal menyimpan profil: ${dbError.message}`)
      return
    }

    setStep(3)
  }

  const handleFinish = () => {
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 py-4">
        <div className="flex items-center justify-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-slate-900 text-sm">GR Assistant</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="max-w-md mx-auto pt-8 pb-4 px-6">
        <div className="flex items-center justify-between">
          {/* Step 1 - done */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-indigo-600">Login</span>
          </div>
          <div className="flex-1 h-px bg-indigo-600 mx-2" />

          {/* Step 2 */}
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-offset-2 ${
              step >= 2 ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-slate-100 text-slate-400 ring-transparent'
            }`}>
              {step > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <span className={`text-xs font-medium ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>Data Diri</span>
          </div>
          <div className={`flex-1 h-px mx-2 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`} />

          {/* Step 3 */}
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              3
            </div>
            <span className={`text-xs font-medium ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>Selesai</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-6 pb-10">
        {step === 2 && (
          <div className="card p-6">
            <div className="text-center mb-6">
              <h1 className="font-semibold text-slate-900">Lengkapi Profil Guru</h1>
              <p className="text-sm text-slate-500 mt-1">
                Silakan isi data diri Anda untuk mempermudah manajemen kelas dan administrasi.
              </p>
            </div>

            {/* Photo upload */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer">
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                </label>
              </div>
              <label className="text-xs text-indigo-600 font-medium mt-2 hover:underline cursor-pointer">
                {uploadingPhoto ? 'Mengunggah...' : 'Unggah Foto Profil'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  className="input" placeholder="Contoh: Budi Santoso, S.Pd"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Nama Sekolah</label>
                <input
                  className="input" placeholder="Contoh: SMA Negeri 1 Jakarta"
                  value={form.school}
                  onChange={e => setForm({ ...form, school: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">NIP</label>
                  <input
                    className="input" placeholder="Masukkan NIP"
                    value={form.nip}
                    onChange={e => setForm({ ...form, nip: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Jabatan</label>
                  <select
                    className="input" value={form.position}
                    onChange={e => setForm({ ...form, position: e.target.value })}
                  >
                    <option>Guru</option>
                    <option>Wali Kelas</option>
                    <option>Guru BK</option>
                    <option>Kepala Sekolah</option>
                    <option>Wakil Kepala Sekolah</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Mata Pelajaran</label>
                  <input
                    className="input" placeholder="Contoh: Matematika"
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Nomor HP</label>
                  <input
                    className="input" placeholder="08xxxxxxxxxx"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full justify-center py-2.5">
                {loading ? 'Menyimpan...' : 'Lanjutkan'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="font-semibold text-slate-900 text-lg">Profil Berhasil Dilengkapi!</h1>
            <p className="text-sm text-slate-500 mt-2">
              Akun Anda sudah siap digunakan. Anda dapat mengubah data ini kapan saja melalui menu Pusat Akun.
            </p>
            <button onClick={handleFinish} className="btn-primary w-full justify-center py-2.5 mt-6">
              Masuk ke Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
