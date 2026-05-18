import type { CollectionConfig } from 'payload'
import { UserRole } from '../../lib/types.ts'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    useAsTitle: 'message',
    defaultColumns: ['recipient', 'type', 'isRead', 'createdAt'],
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => {
      const user = req.user
      if (!user) return false
      const role = user.role as UserRole
      if (role === UserRole.SYSTEM_ADMIN) return true
      return { recipient: { equals: user.id } }
    },
    update: ({ req }) => {
      const user = req.user
      if (!user) return false
      if (user.role === UserRole.SYSTEM_ADMIN) return true
      return { recipient: { equals: user.id } }
    },
    delete: ({ req }) => req.user?.role === UserRole.SYSTEM_ADMIN,
  },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: { de: 'Empfänger', en: 'Recipient', fr: 'Destinataire', it: 'Destinatario' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      label: { de: 'Typ', en: 'Type', fr: 'Type', it: 'Tipo' },
      options: [
        { label: { de: 'Prüfung angefordert', en: 'Review Requested', fr: 'Révision demandée', it: 'Revisione richiesta' }, value: 'review_requested' },
        { label: { de: 'Freigabe angefordert', en: 'Approval Requested', fr: 'Approbation demandée', it: 'Approvazione richiesta' }, value: 'approval_requested' },
        { label: { de: 'Dokument freigegeben', en: 'Document Approved', fr: 'Document approuvé', it: 'Documento approvato' }, value: 'document_approved' },
        { label: { de: 'Dokument abgelehnt', en: 'Document Rejected', fr: 'Document rejeté', it: 'Documento rifiutato' }, value: 'document_rejected' },
        { label: { de: 'Lesebestätigung erforderlich', en: 'Read Confirmation Required', fr: 'Confirmation de lecture requise', it: 'Conferma lettura richiesta' }, value: 'read_confirmation_required' },
        { label: { de: 'Gültigkeit läuft ab', en: 'Validity Expiring', fr: 'Validité expire', it: 'Validità in scadenza' }, value: 'validity_expiring' },
        { label: { de: 'Aufgabe überfällig', en: 'Task Overdue', fr: 'Tâche en retard', it: 'Attività in ritardo' }, value: 'task_overdue' },
      ],
    },
    {
      name: 'message',
      type: 'text',
      required: true,
      label: { de: 'Nachricht', en: 'Message', fr: 'Message', it: 'Messaggio' },
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
      label: { de: 'Gelesen', en: 'Read', fr: 'Lu', it: 'Letto' },
    },
    {
      name: 'documentId',
      type: 'text',
      label: { de: 'Dokument-ID', en: 'Document ID', fr: 'ID document', it: 'ID documento' },
    },
    {
      name: 'link',
      type: 'text',
      label: { de: 'Link', en: 'Link', fr: 'Lien', it: 'Link' },
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: { de: 'Läuft ab am', en: 'Expires At', fr: 'Expire le', it: 'Scade il' },
    },
    {
      name: 'createdAt',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
      admin: { readOnly: true },
    },
  ],
  timestamps: false,
}
