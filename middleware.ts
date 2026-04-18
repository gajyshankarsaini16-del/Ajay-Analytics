import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE = 'dc_auth'
const VALID_EMAIL = 'gajyshankar.925006@gmail.com'
const VALID_PASS  = 'Gajyshankar@925006'

const PUBLIC_PREFIXES = ['/f/', '/login', '/api/auth', '/api/forms/', '/api/submissions', '/_next', '/favicon']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get(AUTH_COOKIE)
  if (cookie?.value === `${VALID_EMAIL}:${VALID_PASS}`) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
