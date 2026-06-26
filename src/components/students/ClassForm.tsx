'use client'

import SubjectInput from './SubjectInput'

export interface ClassFormData {
  name: string
  subjects: string[]
  homeroomTeacher: string
  isHomeroomOnly: boolean
}

interface Props {
  data: ClassFormData
  onChange: (data: ClassFormData) => void
}

export default function ClassForm({ data, onChange }: Props) {
  const set = (patch: Partial<ClassFormData>) => onChange({ ...data, ...patch })

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Nama Kelas</label>
        <input
          className="input"
          placeholder="Contoh: VI A, 8 A"
          value={data.name}
          onChange={e => set({ name: e.target.value })}
          autoFocus
        />
      </div>

      {/* Opsi wali kelas mengajar semua mapel */}
      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-200 cursor-pointer transition-colors">
        <input
          type="checkbox"
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          checked={data.isHomeroomOnly}
          onChange={e => set({ isHomeroomOnly: e.target.checked })}
        />
        <div>
          <p className="text-sm font-medium text-slate-700">Wali kelas mengajar semua mata pelajaran</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Cocok untuk guru SD. Jika dicentang, menu Absensi dan Nilai akan
            langsung masuk ke kelas ini tanpa perlu memilih mata pelajaran.
          </p>
        </div>
      </label>

      <div className={data.isHomeroomOnly ? 'opacity-50' : ''}>
        <label className="label">
          Mata Pelajaran {data.isHomeroomOnly && <span className="text-slate-400 font-normal">(opsional)</span>}
        </label>
        <SubjectInput value={data.subjects} onChange={subjects => set({ subjects })} />
      </div>

      <div>
        <label className="label">Nama Wali Kelas</label>
        <input
          className="input"
          placeholder="Contoh: Ibu Siti Aminah, S.Pd."
          value={data.homeroomTeacher}
          onChange={e => set({ homeroomTeacher: e.target.value })}
        />
      </div>
    </div>
  )
}
