import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { validateSamlResponse, mapGroupsToRole } from '@/lib/auth/saml-strategy'
import { writeLoginAudit } from '@/lib/audit/logger'
import type { UserRole } from '@/lib/types'

export async function POST(req: NextRequest) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const ip = req.headers.get('x-forwarded-for') || 'unknown'

  try {
    const formData = await req.formData()
    const body: Record<string, string> = {}
    formData.forEach((value, key) => {
      body[key] = value.toString()
    })

    const profile = await validateSamlResponse(body)
    const payload = await getPayload({ config })

    // Fetch role mapping from site settings
    let roleMapping: Array<{ adGroup: string; role: string }> = []
    try {
      const settings = await payload.findGlobal({ slug: 'site-settings' })
      roleMapping = (settings.samlRoleMapping as typeof roleMapping) || []
    } catch {
      // Use default mapping if settings not yet configured
    }

    const role: UserRole = mapGroupsToRole(profile.groups, roleMapping)

    // Upsert user
    const existingUsers = await payload.find({
      collection: 'users',
      where: { email: { equals: profile.email } },
      limit: 1,
    })

    let userId: string

    if (existingUsers.docs.length > 0) {
      const existingUser = existingUsers.docs[0]
      await payload.update({
        collection: 'users',
        id: existingUser.id,
        data: {
          firstName: profile.firstName || existingUser.firstName,
          lastName: profile.lastName || existingUser.lastName,
          ssoSubject: profile.nameId,
          lastLogin: new Date().toISOString(),
        },
      })
      userId = String(existingUser.id)
    } else {
      const newUser = await payload.create({
        collection: 'users',
        data: {
          email: profile.email,
          firstName: profile.firstName || profile.email.split('@')[0],
          lastName: profile.lastName || '',
          name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
          role,
          ssoSubject: profile.nameId,
          isActive: true,
          lastLogin: new Date().toISOString(),
          password: crypto.randomUUID(), // Random password, SSO-only
        },
      })
      userId = String(newUser.id)
    }

    await writeLoginAudit(
      payload,
      userId,
      `${profile.firstName} ${profile.lastName}`.trim(),
      role,
      ip,
      true
    )

    // Issue a Payload session token
    const loginResult = await payload.login({
      collection: 'users',
      data: { email: profile.email, password: '' },
      req: undefined as unknown as Parameters<typeof payload.login>[0]['req'],
    })

    const response = NextResponse.redirect(`${serverUrl}/de`)
    if (loginResult.token) {
      response.cookies.set('payload-token', loginResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 900, // 15 minutes
        path: '/',
      })
    }

    return response
  } catch (err) {
    console.error('[SAML Callback] Error:', err)
    return NextResponse.redirect(`${serverUrl}/de/login?error=sso_failed`)
  }
}
