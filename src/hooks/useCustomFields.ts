'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type CustomFieldDefinition } from '@/types'

export function useCustomFields() {
  const supabase = createClient()
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFields = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order')
    setFields(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchFields() }, [fetchFields])

  const addField = async (label: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Tidak terautentikasi' }

    const trimmed = label.trim()
    if (!trimmed) return { error: 'Nama kolom tidak boleh kosong.' }

    const key = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')

    if (!key) return { error: 'Nama kolom tidak valid.' }

    const { error } = await supabase.from('custom_field_definitions').insert({
      user_id: user.id,
      field_key: key,
      field_label: trimmed,
      sort_order: fields.length,
    })

    if (error) {
      return { error: error.code === '23505' ? 'Kolom dengan nama ini sudah ada.' : 'Gagal menambahkan kolom.' }
    }

    await fetchFields()
    return { error: null }
  }

  const removeField = async (id: string) => {
    await supabase.from('custom_field_definitions').delete().eq('id', id)
    await fetchFields()
  }

  return { fields, loading, addField, removeField, refetch: fetchFields }
}
