import type { BasePayload } from 'payload'
import { AuditAction } from '@/lib/types'

interface AuditEntry {
  userId: string
  userName: string
  userRole: string
  action: AuditAction | string
  documentId?: string
  documentTitle?: string
  documentVersion?: string
  ipAddress?: string
  details?: Record<string, unknown>
}

export async function writeAuditLog(
  payload: BasePayload,
  entry: AuditEntry
): Promise<void> {
  try {
    await payload.create({
      collection: 'audit-logs',
      data: {
        ...entry,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (err) {
    // Audit log failures must never crash the application
    console.error('[AuditLog] Failed to write audit entry:', err)
  }
}

export async function writeLoginAudit(
  payload: BasePayload,
  userId: string,
  userName: string,
  userRole: string,
  ipAddress: string,
  success: boolean
): Promise<void> {
  await writeAuditLog(payload, {
    userId,
    userName,
    userRole,
    action: success ? AuditAction.LOGIN : 'login_failed',
    ipAddress,
    details: { success },
  })
}

export async function writeDocumentReadAudit(
  payload: BasePayload,
  userId: string,
  userName: string,
  userRole: string,
  documentId: string,
  documentTitle: string,
  documentVersion: string,
  ipAddress: string
): Promise<void> {
  await writeAuditLog(payload, {
    userId,
    userName,
    userRole,
    action: AuditAction.READ,
    documentId,
    documentTitle,
    documentVersion,
    ipAddress,
  })
}
