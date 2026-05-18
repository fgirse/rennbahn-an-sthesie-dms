import { SAML } from '@node-saml/node-saml'
import type { SamlConfig } from '@node-saml/node-saml'
import { UserRole } from '@/lib/types'

function getSamlConfig(): SamlConfig {
  return {
    entryPoint: process.env.SAML_IDP_SSO_URL || '',
    issuer: process.env.SAML_SP_ENTITY_ID || 'http://localhost:3000',
    callbackUrl: process.env.SAML_SP_ACS_URL || 'http://localhost:3000/api/auth/saml/callback',
    idpCert: process.env.SAML_IDP_CERT || '',
    wantAssertionsSigned: true,
    signatureAlgorithm: 'sha256',
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  }
}

export function getSamlInstance(): SAML {
  return new SAML(getSamlConfig())
}

export async function generateSamlLoginUrl(): Promise<string> {
  const saml = getSamlInstance()
  const url = await saml.getAuthorizeUrlAsync('', '', {})
  return url
}

export async function validateSamlResponse(body: Record<string, string>): Promise<{
  email: string
  firstName: string
  lastName: string
  groups: string[]
  nameId: string
}> {
  const saml = getSamlInstance()
  const { profile } = await saml.validatePostResponseAsync(body)

  if (!profile) throw new Error('Invalid SAML response')

  const email =
    (profile.email as string) ||
    (profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] as string) ||
    profile.nameID

  const firstName =
    (profile.firstName as string) ||
    (profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] as string) ||
    ''

  const lastName =
    (profile.lastName as string) ||
    (profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] as string) ||
    ''

  const rawGroups = profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']
  const groups: string[] = Array.isArray(rawGroups)
    ? rawGroups as string[]
    : rawGroups
    ? [rawGroups as string]
    : []

  return { email, firstName, lastName, groups, nameId: profile.nameID }
}

export function mapGroupsToRole(
  groups: string[],
  roleMapping: Array<{ adGroup: string; role: string }>
): UserRole {
  for (const mapping of roleMapping) {
    if (groups.includes(mapping.adGroup)) {
      return mapping.role as UserRole
    }
  }
  return UserRole.NURSE // Safe default
}

export function getSamlMetadataXml(): string {
  const entityId = process.env.SAML_SP_ENTITY_ID || 'http://localhost:3000'
  const acsUrl = process.env.SAML_SP_ACS_URL || 'http://localhost:3000/api/auth/saml/callback'

  return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${entityId}">
  <SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}"
      index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`
}
