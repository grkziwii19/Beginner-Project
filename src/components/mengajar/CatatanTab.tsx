'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  className: string
  subject: string
}

export default function CatatanTab({ className, subject }: Props) {
  const supabase = createClient()

  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('teaching_notes')
        .select('content')
        .eq('user_id', user.id)
        .eq('class_name', className)
        .eq('subject', subject)
        .maybeSingle()

      setContent(data?.content ?? '')
      setLoading(false)
    }
    load()
  }, [className, subject])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase
      .from('teaching_notes')
      .upsert(
        { user_id: user.id, class_name: className, subject, content },
        { onConflict: 'user_id,class_name,subject' }
      )

    if (err) {
      setError('Gagal menyimpan catatan.')
      setSaving(false)
      return
    }

    setSaving(false)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 3000)
  }

  if (loading) {
    return <div className="card p-10 text-center text-slate-400 text-sm">Memuat catatan...</div>
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="card p-4">
        <label className="label text-xs mb-2">Catatan Mengajar</label>
        <textarea
          className="input text-sm min-h-[280px]"
          value={content}
          onChange={e => { setContent(e.target.value); setSavedOk(false) }}
          placeholder="Tuliskan materi, rencana tugas, atau catatan mengajar lainnya untuk kelas dan mata pelajaran ini..."
        />
        <p className="text-xs text-slate-400 mt-2">
          Catatan ini bersifat umum untuk kelas dan mata pelajaran — bukan per siswa.
        </p>

        <div className="flex items-center justify-end gap-3 mt-3">
          {savedOk && (
            <span className="flex items-center gap-1.5 text-emerald-600 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan
            </span>
          )}
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan Catatan'}
          </button>
        </div>
      </div>
    </div>
  )
}
