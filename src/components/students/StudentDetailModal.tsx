'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  type Student, type CustomFieldDefinition,
  RELIGION_OPTIONS, getInitials,
} from '@/types'
import { X, Camera, Pencil, Save, User } from 'lucide-react'

interface Props {
  open: boolean
  student: Student | null
  className: string
  customFields: CustomFieldDefinition[]
  onClose: () => void
  onSaved: () => void
}

// ✅ Didefinisikan di luar komponen agar tidak di-recreate setiap render
function Row({
  label, value, editMode, children,
}: {
  label: string
  value?: string | null
  editMode: boolean
  children?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
      {editMode
        ? children
        : <p className="text-sm text-slate-800">{value || <span className="text-slate-300">—</span>}</p>}
    </div>
  )
}

export default function StudentDetailModal({ open, student, className, customFields, onClose, onSaved }: Props) {
  const supabase = createClient()
  const isNew = !student
  const [editMode, setEditMode] = useState(isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<Record<string, string>>({
    name: '', nis: '', nisn: '', gender: 'Laki-laki',
    birth_place: '', birth_date: '', religion: '',
    address: '', phone: '', father_name: '', mother_name: '', parent_phone: '',
  })
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Reset semua state saat modal dibuka
  useEffect(() => {
    if (!open) return
    setEditMode(!student)
    setError('')
    setPhotoFile(null)
    setForm({
      name: student?.name ?? '',
      nis: student?.nis ?? '',
      nisn: student?.nisn ?? '',
      gender: student?.gender ?? 'Laki-laki',
      birth_place: student?.birth_place ?? '',
      birth_date: student?.birth_date ?? '',
      religion: student?.religion ?? '',
      address: student?.address ?? '',
      phone: student?.phone ?? '',
      father_name: student?.father_name ?? '',
      mother_name: student?.mother_name ?? '',
      parent_phone: student?.parent_phone ?? '',
    })
    setCustomValues(student?.custom_fields ?? {})
    setPhotoUrl(student?.photo_url ?? null)
    setPhotoPreview(student?.photo_url ?? null)
  }, [open, student])

  // Preview foto lokal
  useEffect(() => {
    if (!photoFile) return
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  // Guard — harus setelah semua hooks
  if (!open) return null

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran foto maksimal 2MB.')
      return
    }
    setPhotoFile(file)
    setError('')
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.nis.trim()) {
      setError('Nama dan NIS wajib diisi.')
      return
    }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let finalPhotoUrl = photoUrl

    if (photoFile) {
      setUploading(true)
      const ext = photoFile.name.split('.').pop()
      const path = `${user.id}/${student?.id ?? crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('student-photos')
        .upload(path, photoFile, { upsert: true })

      if (uploadErr) {
        setError('Gagal mengupload foto: ' + uploadErr.message)
        setSaving(false)
        setUploading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('student-photos').getPublicUrl(path)
      finalPhotoUrl = urlData.publicUrl
      setUploading(false)
    }

    const payload = {
      name: form.name.trim(),
      nis: form.nis.trim(),
      nisn: form.nisn.trim() || null,
      gender: form.gender,
      class_name: className,
      birth_place: form.birth_place.trim() || null,
      birth_date: form.birth_date || null,
      religion: form.religion || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      father_name: form.father_name.trim() || null,
      mother_name: form.mother_name.trim() || null,
      parent_phone: form.parent_phone.trim() || null,
      photo_url: finalPhotoUrl,
      custom_fields: customValues,
      updated_at: new Date().toISOString(),
    }

    if (student) {
      const { error: updateErr } = await supabase.from('students').update(payload).eq('id', student.id)
      if (updateErr) {
        setError('Gagal menyimpan perubahan.')
        setSaving(false)
        return
      }
    } else {
      const { error: insertErr } = await supabase.from('students').insert({ ...payload, user_id: user.id })
      if (insertErr) {
        setError('Gagal menambahkan siswa.')
        setSaving(false)
        return
      }
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">
            {isNew ? `Tambah Siswa — ${className}` : editMode ? 'Edit Biodata Siswa' : 'Biodata Siswa'}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && !editMode && (
              <button onClick={() => setEditMode(true)} className="btn-secondary text-xs px-3 py-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">

          {/* Photo + Nama + Kelas */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center text-indigo-700 font-bold text-lg">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt={form.name} className="w-full h-full object-cover" />
                ) : (
                  form.name ? getInitials(form.name) : <User className="w-8 h-8" />
                )}
              </div>
              {editMode && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md hover:bg-indigo-700"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <Row label="Nama Lengkap" value={form.name} editMode={editMode}>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </Row>
              <Row label="Kelas" value={className} editMode={editMode}>
                <input className="input bg-slate-50" value={className} disabled />
              </Row>
            </div>
          </div>

          {/* Identitas */}
          <div>
            <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Identitas</h3>
            <div className="grid grid-cols-2 gap-4">
              <Row label="NIS" value={form.nis} editMode={editMode}>
                <input className="input" value={form.nis} onChange={e => setForm({ ...form, nis: e.target.value })} />
              </Row>
              <Row label="NISN" value={form.nisn} editMode={editMode}>
                <input className="input" value={form.nisn} onChange={e => setForm({ ...form, nisn: e.target.value })} />
              </Row>
              <Row label="Jenis Kelamin" value={form.gender} editMode={editMode}>
                <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                  <option>Laki-laki</option>
                  <option>Perempuan</option>
                </select>
              </Row>
              <Row label="Agama" value={form.religion} editMode={editMode}>
                <select className="input" value={form.religion} onChange={e => setForm({ ...form, religion: e.target.value })}>
                  <option value="">-- Pilih --</option>
                  {RELIGION_OPTIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </Row>
              <Row label="Tempat Lahir" value={form.birth_place} editMode={editMode}>
                <input className="input" value={form.birth_place} onChange={e => setForm({ ...form, birth_place: e.target.value })} />
              </Row>
              <Row label="Tanggal Lahir" value={form.birth_date ? new Date(form.birth_date).toLocaleDateString('id-ID') : null} editMode={editMode}>
                <input type="date" className="input" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
              </Row>
            </div>
          </div>

          {/* Kontak & Alamat */}
          <div>
            <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Kontak & Alamat</h3>
            <div className="grid grid-cols-2 gap-4">
              <Row label="No. HP Siswa" value={form.phone} editMode={editMode}>
                <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </Row>
              <Row label="Alamat" value={form.address} editMode={editMode}>
                <input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </Row>
            </div>
          </div>

          {/* Orang Tua */}
          <div>
            <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Orang Tua</h3>
            <div className="grid grid-cols-2 gap-4">
              <Row label="Nama Ayah" value={form.father_name} editMode={editMode}>
                <input className="input" value={form.father_name} onChange={e => setForm({ ...form, father_name: e.target.value })} />
              </Row>
              <Row label="Nama Ibu" value={form.mother_name} editMode={editMode}>
                <input className="input" value={form.mother_name} onChange={e => setForm({ ...form, mother_name: e.target.value })} />
              </Row>
              <Row label="No. HP Orang Tua" value={form.parent_phone} editMode={editMode}>
                <input className="input" value={form.parent_phone} onChange={e => setForm({ ...form, parent_phone: e.target.value })} />
              </Row>
            </div>
          </div>

          {/* Kolom Kustom */}
          {customFields.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Data Tambahan</h3>
              <div className="grid grid-cols-2 gap-4">
                {customFields.map(f => (
                  <Row key={f.id} label={f.field_label} value={customValues[f.field_key]} editMode={editMode}>
                    <input
                      className="input"
                      value={customValues[f.field_key] ?? ''}
                      onChange={e => setCustomValues(prev => ({ ...prev, [f.field_key]: e.target.value }))}
                    />
                  </Row>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        {/* Footer */}
        {editMode && (
          <div className="flex gap-3 p-5 border-t border-slate-100 shrink-0">
            <button
              onClick={() => isNew ? onClose() : setEditMode(false)}
              className="btn-secondary flex-1 justify-center"
            >
              Batal
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              <Save className="w-4 h-4" />
              {saving ? (uploading ? 'Mengupload foto...' : 'Menyimpan...') : 'Simpan'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}