import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const origin = url.origin

  // Siapkan response redirect lebih dulu, supaya cookie bisa ditulis LANGSUNG ke objek ini.
  // Ini kuncinya: di Route Handler, cookies() dari next/headers tidak reliable untuk
  // menulis Set-Cookie ke response. Harus pakai NextResponse secara eksplisit.
  const response = NextResponse.redirect(`${origin}/`)

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.headers.get('cookie')
              ?.split(';')
              .map((c) => {
                const [name, ...rest] = c.trim().split('=')
                return { name, value: rest.join('=') }
              }) ?? []
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth exchange error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
    }
  }

  return response
}