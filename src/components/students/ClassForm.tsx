'use client'


import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizeClassName } from '@/lib/normalizeClassName'
import SubjectInput from './SubjectInput'

export interface ClassFormData {
  name: string
  subjects: string[]
  homeroomTeacher: string
  isHomeroomOnly: boolean
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
  const supabase = createClient()

  const [classNames, setClassNames] = useState<string[]>([])

  const set = (patch: Partial<ClassFormData>) =>
    onChange({ ...data, ...patch })

  useEffect(() => {
    const loadClasses = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: classes } = await supabase
        .from('classes')
        .select('name')
        .eq('user_id', user.id)
        .order('name')

setClassNames(Array.isArray(classes) ? classes.map(c => c.name) : [])
if (!data) return null
if (!Array.isArray(classNames)) return null
    }
{/* <SubjectInput /> */}
    loadClasses()
  }, [supabase])

  const classExists = useMemo(() => {
  const normalized = normalizeClassName(data.name)

  const isEditing = !!currentClassName

  return classNames.some(c => {
    const same = normalizeClassName(c) === normalized

    if (!isEditing) return same

    return same && normalizeClassName(c) !== normalizeClassName(currentClassName!)
  })
}, [classNames, data.name, currentClassName])

  useEffect(() => {
    onClassExistsChange?.(classExists)
  }, [classExists, onClassExistsChange])

  const suggestions = useMemo(() => {
    const keyword = data.name.trim().toLowerCase()

    if (!keyword) return []

    const normalized = normalizeClassName(data.name)

    return classNames
      .filter(c => normalizeClassName(c) !== normalized)
      .filter(c => c.toLowerCase().includes(keyword))
      .slice(0, 8)
  }, [classNames, data.name])

  return (
    <div className="space-y-4">
      {/* Nama kelas */}
      <div className="relative">
        <label className="label">
  Nama Kelas <span className="text-red-500">*</span>
</label>

        <input
          className={`input ${
            classExists
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : ''
          }`}
          placeholder="Contoh: VI A, 8 A"
          value={data.name}
          autoComplete="off"
          autoFocus
          onChange={e => set({ name: e.target.value })}
        />

        {classExists && (
          <p className="mt-1 text-xs text-red-500">
            Nama kelas sudah digunakan.
          </p>
        )}

        {!classExists &&
          data.name.trim() &&
          suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto">
              {suggestions.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => set({ name })}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
      </div>

      {/* Wali kelas mengajar semua */}
<label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 hover:border-indigo-200 cursor-pointer transition-colors">
  <input
    type="checkbox"
    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
    checked={data.isHomeroomOnly}
    onChange={e => {
      const isChecked = e.target.checked
      set({
        isHomeroomOnly: isChecked,
        // Jika dicentang, otomatis kosongkan array subjects agar data clean
        subjects: isChecked ? [] : data.subjects 
      })
    }}
  />
  <div>
    <p className="text-sm font-medium text-slate-700">
      Wali kelas mengajar semua mata pelajaran
    </p>
    <p className="mt-0.5 text-xs text-slate-400">
      Cocok untuk guru SD. Jika dicentang, menu Absensi dan Nilai akan langsung menggunakan kelas ini tanpa memilih mata pelajaran.
    </p>
  </div>
</label>

      {/* Mata pelajaran */}
      <div className={data.isHomeroomOnly ? 'opacity-50' : ''}>
        <label className="label">
          Mata Pelajaran{' '}
          {data.isHomeroomOnly && (
            <span className="font-normal text-slate-400">
              (opsional)
            </span>
          )}
        </label>

        <SubjectInput
          value={data.subjects}
          onChange={subjects =>
            set({ subjects })
          }
        />
      </div>

      {/* Wali kelas */}
      <div>
        <label className="label">
  Nama Wali Kelas <span className="text-red-500">*</span>
</label>

        <input
          className="input"
          placeholder="Contoh: Ibu Siti Aminah, S.Pd."
          value={data.homeroomTeacher}
          onChange={e =>
            set({
              homeroomTeacher: e.target.value,
            })
          }
        />
      </div>
    </div>
  )
}