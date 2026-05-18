import type { GlobalConfig } from 'payload'
import { UserRole } from '../../lib/types'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: {
    group: 'Administration',
  },
  access: {
    read: ({ req }) => {
      const role = req.user?.role as UserRole
      return (
        role === UserRole.SYSTEM_ADMIN ||
        role === UserRole.QM_OFFICER
      )
    },
    update: ({ req }) => {
      const role = req.user?.role as UserRole
      return (
        role === UserRole.SYSTEM_ADMIN ||
        role === UserRole.QM_OFFICER
      )
    },
  },
  fields: [
    {
      name: 'clinicName',
      type: 'text',
      defaultValue: 'Rennbahnklinik Muttenz',
      label: { de: 'Klinikname', en: 'Clinic Name', fr: 'Nom de la clinique', it: 'Nome clinica' },
    },
    {
      name: 'departmentName',
      type: 'text',
      defaultValue: 'Abteilung Anästhesiologie',
      label: { de: 'Abteilungsname', en: 'Department Name', fr: 'Nom du département', it: 'Nome reparto' },
    },
    {
      name: 'sessionTimeoutMinutes',
      type: 'number',
      defaultValue: 15,
      min: 5,
      max: 60,
      label: { de: 'Sitzungs-Timeout (Minuten)', en: 'Session Timeout (minutes)', fr: 'Délai de session (minutes)', it: 'Timeout sessione (minuti)' },
    },
    {
      name: 'mfaRequiredRoles',
      type: 'select',
      hasMany: true,
      defaultValue: [UserRole.SYSTEM_ADMIN, UserRole.QM_OFFICER, UserRole.DEPT_HEAD],
      label: { de: 'MFA-Pflicht für Rollen', en: 'MFA Required for Roles', fr: 'MFA obligatoire pour les rôles', it: 'MFA obbligatorio per i ruoli' },
      options: [
        { label: 'Systemadministrator', value: UserRole.SYSTEM_ADMIN },
        { label: 'QM-Beauftragter', value: UserRole.QM_OFFICER },
        { label: 'Abteilungsleitung', value: UserRole.DEPT_HEAD },
        { label: 'Facharzt', value: UserRole.PHYSICIAN },
        { label: 'Pflegefachperson', value: UserRole.NURSE },
      ],
    },
    {
      name: 'retentionPeriods',
      type: 'group',
      label: { de: 'Aufbewahrungsfristen (Jahre)', en: 'Retention Periods (years)', fr: 'Périodes de conservation (années)', it: 'Periodi di conservazione (anni)' },
      fields: [
        { name: 'sop', type: 'number', defaultValue: 10, label: 'SOP' },
        { name: 'notfallCheckliste', type: 'number', defaultValue: 10, label: 'Notfall-Checkliste' },
        { name: 'arbeitsplatzCheckliste', type: 'number', defaultValue: 5, label: 'Arbeitsplatz-Checkliste' },
        { name: 'einwilligungsbogen', type: 'number', defaultValue: 20, label: 'Einwilligungsbogen' },
        { name: 'qualitaetsdokument', type: 'number', defaultValue: 10, label: 'Qualitätsdokument' },
        { name: 'formularVorlage', type: 'number', defaultValue: 5, label: 'Formular/Vorlage' },
        { name: 'schulungsunterlage', type: 'number', defaultValue: 5, label: 'Schulungsunterlage' },
        { name: 'geraeteWartung', type: 'number', defaultValue: 20, label: 'Geräte-/Wartungsdokumentation' },
      ],
    },
    {
      name: 'expiryWarningDays',
      type: 'array',
      defaultValue: [{ days: 30 }, { days: 14 }, { days: 7 }],
      label: { de: 'Ablaufwarnung (Tage vorher)', en: 'Expiry Warning (days before)', fr: 'Avertissement d\'expiration (jours avant)', it: 'Avviso scadenza (giorni prima)' },
      fields: [
        { name: 'days', type: 'number', min: 1, max: 365, label: { de: 'Tage', en: 'Days', fr: 'Jours', it: 'Giorni' } },
      ],
    },
    {
      name: 'samlEnabled',
      type: 'checkbox',
      defaultValue: false,
      label: { de: 'SAML SSO aktiviert', en: 'SAML SSO Enabled', fr: 'SAML SSO activé', it: 'SAML SSO abilitato' },
    },
    {
      name: 'samlRoleMapping',
      type: 'array',
      label: { de: 'SAML Gruppen → Rollen Zuordnung', en: 'SAML Groups → Role Mapping', fr: 'Groupes SAML → Mappage de rôles', it: 'Gruppi SAML → Mappatura ruoli' },
      fields: [
        { name: 'adGroup', type: 'text', label: { de: 'AD-Gruppe', en: 'AD Group', fr: 'Groupe AD', it: 'Gruppo AD' } },
        {
          name: 'role',
          type: 'select',
          options: [
            { label: 'Systemadministrator', value: UserRole.SYSTEM_ADMIN },
            { label: 'QM-Beauftragter', value: UserRole.QM_OFFICER },
            { label: 'Abteilungsleitung', value: UserRole.DEPT_HEAD },
            { label: 'Facharzt', value: UserRole.PHYSICIAN },
            { label: 'Pflegefachperson', value: UserRole.NURSE },
            { label: 'Externer Auditor', value: UserRole.AUDITOR },
          ],
        },
      ],
    },
  ],
}
