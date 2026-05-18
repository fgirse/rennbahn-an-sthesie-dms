import type { CollectionConfig } from 'payload'
import { DocumentStatus, DocumentType, WorkflowType, UserRole } from '../../lib/types'
import {
  documentsReadAccess,
  documentsCreateAccess,
  documentsUpdateAccess,
  documentsDeleteAccess,
} from './access'
import {
  autoVersionHook,
  computeRetentionHook,
  auditOnChangeHook,
  notifyOnStatusChangeHook,
  blockArchivedUpdateHook,
} from './hooks'

export const Documents: CollectionConfig = {
  slug: 'documents',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['documentNumber', 'title', 'documentType', 'status', 'currentVersion', 'validUntil'],
  },
  access: {
    create: documentsCreateAccess,
    read: documentsReadAccess,
    update: documentsUpdateAccess,
    delete: documentsDeleteAccess,
  },
  hooks: {
    beforeChange: [blockArchivedUpdateHook, autoVersionHook, computeRetentionHook],
    afterChange: [auditOnChangeHook, notifyOnStatusChangeHook],
  },
  fields: [
    {
      name: 'documentNumber',
      type: 'text',
      required: false,
      unique: true,
      admin: { readOnly: true, description: 'Wird automatisch generiert' },
      label: { de: 'Dokumentnummer', en: 'Document Number', fr: 'Numéro de document', it: 'Numero documento' },
      hooks: {
        beforeChange: [
          async ({ data, operation, req }) => {
            if (operation === 'create' && !data?.documentNumber) {
              const year = new Date().getFullYear()
              const count = await req.payload.count({ collection: 'documents' })
              return `DOC-${year}-${String(count.totalDocs + 1).padStart(4, '0')}`
            }
            return data?.documentNumber
          },
        ],
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: { de: 'Titel', en: 'Title', fr: 'Titre', it: 'Titolo' },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      label: { de: 'Beschreibung', en: 'Description', fr: 'Description', it: 'Descrizione' },
    },
    {
      name: 'documentType',
      type: 'select',
      required: true,
      label: { de: 'Dokumenttyp', en: 'Document Type', fr: 'Type de document', it: 'Tipo di documento' },
      options: [
        { label: { de: 'SOP (Standardarbeitsanweisung)', en: 'SOP (Standard Operating Procedure)', fr: 'SOP (Procédure standard)', it: 'SOP (Procedura standard)' }, value: DocumentType.SOP },
        { label: { de: 'Notfall-Checkliste', en: 'Emergency Checklist', fr: 'Liste de contrôle d\'urgence', it: 'Lista di controllo emergenza' }, value: DocumentType.EMERGENCY_CHECKLIST },
        { label: { de: 'Arbeitsplatz-Checkliste', en: 'Workplace Checklist', fr: 'Liste de contrôle du lieu de travail', it: 'Lista di controllo posto di lavoro' }, value: DocumentType.WORKPLACE_CHECKLIST },
        { label: { de: 'Aufklärungs-/Einwilligungsbogen', en: 'Consent Form', fr: 'Formulaire de consentement', it: 'Modulo di consenso' }, value: DocumentType.CONSENT_FORM },
        { label: { de: 'Qualitätsdokument', en: 'Quality Document', fr: 'Document qualité', it: 'Documento di qualità' }, value: DocumentType.QUALITY_DOC },
        { label: { de: 'Formular / Vorlage', en: 'Form / Template', fr: 'Formulaire / Modèle', it: 'Modulo / Modello' }, value: DocumentType.FORM_TEMPLATE },
        { label: { de: 'Schulungsunterlage', en: 'Training Material', fr: 'Matériel de formation', it: 'Materiale formativo' }, value: DocumentType.TRAINING_MATERIAL },
        { label: { de: 'Geräte-/Wartungsdokumentation', en: 'Equipment Documentation', fr: 'Documentation équipement', it: 'Documentazione attrezzatura' }, value: DocumentType.EQUIPMENT_DOC },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: DocumentStatus.DRAFT,
      label: { de: 'Status', en: 'Status', fr: 'Statut', it: 'Stato' },
      options: [
        { label: { de: 'Entwurf', en: 'Draft', fr: 'Brouillon', it: 'Bozza' }, value: DocumentStatus.DRAFT },
        { label: { de: 'In Prüfung', en: 'In Review', fr: 'En révision', it: 'In revisione' }, value: DocumentStatus.IN_REVIEW },
        { label: { de: 'Freigegeben', en: 'Approved', fr: 'Approuvé', it: 'Approvato' }, value: DocumentStatus.APPROVED },
        { label: { de: 'In Revision', en: 'In Revision', fr: 'En modification', it: 'In modifica' }, value: DocumentStatus.IN_REVISION },
        { label: { de: 'Archiviert', en: 'Archived', fr: 'Archivé', it: 'Archiviato' }, value: DocumentStatus.ARCHIVED },
      ],
      access: {
        update: ({ req }) => {
          const role = req.user?.role as UserRole
          return (
            role === UserRole.SYSTEM_ADMIN ||
            role === UserRole.QM_OFFICER ||
            role === UserRole.DEPT_HEAD ||
            role === UserRole.PHYSICIAN
          )
        },
      },
    },
    {
      name: 'currentVersion',
      type: 'text',
      defaultValue: '1.0',
      admin: { readOnly: true },
      label: { de: 'Aktuelle Version', en: 'Current Version', fr: 'Version actuelle', it: 'Versione attuale' },
    },
    {
      name: 'content',
      type: 'upload',
      relationTo: 'media',
      required: false,
      label: { de: 'Dokument-Datei', en: 'Document File', fr: 'Fichier document', it: 'File documento' },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: { de: 'Verantwortlicher', en: 'Owner', fr: 'Responsable', it: 'Responsabile' },
      hooks: {
        beforeChange: [
          ({ data, req, operation }) => {
            if (operation === 'create' && !data?.owner) {
              return req.user?.id
            }
            return data?.owner
          },
        ],
      },
    },
    {
      name: 'reviewers',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: { de: 'Prüfer', en: 'Reviewers', fr: 'Réviseurs', it: 'Revisori' },
      access: {
        update: ({ req }) => {
          const role = req.user?.role as UserRole
          return (
            role === UserRole.SYSTEM_ADMIN ||
            role === UserRole.QM_OFFICER ||
            role === UserRole.DEPT_HEAD
          )
        },
      },
    },
    {
      name: 'approvers',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: { de: 'Freigeber', en: 'Approvers', fr: 'Approbateurs', it: 'Approvatori' },
      access: {
        update: ({ req }) => {
          const role = req.user?.role as UserRole
          return (
            role === UserRole.SYSTEM_ADMIN ||
            role === UserRole.QM_OFFICER ||
            role === UserRole.DEPT_HEAD
          )
        },
      },
    },
    {
      name: 'workflowType',
      type: 'select',
      defaultValue: WorkflowType.TWO_STAGE,
      label: { de: 'Freigabe-Workflow', en: 'Approval Workflow', fr: 'Workflow d\'approbation', it: 'Workflow di approvazione' },
      options: [
        { label: { de: 'Einstufig', en: 'Single Stage', fr: 'Étape unique', it: 'Fase singola' }, value: WorkflowType.SINGLE },
        { label: { de: 'Zweistufig', en: 'Two Stage', fr: 'Deux étapes', it: 'Due fasi' }, value: WorkflowType.TWO_STAGE },
        { label: { de: 'Dreistufig', en: 'Three Stage', fr: 'Trois étapes', it: 'Tre fasi' }, value: WorkflowType.THREE_STAGE },
      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'document-categories',
      label: { de: 'Kategorie', en: 'Category', fr: 'Catégorie', it: 'Categoria' },
    },
    {
      name: 'tags',
      type: 'array',
      label: { de: 'Schlagwörter', en: 'Tags', fr: 'Mots-clés', it: 'Parole chiave' },
      fields: [
        {
          name: 'tag',
          type: 'text',
          label: { de: 'Schlagwort', en: 'Tag', fr: 'Mot-clé', it: 'Parola chiave' },
        },
      ],
    },
    {
      name: 'language',
      type: 'select',
      defaultValue: 'de',
      label: { de: 'Dokumentsprache', en: 'Document Language', fr: 'Langue du document', it: 'Lingua del documento' },
      options: [
        { label: 'Deutsch', value: 'de' },
        { label: 'English', value: 'en' },
        { label: 'Français', value: 'fr' },
        { label: 'Italiano', value: 'it' },
      ],
    },
    {
      name: 'validFrom',
      type: 'date',
      label: { de: 'Gültig ab', en: 'Valid From', fr: 'Valide à partir du', it: 'Valido dal' },
    },
    {
      name: 'validUntil',
      type: 'date',
      label: { de: 'Gültig bis', en: 'Valid Until', fr: 'Valide jusqu\'au', it: 'Valido fino al' },
    },
    {
      name: 'retentionUntil',
      type: 'date',
      admin: { readOnly: true },
      label: { de: 'Aufbewahrung bis', en: 'Retain Until', fr: 'Conserver jusqu\'au', it: 'Conservare fino al' },
    },
    {
      name: 'changeLog',
      type: 'array',
      admin: { readOnly: true },
      label: { de: 'Änderungshistorie', en: 'Change History', fr: 'Historique des modifications', it: 'Cronologia modifiche' },
      fields: [
        { name: 'version', type: 'text', label: { de: 'Version', en: 'Version', fr: 'Version', it: 'Versione' } },
        { name: 'date', type: 'date', label: { de: 'Datum', en: 'Date', fr: 'Date', it: 'Data' } },
        { name: 'userId', type: 'text', admin: { hidden: true } },
        { name: 'description', type: 'text', label: { de: 'Beschreibung', en: 'Description', fr: 'Description', it: 'Descrizione' } },
      ],
    },
    {
      name: 'changeDescription',
      type: 'text',
      admin: { description: { de: 'Kurze Beschreibung der Änderungen (für Änderungshistorie)', en: 'Brief description of changes (for change log)', fr: 'Brève description des modifications', it: 'Breve descrizione delle modifiche' } },
      label: { de: 'Änderungsbeschreibung', en: 'Change Description', fr: 'Description des modifications', it: 'Descrizione modifiche' },
    },
    {
      name: 'requiresReadConfirmation',
      type: 'checkbox',
      defaultValue: true,
      label: { de: 'Lesebestätigung erforderlich', en: 'Read Confirmation Required', fr: 'Confirmation de lecture requise', it: 'Conferma di lettura richiesta' },
    },
    {
      name: 'archivedAt',
      type: 'date',
      admin: { readOnly: true },
      label: { de: 'Archiviert am', en: 'Archived At', fr: 'Archivé le', it: 'Archiviato il' },
    },
  ],
  timestamps: true,
}
