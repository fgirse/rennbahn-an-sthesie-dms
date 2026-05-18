import type { CollectionConfig } from 'payload'
import { UserRole } from '../../lib/types.ts'
import { isAdmin, isAdminOrSelf, isSelf } from './access.ts'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 900, // 15 minutes
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'isActive', 'lastLogin'],
  },
  access: {
    create: isAdmin,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
      label: { de: 'Vorname', en: 'First Name', fr: 'Prénom', it: 'Nome' },
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
      label: { de: 'Nachname', en: 'Last Name', fr: 'Nom', it: 'Cognome' },
    },
    {
      name: 'name',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        beforeChange: [
          ({ data }) => {
            if (data?.firstName && data?.lastName) {
              return `${data.firstName} ${data.lastName}`
            }
            return data?.name
          },
        ],
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: UserRole.NURSE,
      label: { de: 'Rolle', en: 'Role', fr: 'Rôle', it: 'Ruolo' },
      options: [
        { label: { de: 'Systemadministrator', en: 'System Administrator', fr: 'Administrateur système', it: 'Amministratore di sistema' }, value: UserRole.SYSTEM_ADMIN },
        { label: { de: 'QM-Beauftragter', en: 'QM Officer', fr: 'Responsable QM', it: 'Responsabile QM' }, value: UserRole.QM_OFFICER },
        { label: { de: 'Abteilungsleitung', en: 'Department Head', fr: 'Chef de département', it: 'Capo reparto' }, value: UserRole.DEPT_HEAD },
        { label: { de: 'Anästhesie-Facharzt', en: 'Anesthesia Physician', fr: 'Médecin anesthésiste', it: 'Medico anestesista' }, value: UserRole.PHYSICIAN },
        { label: { de: 'Anästhesiepflegefachperson', en: 'Anesthesia Nurse', fr: 'Infirmière anesthésiste', it: 'Infermiere anestesista' }, value: UserRole.NURSE },
        { label: { de: 'Externer Auditor', en: 'External Auditor', fr: 'Auditeur externe', it: 'Revisore esterno' }, value: UserRole.AUDITOR },
      ],
      access: {
        update: ({ req }) => req.user?.role === UserRole.SYSTEM_ADMIN,
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: { de: 'Aktiv', en: 'Active', fr: 'Actif', it: 'Attivo' },
      access: {
        update: ({ req }) => req.user?.role === UserRole.SYSTEM_ADMIN,
      },
    },
    {
      name: 'preferredLanguage',
      type: 'select',
      defaultValue: 'de',
      label: { de: 'Bevorzugte Sprache', en: 'Preferred Language', fr: 'Langue préférée', it: 'Lingua preferita' },
      options: [
        { label: 'Deutsch', value: 'de' },
        { label: 'English', value: 'en' },
        { label: 'Français', value: 'fr' },
        { label: 'Italiano', value: 'it' },
      ],
    },
    {
      name: 'mfaEnabled',
      type: 'checkbox',
      defaultValue: false,
      label: { de: 'MFA aktiviert', en: 'MFA Enabled', fr: 'MFA activé', it: 'MFA abilitato' },
      access: {
        update: ({ req }) => req.user?.role === UserRole.SYSTEM_ADMIN,
      },
    },
    {
      name: 'mfaSecret',
      type: 'text',
      admin: { hidden: true },
      access: {
        read: () => false,
        update: () => false,
      },
    },
    {
      name: 'mfaBackupCodes',
      type: 'json',
      admin: { hidden: true },
      access: {
        read: () => false,
        update: () => false,
      },
    },
    {
      name: 'tempAccessExpiry',
      type: 'date',
      label: { de: 'Temporärer Zugriff bis', en: 'Temporary Access Until', fr: 'Accès temporaire jusqu\'au', it: 'Accesso temporaneo fino al' },
      admin: {
        description: { de: 'Nur für externe Auditoren', en: 'External auditors only', fr: 'Auditeurs externes uniquement', it: 'Solo revisori esterni' },
        condition: (data) => data?.role === UserRole.AUDITOR,
      },
    },
    {
      name: 'ssoSubject',
      type: 'text',
      label: { de: 'SSO Subject (SAML)', en: 'SSO Subject (SAML)', fr: 'Sujet SSO (SAML)', it: 'Soggetto SSO (SAML)' },
      admin: { readOnly: true },
    },
    {
      name: 'lastLogin',
      type: 'date',
      label: { de: 'Letzte Anmeldung', en: 'Last Login', fr: 'Dernière connexion', it: 'Ultimo accesso' },
      admin: { readOnly: true },
    },
    {
      name: 'passwordPolicy',
      type: 'group',
      admin: { hidden: true },
      fields: [
        { name: 'forceChange', type: 'checkbox', defaultValue: false },
        { name: 'changedAt', type: 'date' },
      ],
    },
  ],
  hooks: {
    beforeOperation: [
      async ({ operation, args }) => {
        if ((operation === 'login') && args?.req?.user) {
          // Will be handled in auth middleware
        }
        return args
      },
    ],
    afterChange: [
      async ({ operation, doc, req }) => {
        if (operation === 'create' && req.payload) {
          try {
            await req.payload.create({
              collection: 'audit-logs',
              data: {
                userId: doc.id,
                userName: doc.name || `${doc.firstName} ${doc.lastName}`,
                userRole: doc.role,
                action: 'erstellt',
                details: { target: 'user', email: doc.email },
              },
            })
          } catch {
            // Audit log is best-effort, don't block user creation
          }
        }
      },
    ],
  },
  timestamps: true,
}
