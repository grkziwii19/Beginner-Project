'use client'

import { AlertTriangle, X } from 'lucide-react'

interface Props { onConfirm: () => void; onCancel: () => void }

export default function ConfirmSemesterModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Aktifkan Mode Nilai Semester?</h2>
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">Nilai semester akan digunakan langsung untuk generate rapor. Pastikan Anda menginput dengan teliti dan hati-hati.</p>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Batal</button>
          <button onClick={onConfirm} className="btn-primary flex-1 justify-center">Ya, Lanjutkan</button>
        </div>
      </div>
    </div>
  )
}
