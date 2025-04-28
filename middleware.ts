// File: middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: [
    '/:clientId/:businessId/dashboard',
    '/:clientId/:businessId/competitors',
    '/:clientId/:businessId/posts',
    '/businesses',

    '/:clientId/:businessId/dashboard/:path*',
    '/:clientId/:businessId/competitors/:path*',
    '/:clientId/:businessId/posts/:path*',
    '/:clientId/:businessId/businesses/:path*',
  ],
}

export async function middleware(req: NextRequest) {
  // 📌 1) Don’t run this middleware on any /api routes:
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 2) Grab our session cookie
  const sessionId = req.cookies.get('session_id')?.value
  if (!sessionId) {
    // no cookie → redirect to login
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // 3) Validate it against our own API
  const apiUrl = new URL('/api/session', req.url)
  const check = await fetch(apiUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // we also forward the cookie here so the API can read it server-side
      'Cookie': `session_id=${sessionId}`,
    },
    body: JSON.stringify({ action: 'check' }),
  })

  if (!check.ok) {
    // API returned an error (4xx/5xx) → kick to login
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('session_expired', 'true')
    return NextResponse.redirect(loginUrl)
  }

  const { active } = await check.json()
  if (!active) {
    // session invalid → clear cookie + redirect
    const redirectRes = NextResponse.redirect(new URL('/auth/login', req.url))
    redirectRes.cookies.delete({ name: 'session_id', path: '/' })
    return redirectRes
  }

  // all good
  return NextResponse.next()
}
