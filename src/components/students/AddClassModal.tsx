'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import ClassForm, { type ClassFormData } from './ClassForm'
import { isValidClassName } from '@/lib/normalizeClassName'

interface Props {
  onClose: () => void
  onAdd: (data: ClassFormData) => Promise<{ error: string | null }>
}

const emptyForm: ClassFormData = {
  name: '',
  subjects: [],
  homeroomTeacher: '',
  isHomeroomOnly: false,
}

export default function AddClassModal({ onClose, onAdd }: Props) {
  const [form, setForm] = useState<ClassFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [classExists, setClassExists] = useState(false)

  const handleSubmit = async () => {
  if (!form.name.trim()) {
    setError('Nama kelas wajib diisi.')
    return
  }

  if (!isValidClassName(form.name)) {
    setError('Format nama kelas tidak valid. Contoh: VI A, 6A, atau Kelas VI A.')
    return
  }

  if (!form.homeroomTeacher.trim()) {
    setError('Nama wali kelas wajib diisi.')
    return
  }

  if (classExists) {
    setError('Nama kelas sudah ada.')
    return
  }

  setSaving(true)
  setError('')

  const result = await onAdd(form)

  if (result.error) {
    setError(result.error)
    setSaving(false)
    return
  }

  onClose()
}

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">
            Tambah Kelas
          </h2>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">

          <ClassForm
            data={form}
            onChange={setForm}
            onClassExistsChange={setClassExists}
          />

          {(error || classExists) && (
            <p className="text-xs text-red-500 mt-3">
              {error || 'Nama kelas sudah ada.'}
            </p>
          )}

        </div>

        <div className="flex gap-3 p-5 border-t border-slate-100 shrink-0">

          <button
            onClick={onClose}
            className="btn-secondary flex-1 justify-center"
          >
            Batal
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving || classExists}
            className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Menyimpan...' : 'Tambah Kelas'}
          </button>

        </div>
      </div>
    </div>
  )
}