const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const normalizedBasePath = rawBasePath.endsWith('/')
  ? rawBasePath.slice(0, -1)
  : rawBasePath

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
