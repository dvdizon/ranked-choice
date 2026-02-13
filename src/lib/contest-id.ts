const DEFAULT_RECURRING_ID_FORMAT = '{title}-{close-mm-dd-yyyy}'

function canonicalizeVoteId(id: string): string {
  return id.toLowerCase()
}

function isValidVoteId(id: string): boolean {
  return /^[a-z0-9-]+$/.test(id) && id.length >= 3 && id.length <= 32
}

function formatDate(date: Date, order: 'mm-dd-yyyy' | 'yyyy-mm-dd'): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = String(date.getFullYear())
  return order === 'mm-dd-yyyy' ? `${month}-${day}-${year}` : `${year}-${month}-${day}`
}

export function slugifyContestTitle(title: string): string {
  const normalized = canonicalizeVoteId(title)
    .replace(/[^a-z0-9-\s]/g, '-')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || 'contest'
}

export function normalizeContestId(candidate: string): string {
  return canonicalizeVoteId(candidate)
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildContestIdFromFormat(input: {
  title: string
  closeAt: Date
  startAt?: Date
  format?: string | null
}): string {
  const titleSlug = slugifyContestTitle(input.title)
  const format = (input.format && input.format.trim().length > 0)
    ? input.format.trim()
    : DEFAULT_RECURRING_ID_FORMAT

  const tokenMap: Record<string, string> = {
    '{title}': titleSlug,
    '{close-mm-dd-yyyy}': formatDate(input.closeAt, 'mm-dd-yyyy'),
    '{close-yyyy-mm-dd}': formatDate(input.closeAt, 'yyyy-mm-dd'),
    '{start-mm-dd-yyyy}': input.startAt ? formatDate(input.startAt, 'mm-dd-yyyy') : '',
    '{start-yyyy-mm-dd}': input.startAt ? formatDate(input.startAt, 'yyyy-mm-dd') : '',
  }

  let rendered = format
  for (const [token, value] of Object.entries(tokenMap)) {
    rendered = rendered.split(token).join(value)
  }

  const normalized = normalizeContestId(rendered)
  return normalized || `${titleSlug}-${formatDate(input.closeAt, 'mm-dd-yyyy')}`
}

export function createUniqueVoteId(baseId: string, exists: (id: string) => boolean): string {
  let candidate = baseId.slice(0, 32)
  if (!isValidVoteId(candidate)) {
    candidate = normalizeContestId(candidate).slice(0, 32)
  }

  if (candidate.length < 3) {
    candidate = `vote-${Date.now().toString(36)}`.slice(0, 32)
  }

  if (!exists(candidate)) {
    return candidate
  }

  let suffix = 2
  while (suffix < 10000) {
    const suffixText = `-${suffix}`
    const prefix = candidate.slice(0, 32 - suffixText.length).replace(/-+$/g, '')
    const next = `${prefix}${suffixText}`
    if (isValidVoteId(next) && !exists(next)) {
      return next
    }
    suffix += 1
  }

  return `${candidate.slice(0, 24)}-${Date.now().toString(36)}`.slice(0, 32)
}

export { DEFAULT_RECURRING_ID_FORMAT }
