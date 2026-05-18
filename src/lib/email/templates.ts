export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

const brandColor = '#003366'
const logoUrl = 'https://www.rennbahnklinik.ch/logo.png'

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DMS Rennbahnklinik</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: ${brandColor}; padding: 24px 32px;">
      <p style="color: white; font-size: 20px; font-weight: bold; margin: 0;">DMS Rennbahnklinik</p>
      <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 4px 0 0;">Abteilung Anästhesiologie</p>
    </div>
    <div style="padding: 32px;">
      ${content}
    </div>
    <div style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Diese E-Mail wurde automatisch vom DMS Rennbahnklinik versendet. Bitte nicht antworten.
      </p>
    </div>
  </div>
</body>
</html>`
}

type Lang = 'de' | 'en' | 'fr' | 'it'

const t = {
  reviewRequested: {
    de: { subject: 'Prüfungsaufgabe: {title}', body: 'Ihnen wurde eine Prüfungsaufgabe für das Dokument "{title}" (Version {version}) zugewiesen. Bitte prüfen Sie das Dokument und genehmigen oder lehnen Sie es ab.' },
    en: { subject: 'Review Task: {title}', body: 'You have been assigned a review task for document "{title}" (version {version}). Please review the document and approve or reject it.' },
    fr: { subject: 'Tâche de révision: {title}', body: 'Une tâche de révision pour le document "{title}" (version {version}) vous a été assignée. Veuillez examiner le document et l\'approuver ou le rejeter.' },
    it: { subject: 'Attività di revisione: {title}', body: 'È stata assegnata un\'attività di revisione per il documento "{title}" (versione {version}). Si prega di esaminare il documento e approvarlo o rifiutarlo.' },
  },
  documentApproved: {
    de: { subject: 'Dokument freigegeben: {title}', body: 'Ihr Dokument "{title}" (Version {version}) wurde freigegeben und ist jetzt für alle berechtigten Mitarbeiter sichtbar.' },
    en: { subject: 'Document Approved: {title}', body: 'Your document "{title}" (version {version}) has been approved and is now visible to all authorized users.' },
    fr: { subject: 'Document approuvé: {title}', body: 'Votre document "{title}" (version {version}) a été approuvé et est maintenant visible pour tous les utilisateurs autorisés.' },
    it: { subject: 'Documento approvato: {title}', body: 'Il documento "{title}" (versione {version}) è stato approvato ed è ora visibile a tutti gli utenti autorizzati.' },
  },
  validityExpiring: {
    de: { subject: 'Gültigkeit läuft ab: {title}', body: 'Das Dokument "{title}" läuft am {date} ab. Bitte überprüfen Sie das Dokument und aktualisieren Sie es falls nötig.' },
    en: { subject: 'Validity Expiring: {title}', body: 'Document "{title}" expires on {date}. Please review and update the document if necessary.' },
    fr: { subject: 'Validité expire: {title}', body: 'Le document "{title}" expire le {date}. Veuillez réviser et mettre à jour le document si nécessaire.' },
    it: { subject: 'Validità in scadenza: {title}', body: 'Il documento "{title}" scade il {date}. Si prega di rivedere e aggiornare il documento se necessario.' },
  },
  readConfirmationRequired: {
    de: { subject: 'Lesebestätigung erforderlich: {title}', body: 'Das Dokument "{title}" (Version {version}) erfordert Ihre Lesebestätigung. Bitte öffnen Sie das Dokument und bestätigen Sie, dass Sie es gelesen und verstanden haben.' },
    en: { subject: 'Read Confirmation Required: {title}', body: 'Document "{title}" (version {version}) requires your read confirmation. Please open the document and confirm that you have read and understood it.' },
    fr: { subject: 'Confirmation de lecture requise: {title}', body: 'Le document "{title}" (version {version}) nécessite votre confirmation de lecture. Veuillez ouvrir le document et confirmer que vous l\'avez lu et compris.' },
    it: { subject: 'Conferma di lettura richiesta: {title}', body: 'Il documento "{title}" (versione {version}) richiede la sua conferma di lettura. Aprire il documento e confermare di averlo letto e compreso.' },
  },
}

function fill(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`{${k}}`, 'g'), v), template)
}

export function getReviewRequestedEmail(params: { title: string; version: string; documentUrl: string; lang?: Lang }): EmailTemplate {
  const l = (params.lang || 'de') as Lang
  const tr = t.reviewRequested[l]
  const subject = fill(tr.subject, { title: params.title })
  const body = fill(tr.body, { title: params.title, version: params.version })
  const html = baseTemplate(`
    <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">${body}</p>
    <a href="${params.documentUrl}" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
      Dokument öffnen / Open Document
    </a>
  `)
  return { subject, html, text: `${body}\n\n${params.documentUrl}` }
}

export function getDocumentApprovedEmail(params: { title: string; version: string; documentUrl: string; lang?: Lang }): EmailTemplate {
  const l = (params.lang || 'de') as Lang
  const tr = t.documentApproved[l]
  const subject = fill(tr.subject, { title: params.title })
  const body = fill(tr.body, { title: params.title, version: params.version })
  const html = baseTemplate(`
    <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">${body}</p>
    <a href="${params.documentUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
      Dokument ansehen / View Document
    </a>
  `)
  return { subject, html, text: `${body}\n\n${params.documentUrl}` }
}

export function getValidityExpiringEmail(params: { title: string; date: string; documentUrl: string; lang?: Lang }): EmailTemplate {
  const l = (params.lang || 'de') as Lang
  const tr = t.validityExpiring[l]
  const subject = fill(tr.subject, { title: params.title })
  const body = fill(tr.body, { title: params.title, date: params.date })
  const html = baseTemplate(`
    <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">${body}</p>
    <a href="${params.documentUrl}" style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
      Dokument überprüfen / Review Document
    </a>
  `)
  return { subject, html, text: `${body}\n\n${params.documentUrl}` }
}

export function getReadConfirmationEmail(params: { title: string; version: string; documentUrl: string; lang?: Lang }): EmailTemplate {
  const l = (params.lang || 'de') as Lang
  const tr = t.readConfirmationRequired[l]
  const subject = fill(tr.subject, { title: params.title })
  const body = fill(tr.body, { title: params.title, version: params.version })
  const html = baseTemplate(`
    <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">${body}</p>
    <a href="${params.documentUrl}" style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
      Dokument lesen und bestätigen / Read and Confirm
    </a>
  `)
  return { subject, html, text: `${body}\n\n${params.documentUrl}` }
}
