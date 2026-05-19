import type { CollectionConfig } from 'payload'
import { UserRole } from '../../lib/types'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'mimeType', 'filesize', 'createdAt'],
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user), // any authenticated user can view media files
    update: ({ req }) => {
      const role = req.user?.role as UserRole
      return role === UserRole.SYSTEM_ADMIN || role === UserRole.QM_OFFICER
    },
    delete: ({ req }) => req.user?.role === UserRole.SYSTEM_ADMIN,
  },
  upload: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: { de: 'Alternativtext', en: 'Alt Text', fr: 'Texte alternatif', it: 'Testo alternativo' },
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ req, operation, data }) => {
            if (operation === 'create') return req.user?.id
            return data?.uploadedBy
          },
        ],
      },
    },
  ],
  timestamps: true,
}
