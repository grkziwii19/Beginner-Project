import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const path = req.nextUrl.pathname

  // skip onboarding page
  if (path.startsWith('/onboarding')) return res

  const { data: { user } } = await supabase.auth.getUser()

  // allow public routes (IMPORTANT FOR PWA)
  const publicRoutes = ['/login', '/register', '/manifest.webmanifest', '/sw.js', '/offline.html']
  if (publicRoutes.some(r => path.startsWith(r))) {
    return res
  }

  // no user -> redirect login
  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) {
    const url = req.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next|auth|icons|favicon|manifest\\.webmanifest|sw\\.js|offline\\.html).*)',
  ],
}
