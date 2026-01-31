/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow better-sqlite3 native module
  serverExternalPackages: ['better-sqlite3'],
  basePath: '/rcv',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/rcv',
  },
}

module.exports = nextConfig
