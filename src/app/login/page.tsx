'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error || !data.session) {
        setError('Email atau kata sandi salah. Coba lagi.')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Terjadi kesalahan. Coba lagi nanti.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) setError(error.message)
  }

  const handleRegister = async () => {
    if (loading) return

    if (!email || !password) {
      setError('Isi email dan kata sandi terlebih dahulu.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      alert('Akun berhasil dibuat! Silakan login.')
    } catch {
      setError('Terjadi kesalahan saat membuat akun.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* LEFT */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col items-center justify-center p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-900" />

        <div className="relative z-10 max-w-md text-center">

          <div className="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <Image
              src="/icons/icon-512x512.png"
              alt="GR Assistant"
              width={64}
              height={64}
            />
          </div>

          <h1 className="text-4xl font-bold text-white">GR Assistant</h1>

          <p className="text-indigo-300 mt-2">
            Sistem Manajemen Akademik Digital
          </p>

        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">

        <div className="w-full max-w-md">

          {/* MOBILE LOGO */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 overflow-hidden rounded-2xl">
              <Image
                src="/icons/icon-512x512.png"
                alt="GR Assistant"
                width={56}
                height={56}
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              GR Assistant
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            Selamat Datang
          </h2>

          <p className="text-slate-500 text-sm mt-1 mb-7">
            Silakan masuk ke akun Anda untuk melanjutkan pengelolaan data sekolah.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">

            <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
            <input className="input" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />

            <button type="submit" className="btn-primary w-full">
              {loading ? 'Masuk...' : 'Masuk'}
            </button>

          </form>

        </div>
      </div>
    </div>
  )
}