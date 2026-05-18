import * as OTPAuth from 'otpauth'
import { randomBytes, createHash } from 'crypto'

const ISSUER = process.env.MFA_ISSUER || 'DMS Rennbahnklinik'

export function generateTOTPSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32
}

export function generateTOTPUri(secret: string, userEmail: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: userEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })
  return totp.toString()
}

export function verifyTOTP(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    })
    const delta = totp.validate({ token, window: 1 })
    return delta !== null
  } catch {
    return false
  }
}

export function generateBackupCodes(count = 8): { plain: string[]; hashed: string[] } {
  const plain: string[] = []
  const hashed: string[] = []

  for (let i = 0; i < count; i++) {
    const code = randomBytes(5).toString('hex').toUpperCase()
    const formatted = `${code.slice(0, 5)}-${code.slice(5)}`
    plain.push(formatted)
    hashed.push(createHash('sha256').update(formatted).digest('hex'))
  }

  return { plain, hashed }
}

export function verifyBackupCode(code: string, hashedCodes: string[]): {
  valid: boolean
  remainingCodes: string[]
} {
  const normalized = code.toUpperCase().replace(/\s/g, '')
  const hash = createHash('sha256').update(normalized).digest('hex')
  const index = hashedCodes.indexOf(hash)

  if (index === -1) {
    return { valid: false, remainingCodes: hashedCodes }
  }

  const remainingCodes = [...hashedCodes]
  remainingCodes.splice(index, 1)
  return { valid: true, remainingCodes }
}
