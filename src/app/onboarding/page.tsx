'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    school: '',
    position: 'Guru',
    subject: '',
    nip: '',
    phone: '',
  })

  const handleSubmit = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').upsert({
      id: user.id,
      ...form,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })

    setLoading(false)
    router.push('/dashboard')
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