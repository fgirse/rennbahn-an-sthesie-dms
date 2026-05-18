'use client'

import { cn } from '@/lib/cn'
import { DocumentStatus } from '@/lib/types'

interface Props {
  status: string
  label: string
  className?: string
}

const statusStyles: Record<string, string> = {
  [DocumentStatus.DRAFT]: 'status-badge-draft',
  [DocumentStatus.IN_REVIEW]: 'status-badge-review',
  [DocumentStatus.APPROVED]: 'status-badge-approved',
  [DocumentStatus.IN_REVISION]: 'status-badge-revision',
  [DocumentStatus.ARCHIVED]: 'status-badge-archived',
}

export function DocumentStatusBadge({ status, label, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status] ?? 'status-badge-draft',
        className
      )}
    >
      {label}
    </span>
  )
}
