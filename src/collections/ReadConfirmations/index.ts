import type { CollectionConfig } from 'payload'
import { UserRole } from '../../lib/types.ts'

export const ReadConfirmations: CollectionConfig = {
  slug: 'read-confirmations',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['confirmedAt', 'user', 'document', 'documentVersion'],
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => {
      const user = req.user
      if (!user) return false
      const role = user.role as UserRole
      if (role === UserRole.SYSTEM_ADMIN || role === UserRole.QM_OFFICER || role === UserRole.DEPT_HEAD) {
        return true
      }
      return { user: { equals: user.id } }
    },
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: { de: 'Benutzer', en: 'User', fr: 'Utilisateur', it: 'Utente' },
      hooks: {
        beforeChange: [({ req, operation, data }) => {
          if (operation === 'create') return req.user?.id
          return data?.user
        }],
      },
    },
    {
      name: 'document',
      type: 'relationship',
      relationTo: 'documents',
      required: true,
      label: { de: 'Dokument', en: 'Document', fr: 'Document', it: 'Documento' },
    },
    {
      name: 'documentVersion',
      type: 'text',
      required: true,
      label: { de: 'Dokumentversion', en: 'Document Version', fr: 'Version du document', it: 'Versione documento' },
    },
    {
      name: 'confirmedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { readOnly: true },
      label: { de: 'Bestätigt am', en: 'Confirmed At', fr: 'Confirmé le', it: 'Confermato il' },
    },
    {
      name: 'ipAddress',
      type: 'text',
      admin: { hidden: true },
      label: { de: 'IP-Adresse', en: 'IP Address', fr: 'Adresse IP', it: 'Indirizzo IP' },
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: { hidden: true },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create' || !req.payload || !req.user) return doc
        try {
          await req.payload.create({
            collection: 'audit-logs',
            data: {
              userId: String(req.user.id),
              userName: req.user.name || `${req.user.firstName} ${req.user.lastName}`,
              userRole: req.user.role,
              action: 'lesebestaetigt',
              documentId: String(doc.document),
              documentVersion: doc.documentVersion,
              timestamp: new Date().toISOString(),
              ipAddress: doc.ipAddress,
            },
          })
        } catch {
          // best-effort
        }
        return doc
      },
    ],
  },
  timestamps: false,
}
