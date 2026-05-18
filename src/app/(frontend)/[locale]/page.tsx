import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { PendingTasksWidget } from '@/components/dashboard/PendingTasksWidget'
import { ExpiringDocumentsWidget } from '@/components/dashboard/ExpiringDocumentsWidget'
import { DocumentsByStatusChart } from '@/components/dashboard/DocumentsByStatusChart'
import { UserRole, DocumentStatus } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('dashboard')

  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) redirect(`/${locale}/login`)

  const payload = await getPayload({ config })

  // Fetch current user using proper request headers (Payload 3.x pattern)
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })
  if (!user) redirect(`/${locale}/login`)

  const userRole = user.role as UserRole
  const userName = user.name || `${(user as { firstName?: string }).firstName || ''} ${(user as { lastName?: string }).lastName || ''}`.trim()

  // Parallel data fetch for dashboard widgets
  const [totalDocs, pendingTasks, expiringDocs, pendingConfirmations, docsByStatus] =
    await Promise.all([
      payload.count({ collection: 'documents' }),
      payload.count({
        collection: 'approval-tasks',
        where: { and: [{ assignedTo: { equals: user.id } }, { status: { equals: 'offen' } }] },
      }),
      payload.count({
        collection: 'documents',
        where: {
          and: [
            { status: { equals: DocumentStatus.APPROVED } },
            { validUntil: { less_than: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() } },
            { validUntil: { greater_than: new Date().toISOString() } },
          ],
        },
      }),
      payload.count({
        collection: 'read-confirmations',
        where: { user: { not_equals: user.id } },
      }),
      payload.find({
        collection: 'documents',
        limit: 0,
        where: {},
      }),
    ])

  const stats = {
    totalDocuments: totalDocs.totalDocs,
    pendingTasks: pendingTasks.totalDocs,
    expiringDocuments: expiringDocs.totalDocs,
    readConfirmationsPending: pendingConfirmations.totalDocs,
  }

  const isManagerRole =
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.QM_OFFICER ||
    userRole === UserRole.DEPT_HEAD

  return (
    <AppShell locale={locale} userRole={userRole} userName={userName} pageTitle={t('title')}>
      <div className="space-y-6">
        {/* Welcome */}
        <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
          {t('welcome', { name: userName })}
        </h2>

        {/* Stats row */}
        <DashboardStats stats={stats} locale={locale} userRole={userRole} />

        {/* Widgets grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <PendingTasksWidget userId={String(user.id)} locale={locale} />
          {isManagerRole && <ExpiringDocumentsWidget locale={locale} />}
          {isManagerRole && <DocumentsByStatusChart locale={locale} />}
        </div>
      </div>
    </AppShell>
  )
}
