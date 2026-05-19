/**
 * Safely extract a string ID from any Payload/MongoDB document or relationship field.
 *
 * Payload v3 with MongoDB can return IDs as:
 *   - plain string (normal case)
 *   - number
 *   - BSON ObjectId instance (has toHexString / toString)
 *   - EJSON object { $oid: 'hex' }
 *   - populated document object { id: string, ... }
 *
 * Using String() directly is unsafe when the BSON ObjectId prototype is missing
 * (version mismatch), because toString() falls back to [object Object].
 */
export function extractId(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    if (value === '[object Object]') return ''
    return value
  }
  if (typeof value === 'number') return String(value)

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>

    // BSON ObjectId: toHexString() is the canonical method
    if (typeof obj.toHexString === 'function') {
      return (obj as { toHexString: () => string }).toHexString()
    }

    // EJSON Extended JSON format: { $oid: '...' }
    if (typeof obj.$oid === 'string') return obj.$oid

    // Populated Payload document: { id: string|number, ... }
    if (obj.id !== undefined && obj.id !== null) return extractId(obj.id)

    // Last resort: try toString() only if it's overridden
    if (obj.toString !== Object.prototype.toString) {
      const str = String(obj)
      if (str && str !== '[object Object]') return str
    }
  }

  return ''
}
