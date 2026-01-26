import bcrypt from 'bcryptjs'
import { customAlphabet } from 'nanoid'

const SALT_ROUNDS = 10

// Generate alphanumeric IDs (lowercase)
const nanoidAlphanumeric = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

// Generate secrets (more characters, mixed case for security)
const nanoidSecret = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', 16)

// Generate API keys (longer, more secure)
const nanoidApiKey = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', 32)

/**
 * Generate a unique vote ID (lowercase alphanumeric)
 */
export function generateVoteId(): string {
  return nanoidAlphanumeric()
}

/**
 * Generate a write secret for ballot submission
 */
export function generateWriteSecret(): string {
  return nanoidSecret()
}

/**
 * Hash a write secret for storage
 */
export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, SALT_ROUNDS)
}

/**
 * Verify a write secret against its hash
 */
export async function verifySecret(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash)
}

/**
 * Validate vote ID format (lowercase alphanumeric and dashes)
 */
export function isValidVoteId(id: string): boolean {
  return /^[a-z0-9-]+$/.test(id) && id.length >= 3 && id.length <= 32
}

/**
 * Canonicalize vote ID to lowercase
 */
export function canonicalizeVoteId(id: string): string {
  return id.toLowerCase()
}

/**
 * Generate an API key for programmatic access
 */
export function generateApiKey(): string {
  return `rcv_${nanoidApiKey()}`
}

/**
 * Hash an API key for storage
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, SALT_ROUNDS)
}

/**
 * Verify an API key against its hash
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(apiKey, hash)
}
