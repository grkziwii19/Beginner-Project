'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, Eye, EyeOff } from 'lucide-react'

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
          <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-8 h-8 text-indigo-400" />
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
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">GR Assistant</h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Selamat Datang</h2>
          <p className="text-slate-500 text-sm mt-1 mb-7">
            Silakan masuk ke akun Anda untuk melanjutkan pengelolaan data sekolah.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Alamat Email</label>
              <input
                type="email" className="input" placeholder="nama@sekolah.sch.id"
                value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" required
              />
            </div>

            <div>
              <label className="label">Kata Sandi</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} className="input pr-10"
                  placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" required
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-4 h-4 accent-indigo-600 rounded" />
                Ingat saya di perangkat ini
              </label>
              <a href="#" className="text-indigo-600 hover:underline font-medium">Lupa kata sandi?</a>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
            <div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-slate-200"></div>
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-white px-2 text-slate-400">
      atau
    </span>
  </div>
</div>

<button
  type="button"
  onClick={handleGoogleLogin}
  disabled={loading}
  className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    className="w-5 h-5"
  >
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.657 29.195 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.145 35.091 26.671 36 24 36c-5.174 0-9.623-3.329-11.275-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.058 3.092-3.251 5.525-6.084 6.57l.003-.002l6.19 5.238C34.971 39.48 44 33 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>

  Masuk dengan Google
</button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 mb-2">Belum memiliki akun?</p>
            <button onClick={handleRegister} disabled={loading} className="btn-secondary w-full justify-center">
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
