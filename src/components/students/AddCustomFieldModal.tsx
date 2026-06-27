'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  onClose: () => void
  onAdd: (label: string) => Promise<{ error: string | null }>
}

export default function AddCustomFieldModal({ onClose, onAdd }: Props) {
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!label.trim()) {
      setError('Nama kolom wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    const result = await onAdd(label)
    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Tambah Kolom Data</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <label className="label">Nama Kolom</label>
          <input
            className="input"
            placeholder="Contoh: Catatan, Makanan Favorit, Cita-cita"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Kolom baru akan muncul di biodata semua siswa, diisi bebas berupa teks.
          </p>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Batal</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Menyimpan...' : 'Tambah Kolom'}
          </button>
        </div>
      </div>
    </div>
  )
}
