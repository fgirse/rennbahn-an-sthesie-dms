'use client'

import { useTranslations } from 'next-intl'
import { FileText, CheckSquare, AlertTriangle, BookOpen } from 'lucide-react'
import { UserRole } from '@/lib/types'

interface Stats {
  totalDocuments: number
  pendingTasks: number
  expiringDocuments: number
  readConfirmationsPending: number
}

interface Props {
  stats: Stats
  locale: string
  userRole: UserRole
}

export function DashboardStats({ stats, userRole }: Props) {
  const t = useTranslations('dashboard.stats')

  const isManager =
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.QM_OFFICER ||
    userRole === UserRole.DEPT_HEAD

  const cards = [
    {
      label: t('totalDocuments'),
      value: stats.totalDocuments,
      icon: FileText,
      color: 'text-[var(--color-secondary)]',
      bg: 'bg-[var(--color-accent)]',
      show: isManager,
    },
    {
      label: t('pendingTasks'),
      value: stats.pendingTasks,
      icon: CheckSquare,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      show: true,
    },
    {
      label: t('expiringDocuments'),
      value: stats.expiringDocuments,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      show: isManager,
    },
    {
      label: t('readConfirmationsPending'),
      value: stats.readConfirmationsPending,
      icon: BookOpen,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      show: true,
    },
  ].filter((c) => c.show)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{card.label}</p>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-[var(--color-foreground)]">{card.value}</p>
          </div>
        )
      })}
    </div>
  )
}
