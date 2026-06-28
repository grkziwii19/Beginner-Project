'use client'

import { Dispatch, SetStateAction, useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizeClassName, isValidClassName } from '@/lib/normalizeClassName'
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
  // PERBAIKAN: createClient() di-panggil lewat useState lazy initializer,
  // bukan dipanggil langsung di body komponen. Ini memastikan instance
  // supabase HANYA dibuat sekali (saat mount pertama), bukan dibuat ulang
  // setiap kali komponen ini re-render — yang sebelumnya menjadi pemicu
  // utama bug "tidak bisa tambah mata pelajaran" (lihat komentar di
  // useEffect loadClasses di bawah).
  const [supabase] = useState(() => createClient())

  const [classNames, setClassNames] = useState<string[]>([])
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  const set = (patch: Partial<ClassFormData>) =>
    onChange({ ...data, ...patch })

  // PERBAIKAN: dependency array dikosongkan ([]), bukan [supabase].
  // createClient() membuat instance baru setiap render, sehingga
  // dependency [supabase] menyebabkan efek ini (dan fetch ke Supabase
  // di dalamnya) berjalan ULANG setiap kali komponen re-render —
  // termasuk setiap kali pengguna mengetik atau menambah mata pelajaran.
  // Fetch berulang ini berlomba dengan update state form, dan dalam
  // kondisi normal (tanpa DevTools memperlambat browser), hasil fetch
  // yang telat itu bisa "menimpa balik" perubahan yang baru saja dibuat
  // pengguna — inilah sebabnya menambah mapel tampak gagal kecuali
  // DevTools terbuka (yang membuat timing fetch jadi lebih lambat,
  // sehingga tidak lagi sempat menimpa).
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
              subjects: isChecked ? [] : data.subjects,
            })
          }}
        />
        <div>
          <p className="text-sm font-medium text-slate-700">
            Wali Kelas
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Pilih Wali Kelas jika Anda mengajar seluruh Mata Pelajaran di kelas ini.
          </p>
        </div>
      </label>

      {/* Mata pelajaran */}
      <div>
        <label className="label">
          Mata Pelajaran{' '}
          {data.isHomeroomOnly && (
            <span className="font-normal text-slate-400">(tidak diperlukan)</span>
          )}
        </label>

        <SubjectInput
          value={data.subjects}
          onChange={subjects => set({ subjects })}
          disabled={data.isHomeroomOnly}
        />
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
