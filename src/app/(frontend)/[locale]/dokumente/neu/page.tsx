import { getTranslations } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { UserRole } from '@/lib/types'
import { NewDocumentForm } from '@/components/documents/NewDocumentForm'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function NewDocumentPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('documents')

  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) redirect(`/${locale}/login`)

  const payload = await getPayload({ config })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })
  if (!user) redirect(`/${locale}/login`)

  const userRole = (user as { role?: string }).role as UserRole
  const u = user as Record<string, unknown>
  const userName = (u.name as string) || `${u.firstName || ''} ${u.lastName || ''}`.trim()

  const canCreate =
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.QM_OFFICER ||
    userRole === UserRole.DEPT_HEAD ||
    userRole === UserRole.PHYSICIAN

  if (!canCreate) redirect(`/${locale}/dokumente`)

  // Fetch available users for owner/reviewer/approver fields
  const users = await payload.find({
    collection: 'users',
    where: { isActive: { equals: true } },
    limit: 200,
    depth: 0,
  })

  const userOptions = users.docs.map((u) => ({
    id: String(u.id),
    name: String(u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email),
    role: String(u.role),
  }))

  return (
    <AppShell locale={locale} userRole={userRole} userName={userName} pageTitle={t('upload.title')}>
      <div className="mx-auto max-w-2xl space-y-5">
        <Link
          href={`/${locale}/dokumente`}
          className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('title')}
        </Link>

        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <h1 className="mb-5 text-xl font-bold">{t('upload.title')}</h1>
          <NewDocumentForm
            locale={locale}
            currentUserId={String(user.id)}
            userOptions={userOptions}
          />
        </div>
      </div>
    </AppShell>
  )
}
