'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    school: '',
    position: 'Guru',
    subject: '',
    nip: '',
    phone: '',
  })

  const handleSubmit = async () => {
    setError('')

    if (!form.full_name.trim()) {
      setError('Nama Lengkap wajib diisi.')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesi login tidak ditemukan. Silakan login ulang.')
      setLoading(false)
      router.push('/login')
      return
    }

    const { error: dbError } = await supabase.from('profiles').upsert({
      id: user.id,
      ...form,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })

    if (dbError) {
      // Ini bagian yang sebelumnya hilang — kalau insert gagal,
      // sekarang errornya akan TERLIHAT, bukan diam-diam gagal
      console.error('Gagal menyimpan profil:', dbError)
      setError(`Gagal menyimpan profil: ${dbError.message}`)
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Lengkapi Profil</h1>

      <input
        className="input"
        placeholder="Nama Lengkap"
        value={form.full_name}
        onChange={e => setForm({ ...form, full_name: e.target.value })}
      />

      <input
        className="input"
        placeholder="Nama Sekolah"
        value={form.school}
        onChange={e => setForm({ ...form, school: e.target.value })}
      />

      <select
        className="input"
        value={form.position}
        onChange={e => setForm({ ...form, position: e.target.value })}
      >
        <option>Guru</option>
        <option>Wali Kelas</option>
        <option>Guru BK</option>
        <option>Kepala Sekolah</option>
        <option>Wakil Kepala Sekolah</option>
      </select>

      <input
        className="input"
        placeholder="Mata Pelajaran"
        value={form.subject}
        onChange={e => setForm({ ...form, subject: e.target.value })}
      />

      <input
        className="input"
        placeholder="NIP"
        value={form.nip}
        onChange={e => setForm({ ...form, nip: e.target.value })}
      />

      <input
        className="input"
        placeholder="Nomor HP"
        value={form.phone}
        onChange={e => setForm({ ...form, phone: e.target.value })}
      />

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? 'Menyimpan...' : 'Lanjut ke Dashboard'}
      </button>
    </div>
  )
}
