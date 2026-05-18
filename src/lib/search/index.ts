import type { BasePayload, Where } from 'payload'
import { UserRole, DocumentStatus } from '@/lib/types'

export interface SearchParams {
  q?: string
  type?: string
  status?: string
  authorId?: string
  validUntilBefore?: string
  validUntilAfter?: string
  tags?: string[]
  categoryId?: string
  locale?: string
  page?: number
  limit?: number
  sort?: 'title' | '-createdAt' | 'validUntil' | '-validUntil'
}

export interface SearchResult {
  docs: unknown[]
  totalDocs: number
  totalPages: number
  page: number
  hasPrevPage: boolean
  hasNextPage: boolean
}

export async function searchDocuments(
  payload: BasePayload,
  params: SearchParams,
  user: { id: string; role: UserRole }
): Promise<SearchResult> {
  const {
    q,
    type,
    status,
    authorId,
    validUntilBefore,
    validUntilAfter,
    tags,
    categoryId,
    locale = 'de',
    page = 1,
    limit = 20,
    sort = '-createdAt',
  } = params

  // Build where clause
  const where: Where = {}
  const andClauses: Where[] = []

  // Role-based status filter
  if (user.role === UserRole.NURSE) {
    andClauses.push({ status: { equals: DocumentStatus.APPROVED } })
  } else if (user.role === UserRole.AUDITOR) {
    andClauses.push({ status: { equals: DocumentStatus.APPROVED } })
    andClauses.push({ documentType: { equals: 'qualitaetsdokument' } })
  } else if (user.role === UserRole.PHYSICIAN) {
    andClauses.push({
      or: [
        { status: { equals: DocumentStatus.APPROVED } },
        { status: { equals: DocumentStatus.IN_REVIEW } },
        { owner: { equals: user.id } },
      ],
    })
  }

  // User-provided filters
  if (type) andClauses.push({ documentType: { equals: type } })
  if (status) andClauses.push({ status: { equals: status } })
  if (authorId) andClauses.push({ owner: { equals: authorId } })
  if (categoryId) andClauses.push({ category: { equals: categoryId } })
  if (validUntilBefore) andClauses.push({ validUntil: { less_than: validUntilBefore } })
  if (validUntilAfter) andClauses.push({ validUntil: { greater_than: validUntilAfter } })

  if (tags && tags.length > 0) {
    andClauses.push({ 'tags.tag': { in: tags } })
  }

  if (q) {
    andClauses.push({
      or: [
        { title: { like: q } },
        { description: { like: q } },
        { documentNumber: { like: q } },
        { 'tags.tag': { like: q } },
      ],
    })
  }

  if (andClauses.length > 0) {
    where.and = andClauses
  }

  const result = await payload.find({
    collection: 'documents',
    where,
    page,
    limit,
    sort,
    locale: locale as 'de' | 'en' | 'fr' | 'it',
    depth: 1,
  })

  return result as SearchResult
}
