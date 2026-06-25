'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { type FieldType } from '@/types'
import clsx from 'clsx'

interface Props {
  onClose: () => void
  onAdd: (label: string, group: string, type: FieldType, options?: string[]) => Promise<{ error: string | null }>
}

const TYPE_LABELS: Record<FieldType, string> = {
  text: 'Teks',
  date: 'Tanggal',
  number: 'Angka',
  select: 'Pilihan (dropdown)',
}

export default function AddFieldModal({ onClose, onAdd }: Props) {
  const [label, setLabel] = useState('')
  const [group, setGroup] = useState('Lainnya')
  const [type, setType] = useState<FieldType>('text')
  const [options, setOptions] = useState<string[]>([''])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!label.trim()) {
      setError('Nama kategori wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    const cleanOptions = options.map(o => o.trim()).filter(Boolean)
    const result = await onAdd(label, group, type, type === 'select' ? cleanOptions : undefined)
    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Tambah Kategori Biodata</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label">Nama Kategori</label>
            <input
              className="input"
              placeholder="Contoh: Golongan Darah, Hobi, Cita-cita"
              value={label}
              onChange={e => setLabel(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Kelompok</label>
            <input
              className="input"
              placeholder="Contoh: Kesehatan, Orang Tua, Lainnya"
              value={group}
              onChange={e => setGroup(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">Mengelompokkan kategori di halaman detail siswa</p>
          </div>

          <div>
            <label className="label">Jenis Data</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TYPE_LABELS) as FieldType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={clsx(
                    'px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left',
                    type === t ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  )}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {type === 'select' && (
            <div>
              <label className="label">Pilihan Jawaban</label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input"
                      placeholder={`Pilihan ${i + 1}`}
                      value={opt}
                      onChange={e => setOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                    />
                    {options.length > 1 && (
                      <button
                        onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))}
                        className="p-2 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setOptions(prev => [...prev, ''])}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah pilihan
              </button>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Batal</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Menyimpan...' : 'Tambah Kategori'}
          </button>
        </div>
      </div>
    </div>
  )
}
