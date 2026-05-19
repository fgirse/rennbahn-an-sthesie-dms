import { getTranslations } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Clock, AlertTriangle, BookOpen, FileCheck } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge'
import { UserRole } from '@/lib/types'
import { extractId } from '@/lib/extractId'
import { format } from 'date-fns'
import { de, enUS, fr, it } from 'date-fns/locale'

const dateFnsLocales = { de, en: enUS, fr, it }

type Props = {
  params: Promise<{ locale: string }>
}

export default async function TasksPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('tasks')

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
  const dtLocale = dateFnsLocales[locale as keyof typeof dateFnsLocales] || de

  // Fetch open approval tasks assigned to this user
  const approvalTasks = await payload.find({
    collection: 'approval-tasks',
    where: {
      and: [
        { assignedTo: { equals: user.id } },
        { status: { equals: 'offen' } },
      ],
    },
    depth: 2,
    sort: 'dueDate',
    limit: 50,
  })

  // Fetch documents requiring read confirmation (approved, requiresReadConfirmation)
  const approvedDocs = await payload.find({
    collection: 'documents',
    where: {
      and: [
        { status: { equals: 'freigegeben' } },
        { requiresReadConfirmation: { equals: true } },
      ],
    },
    depth: 1,
    sort: '-updatedAt',
    limit: 100,
    locale: locale as 'de' | 'en' | 'fr' | 'it',
    overrideAccess: false,
    user,
  })

  // Find which documents user has NOT yet confirmed
  const existingConfirmations = await payload.find({
    collection: 'read-confirmations',
    where: { user: { equals: user.id } },
    limit: 500,
  })

  const confirmedDocVersions = new Set(
    existingConfirmations.docs.map(
      (c) => `${String(typeof c.document === 'object' ? c.document.id : c.document)}_${String(c.documentVersion)}`
    )
  )

  const pendingConfirmations = approvedDocs.docs.filter((doc) => {
    const key = `${String(doc.id)}_${String(doc.currentVersion || '1.0')}`
    return !confirmedDocVersions.has(key)
  })

  const now = new Date()

  const overdueApprovalTasks = approvalTasks.docs.filter(
    (task) => task.dueDate && new Date(String(task.dueDate)) < now
  )
  const upcomingApprovalTasks = approvalTasks.docs.filter(
    (task) => !task.dueDate || new Date(String(task.dueDate)) >= now
  )

  const taskTypeLabels: Record<string, string> = {
    pruefung: t('taskType.pruefung'),
    freigabe: t('taskType.freigabe'),
    lesebestaetigung: t('taskType.lesebestaetigung'),
  }

  const statusLabels: Record<string, string> = {
    entwurf: 'Entwurf',
    in_pruefung: 'In Prüfung',
    freigegeben: 'Freigegeben',
    in_revision: 'In Revision',
    archiviert: 'Archiviert',
  }

  const totalPending = approvalTasks.docs.length + pendingConfirmations.length

  return (
    <AppShell locale={locale} userRole={userRole} userName={userName} pageTitle={t('title')}>
      <div className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: t('pending'),
              value: totalPending,
              icon: Clock,
              color: 'text-amber-600',
              bg: 'bg-amber-50 border-amber-200',
            },
            {
              label: t('overdue'),
              value: overdueApprovalTasks.length,
              icon: AlertTriangle,
              color: 'text-red-600',
              bg: 'bg-red-50 border-red-200',
            },
            {
              label: t('taskType.pruefung') + '/' + t('taskType.freigabe'),
              value: approvalTasks.docs.length,
              icon: FileCheck,
              color: 'text-blue-600',
              bg: 'bg-blue-50 border-blue-200',
            },
            {
              label: t('taskType.lesebestaetigung'),
              value: pendingConfirmations.length,
              icon: BookOpen,
              color: 'text-purple-600',
              bg: 'bg-purple-50 border-purple-200',
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`flex items-center gap-3 rounded-xl border p-4 ${bg}`}>
              <Icon className={`h-6 w-6 flex-shrink-0 ${color}`} />
              <div>
                <p className="text-2xl font-bold text-[var(--color-foreground)]">{value}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Overdue tasks */}
        {overdueApprovalTasks.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-3">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h2 className="font-semibold text-red-900">{t('overdue')}</h2>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {overdueApprovalTasks.map((task) => {
                const doc = typeof task.document === 'object' ? task.document : null
                return (
                  <div key={String(task.id)} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          {taskTypeLabels[String(task.taskType)] ?? String(task.taskType)}
                        </span>
                        {doc && (
                          <Link
                            href={`/${locale}/dokumente/${extractId(doc.id)}`}
                            className="truncate font-medium text-[var(--color-primary)] hover:underline"
                          >
                            {String(doc.title || '—')}
                          </Link>
                        )}
                      </div>
                      {task.dueDate && (
                        <p className="mt-0.5 text-xs text-red-600">
                          Fällig: {format(new Date(String(task.dueDate)), 'PPP', { locale: dtLocale })}
                        </p>
                      )}
                    </div>
                    {doc && (
                      <Link
                        href={`/${locale}/dokumente/${extractId(doc.id)}`}
                        className="flex-shrink-0 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        Öffnen
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Approval tasks */}
        {upcomingApprovalTasks.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
            <div className="border-b border-[var(--color-border)] px-5 py-3">
              <h2 className="font-semibold">{t('taskType.pruefung')} &amp; {t('taskType.freigabe')}</h2>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {upcomingApprovalTasks.map((task) => {
                const doc = typeof task.document === 'object' ? task.document : null
                return (
                  <div key={String(task.id)} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            task.taskType === 'freigabe'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {taskTypeLabels[String(task.taskType)] ?? String(task.taskType)}
                        </span>
                        {doc && (
                          <Link
                            href={`/${locale}/dokumente/${extractId(doc.id)}`}
                            className="truncate font-medium text-[var(--color-primary)] hover:underline"
                          >
                            {String(doc.title || '—')}
                          </Link>
                        )}
                        {doc && (
                          <DocumentStatusBadge
                            status={String(doc.status)}
                            label={statusLabels[String(doc.status)] ?? String(doc.status)}
                          />
                        )}
                      </div>
                      {task.dueDate && (
                        <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                          {t('dueDate')}: {format(new Date(String(task.dueDate)), 'PPP', { locale: dtLocale })}
                        </p>
                      )}
                    </div>
                    {doc && (
                      <Link
                        href={`/${locale}/dokumente/${extractId(doc.id)}`}
                        className="flex-shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-muted)]"
                      >
                        Öffnen
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pending read confirmations */}
        {pendingConfirmations.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3">
              <BookOpen className="h-4 w-4 text-purple-600" />
              <h2 className="font-semibold">{t('taskType.lesebestaetigung')}</h2>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {pendingConfirmations.map((doc) => (
                <div key={String(doc.id)} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${locale}/dokumente/${extractId(doc.id)}`}
                      className="truncate font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {String(doc.title)}
                    </Link>
                    <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                      Version {String(doc.currentVersion || '1.0')}
                      {doc.documentType && ` · ${String(doc.documentType)}`}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/dokumente/${extractId(doc.id)}`}
                    className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Bestätigen
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalPending === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-white py-16 text-center shadow-sm">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">Alles erledigt!</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('noTasks')}</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
