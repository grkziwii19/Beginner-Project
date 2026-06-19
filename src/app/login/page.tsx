'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, LogIn, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      router.refresh()
    } catch (err) {
      setError('Terjadi kesalahan. Coba lagi nanti.')
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
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      setError('')
      alert('Akun berhasil dibuat! Silakan login.')
    } catch (err) {
      setError('Terjadi kesalahan saat membuat akun.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">GR-Assistant</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola kelas Anda dengan mudah</p>
        </div>

        {/* Form */}
        <div className="card p-8">
          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="guru@sekolah.sch.id"
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
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={loading}
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 mb-2">Belum punya akun?</p>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="btn-secondary w-full justify-center"
            >
              Daftar Sekarang
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Data Anda aman dan hanya Anda yang bisa mengaksesnya
        </p>
      </div>
    </div>
  )
}