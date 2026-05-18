import type { Access, FieldAccess } from 'payload'
import { UserRole } from '../../lib/types'

export const isAdmin: Access = ({ req }) => {
  return req.user?.role === UserRole.SYSTEM_ADMIN
}

export const isAdminOrQM: Access = ({ req }) => {
  const role = req.user?.role
  return role === UserRole.SYSTEM_ADMIN || role === UserRole.QM_OFFICER
}

export const isAdminQMOrDeptHead: Access = ({ req }) => {
  const role = req.user?.role
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.QM_OFFICER ||
    role === UserRole.DEPT_HEAD
  )
}

export const isAuthenticated: Access = ({ req }) => {
  return Boolean(req.user)
}

export const isSelf: Access = ({ req }) => {
  if (!req.user) return false
  return { id: { equals: req.user.id } }
}

export const isAdminOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === UserRole.SYSTEM_ADMIN) return true
  return { id: { equals: req.user.id } }
}

export const isAdminFieldAccess: FieldAccess = ({ req }) => {
  return req.user?.role === UserRole.SYSTEM_ADMIN
}

export const isAdminOrQMFieldAccess: FieldAccess = ({ req }) => {
  const role = req.user?.role
  return role === UserRole.SYSTEM_ADMIN || role === UserRole.QM_OFFICER
}

export const canCreateDocuments: Access = ({ req }) => {
  const role = req.user?.role
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.QM_OFFICER ||
    role === UserRole.DEPT_HEAD ||
    role === UserRole.PHYSICIAN
  )
}

export const canApproveDocuments: Access = ({ req }) => {
  const role = req.user?.role
  return (
    role === UserRole.SYSTEM_ADMIN ||
    role === UserRole.QM_OFFICER ||
    role === UserRole.DEPT_HEAD
  )
}
