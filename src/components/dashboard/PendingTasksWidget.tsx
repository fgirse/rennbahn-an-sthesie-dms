import { getTranslations } from 'next-intl/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { CheckSquare, Clock } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  userId: string
  locale: string
}

export async function PendingTasksWidget({ userId, locale }: Props) {
  const t = await getTranslations()
  const payload = await getPayload({ config })

  const tasks = await payload.find({
    collection: 'approval-tasks',
    where: {
      and: [
        { assignedTo: { equals: userId } },
        { status: { equals: 'offen' } },
      ],
    },
    depth: 1,
    limit: 5,
    sort: 'dueDate',
  })

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
        <h3 className="font-semibold text-[var(--color-foreground)]">{t('dashboard.myTasks')}</h3>
        <Link href={`/${locale}/aufgaben`} className="text-xs text-[var(--color-secondary)] hover:underline">
          Alle anzeigen →
        </Link>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {tasks.docs.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckSquare className="mb-2 h-8 w-8 text-[var(--color-success)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">{t('tasks.noTasks')}</p>
          </div>
        ) : (
          tasks.docs.map((task) => {
            const doc = typeof task.document === 'object' ? task.document : null
            const isOverdue = task.dueDate && new Date(String(task.dueDate)) < new Date()
            return (
              <Link
                key={String(task.id)}
                href={`/${locale}/dokumente/${String(doc?.id || '')}`}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--color-muted)] transition-colors"
              >
                <Clock className={cn('mt-0.5 h-4 w-4 flex-shrink-0', isOverdue ? 'text-red-500' : 'text-amber-500')} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                    {doc ? String(doc.title) : '—'}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {t(`tasks.taskType.${task.taskType}`)} · {t(`tasks.${isOverdue ? 'overdue' : 'pending'}`)}
                  </p>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
