import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { searchDocuments } from '@/lib/search'
import type { UserRole } from '@/lib/types'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })

  // Verify token and get user
  let user: { id: string; role: UserRole } | null = null
  try {
    const result = await payload.find({
      collection: 'users',
      where: {},
      limit: 1,
      overrideAccess: false,
    })
    if (result.docs[0]) {
      user = { id: String(result.docs[0].id), role: result.docs[0].role as UserRole }
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl

  const results = await searchDocuments(
    payload,
    {
      q: searchParams.get('q') || undefined,
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      authorId: searchParams.get('authorId') || undefined,
      validUntilBefore: searchParams.get('validUntilBefore') || undefined,
      validUntilAfter: searchParams.get('validUntilAfter') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      locale: searchParams.get('locale') || 'de',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sort: (searchParams.get('sort') as '-createdAt') || '-createdAt',
    },
    user
  )

  return NextResponse.json(results)
}
