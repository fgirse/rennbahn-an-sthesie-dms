import type { Access, Where } from 'payload'
import { UserRole, DocumentStatus } from '../../lib/types'

export const documentsReadAccess: Access = ({ req }) => {
  const user = req.user
  if (!user) return false

  const role = user.role as UserRole

  // Admins and QM see everything
  if (role === UserRole.SYSTEM_ADMIN || role === UserRole.QM_OFFICER) return true

  // Dept head sees all department docs
  if (role === UserRole.DEPT_HEAD) return true

  // External auditor sees only approved QM documents and has time-limited access
  if (role === UserRole.AUDITOR) {
    if (user.tempAccessExpiry && new Date(user.tempAccessExpiry) < new Date()) {
      return false // expired access
    }
    return {
      and: [
        { status: { equals: DocumentStatus.APPROVED } } as Where,
        { documentType: { equals: 'qualitaetsdokument' } } as Where,
      ],
    }
  }

  // Physicians: see approved docs + own drafts
  if (role === UserRole.PHYSICIAN) {
    return {
      or: [
        { status: { equals: DocumentStatus.APPROVED } } as Where,
        { status: { equals: DocumentStatus.IN_REVIEW } } as Where,
        { owner: { equals: user.id } } as Where,
      ],
    }
  }

  // Nurses: see only approved documents
  if (role === UserRole.NURSE) {
    return { status: { equals: DocumentStatus.APPROVED } } as Where
  }

  return false
}

export const documentsCreateAccess: Access = ({ req }) => {
  const role = req.user?.role as UserRole
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.QM_OFFICER ||
    role === UserRole.DEPT_HEAD ||
    role === UserRole.PHYSICIAN
  )
}

export const documentsUpdateAccess: Access = ({ req }) => {
  const user = req.user
  if (!user) return false
  const role = user.role as UserRole

  if (role === UserRole.SYSTEM_ADMIN || role === UserRole.QM_OFFICER) return true
  if (role === UserRole.DEPT_HEAD) return true

  // Physicians can only update their own non-archived docs
  if (role === UserRole.PHYSICIAN) {
    return {
      and: [
        { owner: { equals: user.id } } as Where,
        { status: { not_equals: DocumentStatus.ARCHIVED } } as Where,
      ],
    }
  }

  return false
}

export const documentsDeleteAccess: Access = ({ req }) => {
  const role = req.user?.role as UserRole
  // Only admins can delete, and only drafts — archived docs are WORM
  return role === UserRole.SYSTEM_ADMIN
}
