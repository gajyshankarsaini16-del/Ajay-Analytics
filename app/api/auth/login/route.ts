import { NextResponse } from 'next/server'

const VALID_EMAIL = 'gajyshankar.925006@gmail.com'
const VALID_PASS  = 'Gajyshankar@925006'
const AUTH_COOKIE = 'dc_auth'

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (email === VALID_EMAIL && password === VALID_PASS) {
    const res = NextResponse.json({ success: true })
    res.cookies.set(AUTH_COOKIE, `${email}:${password}`, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 1,
      path:     '/',
    })
    return res
  }

  return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
}
