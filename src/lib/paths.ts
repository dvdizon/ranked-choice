const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const normalizedBasePath = rawBasePath.endsWith('/')
  ? rawBasePath.slice(0, -1)
  : rawBasePath

const isAbsoluteUrl = (path: string) => /^https?:\/\//i.test(path)

export const withBasePath = (path: string) => {
  if (!path || isAbsoluteUrl(path)) {
    return path
  }

  if (!normalizedBasePath) {
    return path
  }

  if (path === normalizedBasePath || path.startsWith(`${normalizedBasePath}/`)) {
    return path
  }

  if (path === '/') {
    return normalizedBasePath
  }

  return `${normalizedBasePath}${path.startsWith('/') ? '' : '/'}${path}`
}
