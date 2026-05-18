export const UserRole = {
  SYSTEM_ADMIN: 'systemadmin',
  QM_OFFICER: 'qm_beauftragter',
  DEPT_HEAD: 'abteilungsleitung',
  PHYSICIAN: 'facharzt',
  NURSE: 'pflegefachperson',
  AUDITOR: 'externer_auditor',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const DocumentStatus = {
  DRAFT: 'entwurf',
  IN_REVIEW: 'in_pruefung',
  APPROVED: 'freigegeben',
  IN_REVISION: 'in_revision',
  ARCHIVED: 'archiviert',
} as const
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus]

export const DocumentType = {
  SOP: 'sop',
  EMERGENCY_CHECKLIST: 'notfall_checkliste',
  WORKPLACE_CHECKLIST: 'arbeitsplatz_checkliste',
  CONSENT_FORM: 'einwilligungsbogen',
  QUALITY_DOC: 'qualitaetsdokument',
  FORM_TEMPLATE: 'formular_vorlage',
  TRAINING_MATERIAL: 'schulungsunterlage',
  EQUIPMENT_DOC: 'geraete_wartung',
} as const
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType]

export const WorkflowType = {
  SINGLE: 'einstufig',
  TWO_STAGE: 'zweistufig',
  THREE_STAGE: 'dreistufig',
} as const
export type WorkflowType = (typeof WorkflowType)[keyof typeof WorkflowType]

export const ApprovalTaskType = {
  REVIEW: 'pruefung',
  APPROVAL: 'freigabe',
} as const
export type ApprovalTaskType = (typeof ApprovalTaskType)[keyof typeof ApprovalTaskType]

export const ApprovalTaskStatus = {
  OPEN: 'offen',
  APPROVED: 'genehmigt',
  REJECTED: 'abgelehnt',
  EXPIRED: 'abgelaufen',
} as const
export type ApprovalTaskStatus = (typeof ApprovalTaskStatus)[keyof typeof ApprovalTaskStatus]

export const AuditAction = {
  CREATED: 'erstellt',
  READ: 'gelesen',
  UPDATED: 'geaendert',
  APPROVED: 'freigegeben',
  REJECTED: 'abgelehnt',
  ARCHIVED: 'archiviert',
  READ_CONFIRMED: 'lesebestaetigt',
  DELETED: 'geloescht',
  EXPORTED: 'exportiert',
  LOGIN: 'angemeldet',
  LOGOUT: 'abgemeldet',
  MFA_ENROLLED: 'mfa_aktiviert',
  PASSWORD_CHANGED: 'passwort_geaendert',
} as const
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction]

export const RETENTION_YEARS: Record<DocumentType, number> = {
  [DocumentType.SOP]: 10,
  [DocumentType.EMERGENCY_CHECKLIST]: 10,
  [DocumentType.WORKPLACE_CHECKLIST]: 5,
  [DocumentType.CONSENT_FORM]: 20,
  [DocumentType.QUALITY_DOC]: 10,
  [DocumentType.FORM_TEMPLATE]: 5,
  [DocumentType.TRAINING_MATERIAL]: 5,
  [DocumentType.EQUIPMENT_DOC]: 20,
}

export const WORKFLOW_FOR_TYPE: Record<DocumentType, WorkflowType> = {
  [DocumentType.SOP]: WorkflowType.TWO_STAGE,
  [DocumentType.EMERGENCY_CHECKLIST]: WorkflowType.TWO_STAGE,
  [DocumentType.WORKPLACE_CHECKLIST]: WorkflowType.SINGLE,
  [DocumentType.CONSENT_FORM]: WorkflowType.TWO_STAGE,
  [DocumentType.QUALITY_DOC]: WorkflowType.THREE_STAGE,
  [DocumentType.FORM_TEMPLATE]: WorkflowType.SINGLE,
  [DocumentType.TRAINING_MATERIAL]: WorkflowType.SINGLE,
  [DocumentType.EQUIPMENT_DOC]: WorkflowType.SINGLE,
}

export const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'it'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'de'
