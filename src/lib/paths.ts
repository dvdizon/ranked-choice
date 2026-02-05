const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const normalizedBasePath = rawBasePath.endsWith('/')
  ? rawBasePath.slice(0, -1)
  : rawBasePath

const normalizeBaseUrl = (baseUrl: string) => (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl)

const stripBasePathFromBaseUrl = (baseUrl: string) => {
  if (!normalizedBasePath) {
    return normalizeBaseUrl(baseUrl)
  }

  try {
    const parsed = new URL(baseUrl)
    if (
      parsed.pathname === normalizedBasePath ||
      parsed.pathname.startsWith(`${normalizedBasePath}/`)
    ) {
      const remainder = parsed.pathname.slice(normalizedBasePath.length)
      parsed.pathname = remainder.length > 0 ? remainder : '/'
      parsed.search = ''
      parsed.hash = ''
      return normalizeBaseUrl(parsed.toString())
    }
  } catch {
    return normalizeBaseUrl(baseUrl)
  }

  return normalizeBaseUrl(baseUrl)
}

const isAbsoluteUrl = (path: string) => /^https?:\/\//i.test(path)
const dedupeBasePathPrefix = (path: string) => {
  if (!normalizedBasePath) {
    return path
  }

  const doublePrefix = `${normalizedBasePath}${normalizedBasePath}`
  let normalizedPath = path

  while (
    normalizedPath === doublePrefix ||
    normalizedPath.startsWith(`${doublePrefix}/`)
  ) {
    normalizedPath = normalizedPath.replace(doublePrefix, normalizedBasePath)
  }

  return normalizedPath
}

export const withBasePath = (path: string) => {
  if (!path || isAbsoluteUrl(path)) {
    return path
  }

  const normalizedPath = dedupeBasePathPrefix(path)

  if (!normalizedBasePath) {
    return normalizedPath
  }

  if (
    normalizedPath === normalizedBasePath ||
    normalizedPath.startsWith(`${normalizedBasePath}/`)
  ) {
    return normalizedPath
  }

  if (normalizedPath === '/') {
    return normalizedBasePath
  }

  return `${normalizedBasePath}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`
}

export const getBaseUrl = (): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3100'
  return stripBasePathFromBaseUrl(baseUrl)
}
