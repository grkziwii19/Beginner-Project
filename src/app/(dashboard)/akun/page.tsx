'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProfileData {
  full_name: string
  nip: string
  position: string
  phone: string
  subject: string
  school: string
}

const emptyProfile: ProfileData = {
  full_name: '',
  nip: '',
  position: 'Guru',
  phone: '',
  subject: '',
  school: '',
}

export default function AkunPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<ProfileData>(emptyProfile)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
      }
    }

    load()
  }, [])

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').upsert({
      id: user.id,
      ...profile,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <input
        className="input"
        value={profile.full_name}
        onChange={e =>
          setProfile({ ...profile, full_name: e.target.value })
        }
        placeholder="Nama Lengkap"
      />

      <input
        className="input"
        value={profile.school}
        onChange={e =>
          setProfile({ ...profile, school: e.target.value })
        }
        placeholder="Sekolah"
      />

      <button onClick={handleSave} className="btn-primary w-full">
        {saved ? 'Tersimpan' : 'Simpan'}
      </button>

      <p className="text-sm text-gray-500">Email: {email}</p>
    </div>
  )
}