'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DocumentStatus, UserRole } from '@/lib/types'

interface Props {
  documentId: string
  documentTitle: string
  currentVersion: string
  status: string
  locale: string
  userRole: UserRole
}

export function ApprovalWorkflow({
  documentId,
  documentTitle,
  currentVersion,
  status,
  locale,
  userRole,
}: Props) {
  const t = useTranslations('documents.detail')
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [showCommentFor, setShowCommentFor] = useState<string | null>(null)

  const canApprove =
    userRole === UserRole.SYSTEM_ADMIN ||
    userRole === UserRole.QM_OFFICER ||
    userRole === UserRole.DEPT_HEAD

  const canReview = canApprove || userRole === UserRole.PHYSICIAN

  async function transition(newStatus: string, action: string) {
    setLoading(action)
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          changeDescription: comment || `Status geändert: ${newStatus}`,
        }),
      })
      if (res.ok) {
        setComment('')
        setShowCommentFor(null)
        router.refresh()
      }
    } finally {
      setLoading(null)
    }
  }

  const actions = []

  if (status === DocumentStatus.DRAFT && canReview) {
    actions.push({
      id: 'submit_review',
      label: t('sendForReview'),
      icon: ArrowRight,
      variant: 'primary' as const,
      onClick: () => transition(DocumentStatus.IN_REVIEW, 'submit_review'),
    })
  }

  if (status === DocumentStatus.IN_REVIEW && canApprove) {
    actions.push({
      id: 'approve',
      label: t('approve'),
      icon: CheckCircle,
      variant: 'success' as const,
      onClick: () => transition(DocumentStatus.APPROVED, 'approve'),
    })
    actions.push({
      id: 'reject',
      label: t('reject'),
      icon: XCircle,
      variant: 'danger' as const,
      onClick: () => {
        if (showCommentFor === 'reject') {
          transition(DocumentStatus.DRAFT, 'reject')
        } else {
          setShowCommentFor('reject')
        }
      },
    })
  }

  if (status === DocumentStatus.APPROVED && canApprove) {
    actions.push({
      id: 'revision',
      label: t('startRevision'),
      icon: ArrowRight,
      variant: 'secondary' as const,
      onClick: () => transition(DocumentStatus.IN_REVISION, 'revision'),
    })
    actions.push({
      id: 'archive',
      label: t('archive'),
      icon: Archive,
      variant: 'secondary' as const,
      onClick: () => {
        if (showCommentFor === 'archive') {
          transition(DocumentStatus.ARCHIVED, 'archive')
        } else {
          setShowCommentFor('archive')
        }
      },
    })
  }

  if (status === DocumentStatus.IN_REVISION) {
    actions.push({
      id: 'submit_review2',
      label: t('sendForReview'),
      icon: ArrowRight,
      variant: 'primary' as const,
      onClick: () => transition(DocumentStatus.IN_REVIEW, 'submit_review2'),
    })
  }

  if (actions.length === 0) return null

  const variantClasses = {
    primary: 'bg-[var(--color-primary)] text-white hover:opacity-90',
    success: 'bg-[var(--color-success)] text-white hover:opacity-90',
    danger: 'border border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
    secondary: 'border border-[var(--color-border)] bg-white text-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold">{t('workflow')}</h3>

      {showCommentFor && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            Kommentar (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-lg border border-[var(--color-input)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]"
            placeholder="Begründung oder Kommentar..."
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={loading !== null}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${variantClasses[action.variant]}`}
            >
              {loading === action.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {action.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Needed to avoid import error for Archive icon used inside
function Archive({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="3" width="20" height="5" rx="1"/>
      <path d="M4 8v11a1 1 0 001 1h14a1 1 0 001-1V8"/>
      <path d="M10 12h4"/>
    </svg>
  )
}
