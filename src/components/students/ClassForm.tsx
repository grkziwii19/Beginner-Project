'use client'

import { Dispatch, SetStateAction, useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizeClassName, isValidClassName } from '@/lib/normalizeClassName'
import SubjectInput from './SubjectInput'

export interface ClassFormData {
  name: string
  subjects: string[]
  homeroomTeacher: string
  attendanceMethod: 'harian_1x' | 'harian_2x' | 'harian_3x' | 'per_mapel' // Menggantikan isHomeroomOnly
}

interface Props {
  data: ClassFormData
  onChange: Dispatch<SetStateAction<ClassFormData>>
  onClassExistsChange: Dispatch<SetStateAction<boolean>>
  currentClassName?: string
}

export default function ClassForm({
  data,
  onChange,
  onClassExistsChange,
  currentClassName,
}: Props) {
  // Mempertahankan perbaikan lazy initializer supabase client agar tidak re-render tak berujung
  const [supabase] = useState(() => createClient())

  const [classNames, setClassNames] = useState<string[]>([])
  const [nameFocused, setNameFocused] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  const set = (patch: Partial<ClassFormData>) =>
    onChange({ ...data, ...patch })

  // Mempertahankan perbaikan dependency array kosong ([])
  useEffect(() => {
    const loadClasses = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: classes } = await supabase
        .from('classes')
        .select('name')
        .eq('user_id', user.id)
        .order('name')

      setClassNames(Array.isArray(classes) ? classes.map(c => c.name) : [])
    }

    loadClasses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const normalizedCurrent = currentClassName ? normalizeClassName(currentClassName) : null

  const classExists = useMemo(() => {
    const normalizedInput = normalizeClassName(data.name)
    if (!normalizedInput) return false

    return classNames.some(c => {
      const normalizedExisting = normalizeClassName(c)
      const isSameAsInput = normalizedExisting === normalizedInput

      if (!isSameAsInput) return false

      if (normalizedCurrent && normalizedExisting === normalizedCurrent) {
        return false
      }

      return true
    })
  }, [classNames, data.name, normalizedCurrent])

  useEffect(() => {
    onClassExistsChange(classExists)
  }, [classExists, onClassExistsChange])

  const suggestions = useMemo(() => {
    const keyword = data.name.trim().toLowerCase()
    if (!keyword) return []

    const normalizedInput = normalizeClassName(data.name)

    return classNames
      .filter(c => normalizeClassName(c) !== normalizedInput)
      .filter(c => c.toLowerCase().includes(keyword))
      .slice(0, 8)
  }, [classNames, data.name])

  const showFormatWarning = data.name.trim().length > 0 && !isValidClassName(data.name)

  // Dropdown saran nama kelas hanya tampil selagi field-nya sedang fokus.
  // Tanpa ini, dropdown (tinggi hingga 224px) bisa tetap terbuka dan menimpa
  // field Metode Absensi / Mata Pelajaran di bawahnya, menangkap klik yang
  // seharusnya jatuh ke field tersebut.
  const showNameSuggestions =
    nameFocused && !classExists && data.name.trim() && suggestions.length > 0

  return (
    <div className="space-y-4">
      {/* Nama kelas */}
      <div className="relative">
        <label className="label">
          Nama Kelas <span className="text-red-500">*</span>
        </label>

        <input
          ref={nameInputRef}
          className={`input ${
            classExists ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder="Contoh: VI A, 8 A"
          value={data.name}
          autoComplete="off"
          onFocus={() => setNameFocused(true)}
          onBlur={() => setTimeout(() => setNameFocused(false), 150)}
          onChange={e => set({ name: e.target.value })}
        />

        {classExists && (
          <p className="mt-1 text-xs text-red-500">
            Nama kelas sudah digunakan (termasuk variasi penulisan seperti spasi, tanda hubung, atau angka Romawi).
          </p>
        )}

        {!classExists && showFormatWarning && (
          <p className="mt-1 text-xs text-amber-500">
            Format belum dikenali. Contoh yang valid: VI A, 6A, atau Kelas VI A.
          </p>
        )}

        {showNameSuggestions && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto">
            {suggestions.map(name => (
              <button
                key={name}
                type="button"
                onMouseDown={e => {
                  e.preventDefault()
                  set({ name })
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Metode Absensi (Menggantikan Checkbox isHomeroomOnly) */}
      <div className="flex flex-col gap-1">
        <label className="label">
          Metode Absensi <span className="text-red-500">*</span>
        </label>
        <select
          className="input bg-white border border-slate-300 hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm font-medium text-slate-800 h-[38px] px-3 w-full"
          value={data.attendanceMethod}
          onChange={e => set({ attendanceMethod: e.target.value as any })}
        >
          <option value="per_mapel">Per Mata Pelajaran</option>
          <option value="harian_1x">Harian (1x)</option>
          <option value="harian_2x">Harian (2x)</option>
          <option value="harian_3x">Harian (3x)</option>
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Pilih bagaimana presensi kelas ini akan dicatat setiap harinya.
        </p>
      </div>

      {/* Mata pelajaran (Selalu aktif karena diperlukan untuk input Nilai & Catatan) */}
      <div>
        <label className="label">
          Mata Pelajaran <span className="text-red-500">*</span>
        </label>

        <SubjectInput
          value={data.subjects}
          onChange={subjects => set({ subjects })}
        />
        <p className="mt-1 text-xs text-slate-400">
          Daftar mata pelajaran yang diajarkan (wajib diisi untuk pengisian data nilai & catatan siswa).
        </p>
      </div>

      {/* Wali kelas */}
      <div>
        <label className="label">
          Nama Wali Kelas <span className="text-red-500">*</span>
        </label>

        <input
          className="input"
          placeholder="Contoh: Sudirman, S.Pd."
          value={data.homeroomTeacher}
          onChange={e => set({ homeroomTeacher: e.target.value })}
        />
      </div>
    </div>
  )
}