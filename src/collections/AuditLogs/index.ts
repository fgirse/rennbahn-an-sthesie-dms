import type { CollectionConfig } from 'payload'
import { UserRole } from '../../lib/types.ts'

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['timestamp', 'userName', 'userRole', 'action', 'documentTitle'],
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => {
      const role = req.user?.role
      if (!role) return false
      return (
        role === UserRole.SYSTEM_ADMIN ||
        role === UserRole.QM_OFFICER ||
        role === UserRole.AUDITOR
      )
    },
    // WORM: update and delete are never allowed
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'userId',
      type: 'text',
      required: true,
      label: { de: 'Benutzer-ID', en: 'User ID', fr: 'ID utilisateur', it: 'ID utente' },
    },
    {
      name: 'userName',
      type: 'text',
      label: { de: 'Benutzername', en: 'Username', fr: 'Nom d\'utilisateur', it: 'Nome utente' },
    },
    {
      name: 'userRole',
      type: 'text',
      label: { de: 'Benutzerrolle', en: 'User Role', fr: 'Rôle utilisateur', it: 'Ruolo utente' },
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      label: { de: 'Aktion', en: 'Action', fr: 'Action', it: 'Azione' },
      options: [
        { label: { de: 'Erstellt', en: 'Created', fr: 'Créé', it: 'Creato' }, value: 'erstellt' },
        { label: { de: 'Gelesen', en: 'Read', fr: 'Lu', it: 'Letto' }, value: 'gelesen' },
        { label: { de: 'Geändert', en: 'Updated', fr: 'Modifié', it: 'Modificato' }, value: 'geaendert' },
        { label: { de: 'Freigegeben', en: 'Approved', fr: 'Approuvé', it: 'Approvato' }, value: 'freigegeben' },
        { label: { de: 'Abgelehnt', en: 'Rejected', fr: 'Rejeté', it: 'Rifiutato' }, value: 'abgelehnt' },
        { label: { de: 'Archiviert', en: 'Archived', fr: 'Archivé', it: 'Archiviato' }, value: 'archiviert' },
        { label: { de: 'Lesebestätigt', en: 'Read Confirmed', fr: 'Lu et confirmé', it: 'Lettura confermata' }, value: 'lesebestaetigt' },
        { label: { de: 'Gelöscht', en: 'Deleted', fr: 'Supprimé', it: 'Eliminato' }, value: 'geloescht' },
        { label: { de: 'Exportiert', en: 'Exported', fr: 'Exporté', it: 'Esportato' }, value: 'esportato' },
        { label: { de: 'Angemeldet', en: 'Logged In', fr: 'Connecté', it: 'Accesso effettuato' }, value: 'angemeldet' },
        { label: { de: 'Abgemeldet', en: 'Logged Out', fr: 'Déconnecté', it: 'Disconnesso' }, value: 'abgemeldet' },
        { label: { de: 'MFA aktiviert', en: 'MFA Enrolled', fr: 'MFA activé', it: 'MFA attivato' }, value: 'mfa_aktiviert' },
        { label: { de: 'Passwort geändert', en: 'Password Changed', fr: 'Mot de passe modifié', it: 'Password modificata' }, value: 'passwort_geaendert' },
        { label: { de: 'In Prüfung', en: 'Sent for Review', fr: 'Envoyé pour révision', it: 'Inviato per revisione' }, value: 'in_pruefung' },
        { label: { de: 'In Revision', en: 'Sent for Revision', fr: 'Envoyé en révision', it: 'Inviato in revisione' }, value: 'in_revision' },
      ],
    },
    {
      name: 'documentId',
      type: 'text',
      label: { de: 'Dokument-ID', en: 'Document ID', fr: 'ID document', it: 'ID documento' },
    },
    {
      name: 'documentTitle',
      type: 'text',
      label: { de: 'Dokumenttitel', en: 'Document Title', fr: 'Titre du document', it: 'Titolo documento' },
    },
    {
      name: 'documentVersion',
      type: 'text',
      label: { de: 'Dokumentversion', en: 'Document Version', fr: 'Version du document', it: 'Versione documento' },
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      label: { de: 'Zeitstempel', en: 'Timestamp', fr: 'Horodatage', it: 'Timestamp' },
      admin: { readOnly: true },
    },
    {
      name: 'ipAddress',
      type: 'text',
      label: { de: 'IP-Adresse', en: 'IP Address', fr: 'Adresse IP', it: 'Indirizzo IP' },
    },
    {
      name: 'details',
      type: 'json',
      label: { de: 'Details', en: 'Details', fr: 'Détails', it: 'Dettagli' },
    },
  ],
  timestamps: false,
}
