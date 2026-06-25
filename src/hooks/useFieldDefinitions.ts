'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type FieldDefinition, type FieldType } from '@/types'

export function useFieldDefinitions() {
  const supabase = createClient()
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFields = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('field_definitions')
      .select('*')
      .eq('user_id', user.id)
      .order('field_group')
      .order('sort_order')
    setFields(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchFields() }, [fetchFields])

  const addField = async (label: string, group: string, type: FieldType, options?: string[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Tidak terautentikasi' }

    const key = label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')

    if (!key) return { error: 'Nama kategori tidak valid.' }

    const { error } = await supabase.from('field_definitions').insert({
      user_id: user.id,
      field_key: key,
      field_label: label.trim(),
      field_type: type,
      field_group: group.trim() || 'Lainnya',
      options: options && options.length ? options : null,
      sort_order: fields.length,
    })

    if (error) {
      return { error: error.code === '23505' ? 'Kategori dengan nama ini sudah ada.' : 'Gagal menambahkan kategori.' }
    }

    await fetchFields()
    return { error: null }
  }

  const removeField = async (id: string) => {
    await supabase.from('field_definitions').delete().eq('id', id)
    await fetchFields()
  }

  return { fields, loading, addField, removeField, refetch: fetchFields }
}
