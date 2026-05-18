import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ message: 'E-Mail und Passwort erforderlich.' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Validate credentials — throws AuthenticationError if wrong
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    if (!result.token || !result.user) {
      return NextResponse.json({ message: 'Ungültige Anmeldedaten.' }, { status: 401 })
    }

    const user = result.user as typeof result.user & {
      mfaEnabled?: boolean
      isActive?: boolean
    }

    // Block deactivated users
    if (user.isActive === false) {
      return NextResponse.json({ message: 'Konto deaktiviert.' }, { status: 403 })
    }

    // MFA required — store token temporarily, don't issue session yet
    if (user.mfaEnabled) {
      const response = NextResponse.json({ requiresMFA: true })
      const cookieOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 300, // 5 minutes to complete MFA
        path: '/',
      }
      response.cookies.set('mfa-pending-user', String(user.id), cookieOpts)
      response.cookies.set('mfa-pending-token', result.token, cookieOpts)
      return response
    }

    // Issue session cookie explicitly
    const response = NextResponse.json({
      token: result.token,
      user: result.user,
      exp: result.exp,
    })

    response.cookies.set('payload-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 900, // 15 minutes — matches tokenExpiration in Users collection
      path: '/',
    })

    // Update last login timestamp
    try {
      await payload.update({
        collection: 'users',
        id: result.user.id,
        data: { lastLogin: new Date().toISOString() },
        overrideAccess: true,
      })
    } catch {
      // Best-effort, don't block login
    }

    return response
  } catch {
    return NextResponse.json({ message: 'Ungültige Anmeldedaten.' }, { status: 401 })
  }
}
