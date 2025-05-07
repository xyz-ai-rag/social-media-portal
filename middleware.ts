// File: middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: [
    '/:clientId/:businessId/dashboard',
    '/:clientId/:businessId/competitors',
    '/:clientId/:businessId/posts',
    '/businesses',
  ],
}

export async function middleware(req: NextRequest) {
  // 📌 1) Don't run this middleware on any /api routes:
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 2) Grab our session cookie
  const sessionId = req.cookies.get('session_id')?.value
  if (!sessionId) {
    // no cookie → redirect to login
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  try {
    // 3) Validate it against our own API
    // Use a relative URL and ensure protocol matches the current request
    const host = req.headers.get('host') || 'localhost'
    const protocol = req.headers.get('x-forwarded-proto') || 
                    (host.includes('localhost') ? 'http' : 'https')
    
    const apiUrl = `${protocol}://${host}/api/session`
    
    const check = await fetch(apiUrl, {
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

    // refresh cookie
    const res = NextResponse.next()
    res.cookies.set({
      name:     'session_id',
      value:    sessionId,
      httpOnly: true,
      path:     '/',
      maxAge:   60 * 60 * 24 * 365 * 10, // 10年
      sameSite: 'strict',
    })
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    
    // Fallback to API route if fetch fails
    // This is an alternative approach that avoids the fetch request
    const res = NextResponse.next()
    
    // Add a header that your API can check to validate the session
    // You'll need to modify your API to check for this header
    res.headers.set('X-Check-Session', sessionId)
    
    return res
  }
}