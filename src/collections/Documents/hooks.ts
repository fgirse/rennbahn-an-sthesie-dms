import type { CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload'
import { DocumentStatus, DocumentType, RETENTION_YEARS } from '../../lib/types'

export const autoVersionHook: CollectionBeforeChangeHook = async ({ data, operation, originalDoc }) => {
  if (operation === 'create') {
    data.currentVersion = '1.0'
    data.changeLog = [
      {
        version: '1.0',
        date: new Date().toISOString(),
        description: 'Initiale Version',
      },
    ]
    return data
  }

  if (operation === 'update' && originalDoc) {
    const isNewContent = data.content && data.content !== originalDoc.content
    const isStatusChange = data.status && data.status !== originalDoc.status

    if (isNewContent) {
      const [major, minor] = (originalDoc.currentVersion || '1.0').split('.').map(Number)
      const newVersion = `${major}.${(minor || 0) + 1}`
      data.currentVersion = newVersion

      const existingLog = originalDoc.changeLog || []
      data.changeLog = [
        ...existingLog,
        {
          version: newVersion,
          date: new Date().toISOString(),
          description: data.changeDescription || 'Inhalt aktualisiert',
        },
      ]
    }

    // Block updates on archived documents (WORM)
    if (originalDoc.status === DocumentStatus.ARCHIVED && !data.status) {
      throw new Error('Archivierte Dokumente können nicht geändert werden (WORM).')
    }
  }

  return data
}

export const computeRetentionHook: CollectionBeforeChangeHook = async ({ data, operation }) => {
  if ((operation === 'create' || operation === 'update') && data.documentType) {
    const years = RETENTION_YEARS[data.documentType as DocumentType] ?? 10
    const retentionDate = new Date()
    retentionDate.setFullYear(retentionDate.getFullYear() + years)
    data.retentionUntil = retentionDate.toISOString()
  }
  return data
}

export const auditOnChangeHook: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (!req.user || !req.payload) return doc

  let action = operation === 'create' ? 'erstellt' : 'geaendert'

  if (previousDoc && doc.status !== previousDoc.status) {
    const statusActionMap: Record<string, string> = {
      [DocumentStatus.IN_REVIEW]: 'in_pruefung',
      [DocumentStatus.APPROVED]: 'freigegeben',
      [DocumentStatus.IN_REVISION]: 'in_revision',
      [DocumentStatus.ARCHIVED]: 'archiviert',
    }
    action = statusActionMap[doc.status] ?? action
  }

  try {
    await req.payload.create({
      collection: 'audit-logs',
      data: {
        userId: String(req.user.id),
        userName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
        userRole: req.user.role,
        action,
        documentId: String(doc.id),
        documentTitle: doc.title,
        documentVersion: doc.currentVersion,
        timestamp: new Date().toISOString(),
        ipAddress: req.headers?.get?.('x-forwarded-for') || 'unknown',
        details: { previousStatus: previousDoc?.status, newStatus: doc.status },
      },
    })
  } catch {
    // Audit log failures must not block the main operation
  }

  return doc
}

export const notifyOnStatusChangeHook: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (!req.payload || !req.user) return doc

  const statusChanged = previousDoc && doc.status !== previousDoc.status
  if (!statusChanged && operation !== 'create') return doc

  try {
    // Notify assigned reviewers when document enters review
    if (doc.status === DocumentStatus.IN_REVIEW && doc.reviewers?.length > 0) {
      for (const reviewerId of doc.reviewers) {
        const rid = typeof reviewerId === 'object' ? reviewerId.id : reviewerId
        await req.payload.create({
          collection: 'notifications',
          data: {
            recipient: rid,
            type: 'review_requested',
            message: `Dokument "${doc.title}" (v${doc.currentVersion}) erwartet Ihre Prüfung.`,
            documentId: String(doc.id),
            link: `/dokumente/${String(doc.id)}`,
          },
        })
        await req.payload.create({
          collection: 'approval-tasks',
          data: {
            document: doc.id,
            assignedTo: rid,
            taskType: 'pruefung',
            stage: 1,
            status: 'offen',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        })
      }
    }

    // Notify owner when approved
    if (doc.status === DocumentStatus.APPROVED) {
      const ownerId = typeof doc.owner === 'object' ? doc.owner.id : doc.owner
      if (ownerId) {
        await req.payload.create({
          collection: 'notifications',
          data: {
            recipient: ownerId,
            type: 'document_approved',
            message: `Ihr Dokument "${doc.title}" (v${doc.currentVersion}) wurde freigegeben.`,
            documentId: String(doc.id),
            link: `/dokumente/${String(doc.id)}`,
          },
        })
      }
    }
  } catch {
    // Notification failures must not block the main operation
  }

  return doc
}

export const blockArchivedUpdateHook: CollectionBeforeChangeHook = async ({ data, operation, originalDoc }) => {
  if (operation === 'update' && originalDoc?.status === DocumentStatus.ARCHIVED) {
    // Allow status read but prevent content changes
    const allowedFields = ['id', 'updatedAt']
    const hasDisallowedChange = Object.keys(data).some(
      (key) => !allowedFields.includes(key) && data[key] !== originalDoc[key]
    )
    if (hasDisallowedChange) {
      throw new Error('Archivierte Dokumente sind schreibgeschützt (WORM-Prinzip).')
    }
  }
  return data
}
