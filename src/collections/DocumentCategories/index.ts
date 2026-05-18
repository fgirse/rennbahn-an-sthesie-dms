import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrQM, isAuthenticated } from '../Users/access.ts'

export const DocumentCategories: CollectionConfig = {
  slug: 'document-categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'description'],
  },
  access: {
    create: isAdminOrQM,
    read: isAuthenticated,
    update: isAdminOrQM,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      label: { de: 'Name', en: 'Name', fr: 'Nom', it: 'Nome' },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      label: { de: 'Beschreibung', en: 'Description', fr: 'Description', it: 'Descrizione' },
    },
    {
      name: 'color',
      type: 'text',
      defaultValue: '#003366',
      label: { de: 'Farbe (Hex)', en: 'Color (Hex)', fr: 'Couleur (Hex)', it: 'Colore (Hex)' },
    },
    {
      name: 'icon',
      type: 'text',
      label: { de: 'Icon (Lucide-Name)', en: 'Icon (Lucide name)', fr: 'Icône (nom Lucide)', it: 'Icona (nome Lucide)' },
    },
  ],
  timestamps: true,
}
