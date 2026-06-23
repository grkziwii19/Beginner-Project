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

  const redirectAfterAuth = (user: any) => {
    if (user?.user_metadata?.onboarded) {
      router.push('/dashboard')
    } else {
      router.push('/onboarding')
    }
    router.refresh()
  }

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

      redirectAfterAuth(data.user)
    } catch {
      setError('Terjadi kesalahan. Coba lagi nanti.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch {
      setError('Terjadi kesalahan saat login dengan Google.')
    } finally {
      setLoading(false)
    }
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
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.session) {
        router.push('/onboarding')
        router.refresh()
      } else {
        alert('Akun berhasil dibuat! Silakan cek email untuk verifikasi, lalu login.')
      }
    } catch {
      setError('Terjadi kesalahan saat membuat akun.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      
      {/* Left panel - dark hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col items-center justify-center p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-900" />

        <div className="relative z-10 max-w-md">

          {/* LOGO REPLACED */}
          <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Image
              src="/icons/logoGR.png"
              alt="GR Assistant"
              width={40}
              height={40}
            />
          </div>

          <h1 className="text-3xl font-bold text-white leading-tight">
            Cerdaskan Bangsa Melalui Efisiensi Digital
          </h1>

          <p className="text-slate-400 mt-4 text-sm leading-relaxed">
            Platform manajemen akademik terintegrasi yang dirancang khusus untuk membantu guru mengelola data kelas, penilaian, dan administrasi sekolah.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-8">
            {[['500+', 'SEKOLAH'], ['10K+', 'GURU'], ['1M+', 'DATA SISWA']].map(([num, label]) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl py-4">
                <p className="text-xl font-bold text-white">{num}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 tracking-wide">{label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">

          <div className="lg:hidden text-center mb-8">

            {/* LOGO REPLACED */}
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4">
              <Image
                src="/icons/logoGR.png"
                alt="GR Assistant"
                width={32}
                height={32}
              />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              GR Assistant
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Selamat Datang</h2>

          <p className="text-slate-500 text-sm mt-1 mb-7">
            Silakan masuk ke akun Anda untuk melanjutkan pengelolaan data sekolah.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="label">Alamat Email</label>
              <input
                type="email"
                className="input"
                placeholder="nama@sekolah.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="label">Kata Sandi</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                Ingat saya di perangkat ini
              </label>

              <a href="#" className="text-indigo-600 hover:underline font-medium">
                Lupa kata sandi?
              </a>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5"
              disabled={loading}
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>

            {/* Google login tetap sama */}
            {/* (tidak diubah karena bukan logo internal kamu) */}

          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 mb-2">Belum memiliki akun?</p>
            <button
              onClick={handleRegister}
              disabled={loading}
              className="btn-secondary w-full justify-center"
            >
              Daftar Sekarang
            </button>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Data Anda aman dan hanya Anda yang bisa mengaksesnya
          </p>

        </div>
      </div>
    </div>
  )
}