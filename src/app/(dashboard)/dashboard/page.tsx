'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      if (!data?.onboarding_completed) {
        router.push('/onboarding')
      }
    }

    check()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Selamat datang</p>
    </div>
  )
}