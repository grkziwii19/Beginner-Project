import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const path = req.nextUrl.pathname

  // ✅ skip next internals + static files + pwa
  if (
    path.startsWith('/_next') ||
    path.startsWith('/icons') ||
    path.startsWith('/favicon') ||
    path.startsWith('/manifest') ||
    path === '/sw.js' ||
    path === '/offline.html'
  ) {
    return res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ✅ public routes (STRICT match, bukan startsWith)
  const publicRoutes = ['/login', '/register']

  if (publicRoutes.includes(path)) {
    return res
  }

  // allow unauthenticated for auth callback
  if (path.startsWith('/auth')) {
    return res
  }

  // ❌ no user → login
  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Catatan: cek onboarding_completed dipindah ke
  // src/app/(dashboard)/layout.tsx — middleware sekarang hanya
  // melakukan SATU panggilan network (auth.getUser), bukan dua.
  // Ini mengurangi risiko MIDDLEWARE_INVOCATION_TIMEOUT saat
  // Supabase lambat merespons.

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}