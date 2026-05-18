import type { CollectionConfig } from 'payload'
import { UserRole } from '../../lib/types.ts'

export const ApprovalTasks: CollectionConfig = {
  slug: 'approval-tasks',
  admin: {
    useAsTitle: 'taskType',
    defaultColumns: ['taskType', 'stage', 'status', 'assignedTo', 'document', 'dueDate'],
  },
  access: {
    create: ({ req }) => {
      const role = req.user?.role as UserRole
      return (
        role === UserRole.SYSTEM_ADMIN ||
        role === UserRole.QM_OFFICER ||
        role === UserRole.DEPT_HEAD ||
        role === UserRole.PHYSICIAN
      )
    },
    read: ({ req }) => {
      const user = req.user
      if (!user) return false
      const role = user.role as UserRole
      if (role === UserRole.SYSTEM_ADMIN || role === UserRole.QM_OFFICER || role === UserRole.DEPT_HEAD) {
        return true
      }
      return { assignedTo: { equals: user.id } }
    },
    update: ({ req }) => {
      const user = req.user
      if (!user) return false
      const role = user.role as UserRole
      if (role === UserRole.SYSTEM_ADMIN || role === UserRole.QM_OFFICER) return true
      return { assignedTo: { equals: user.id } }
    },
    delete: ({ req }) => req.user?.role === UserRole.SYSTEM_ADMIN,
  },
  fields: [
    {
      name: 'document',
      type: 'relationship',
      relationTo: 'documents',
      required: true,
      label: { de: 'Dokument', en: 'Document', fr: 'Document', it: 'Documento' },
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: { de: 'Zugewiesen an', en: 'Assigned To', fr: 'Attribué à', it: 'Assegnato a' },
    },
    {
      name: 'taskType',
      type: 'select',
      required: true,
      label: { de: 'Aufgabentyp', en: 'Task Type', fr: 'Type de tâche', it: 'Tipo di attività' },
      options: [
        { label: { de: 'Prüfung', en: 'Review', fr: 'Révision', it: 'Revisione' }, value: 'pruefung' },
        { label: { de: 'Freigabe', en: 'Approval', fr: 'Approbation', it: 'Approvazione' }, value: 'freigabe' },
      ],
    },
    {
      name: 'stage',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 3,
      label: { de: 'Stufe', en: 'Stage', fr: 'Étape', it: 'Fase' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'offen',
      label: { de: 'Status', en: 'Status', fr: 'Statut', it: 'Stato' },
      options: [
        { label: { de: 'Offen', en: 'Open', fr: 'Ouvert', it: 'Aperto' }, value: 'offen' },
        { label: { de: 'Genehmigt', en: 'Approved', fr: 'Approuvé', it: 'Approvato' }, value: 'genehmigt' },
        { label: { de: 'Abgelehnt', en: 'Rejected', fr: 'Rejeté', it: 'Rifiutato' }, value: 'abgelehnt' },
        { label: { de: 'Abgelaufen', en: 'Expired', fr: 'Expiré', it: 'Scaduto' }, value: 'abgelaufen' },
      ],
    },
    {
      name: 'comments',
      type: 'textarea',
      label: { de: 'Kommentare', en: 'Comments', fr: 'Commentaires', it: 'Commenti' },
    },
    {
      name: 'dueDate',
      type: 'date',
      label: { de: 'Fälligkeitsdatum', en: 'Due Date', fr: 'Date d\'échéance', it: 'Data di scadenza' },
    },
    {
      name: 'completedAt',
      type: 'date',
      admin: { readOnly: true },
      label: { de: 'Abgeschlossen am', en: 'Completed At', fr: 'Terminé le', it: 'Completato il' },
    },
    {
      name: 'completedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
      label: { de: 'Abgeschlossen von', en: 'Completed By', fr: 'Terminé par', it: 'Completato da' },
    },
  ],
  timestamps: true,
}
