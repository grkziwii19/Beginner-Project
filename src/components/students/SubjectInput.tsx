'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { COMMON_SUBJECTS } from '@/types'

interface Props {
  value: string[]
  onChange: (subjects: string[]) => void
  disabled?: boolean
}

export default function SubjectInput({ value, onChange, disabled = false }: Props) {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = COMMON_SUBJECTS.filter(
    s => s.toLowerCase().includes(query.toLowerCase()) && !value.includes(s)
  ).slice(0, 6)

  const addSubject = (subject: string) => {
    if (disabled) return
    const trimmed = subject.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setQuery('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeSubject = (subject: string) => {
    if (disabled) return
    onChange(value.filter(s => s !== subject))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim()) addSubject(query)
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      removeSubject(value[value.length - 1])
    }
  }

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none select-none' : ''}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map(subject => (
            <span key={subject} className="badge bg-indigo-50 text-indigo-700 gap-1.5 py-1.5 px-2.5">
              {subject}
              {!disabled && (
                <button onClick={() => removeSubject(subject)} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          className="input"
          placeholder={disabled ? 'Tidak diperlukan' : 'Ketik nama mapel, contoh: Matematika'}
          value={query}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setShowSuggestions(true) }}
          onFocus={() => !disabled && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
        />

        {!disabled && showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => addSubject(s)}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {!disabled && (
        <p className="text-xs text-slate-400 mt-1.5">
          Ketik lalu pilih Mata Pelajaran.
        </p>
      )}
    </div>
  )
}
