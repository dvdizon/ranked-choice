import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let isBuildPhase = false
try {
  // Avoid opening the real DB during Next.js build data collection.
  const { PHASE_PRODUCTION_BUILD } = require('next/constants') as { PHASE_PRODUCTION_BUILD: string }
  isBuildPhase = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
} catch {
  // Ignore if next/constants is unavailable.
}

const DATABASE_PATH = isBuildPhase ? ':memory:' : (process.env.DATABASE_PATH || './data/rcv.sqlite')

// Ensure the directory exists
if (DATABASE_PATH !== ':memory:') {
  const dbDir = path.dirname(DATABASE_PATH)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
}

const db = new Database(DATABASE_PATH)

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 3000')

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    options TEXT NOT NULL,
    write_secret_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT,
    auto_close_at TEXT,
    open_notified_at TEXT,
    closed_notified_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ballots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vote_id TEXT NOT NULL,
    rankings TEXT NOT NULL,
    voter_name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (vote_id) REFERENCES votes(id)
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_ballots_vote_id ON ballots(vote_id);
  CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
`)

// Migration: Add voter_name column if it doesn't exist
try {
  db.exec(`ALTER TABLE ballots ADD COLUMN voter_name TEXT NOT NULL DEFAULT ''`)
} catch (e) {
  // Column already exists, ignore error
}

// Migration: Add voter_names_required column if it doesn't exist
try {
  db.exec(`ALTER TABLE votes ADD COLUMN voter_names_required INTEGER NOT NULL DEFAULT 1`)
} catch (e) {
  // Column already exists, ignore error
}

// Migration: Add auto_close_at column if it doesn't exist
try {
  db.exec(`ALTER TABLE votes ADD COLUMN auto_close_at TEXT`)
} catch (e) {
  // Column already exists, ignore error
}

// Migration: Add voting_secret_hash column if it doesn't exist
try {
  db.exec(`ALTER TABLE votes ADD COLUMN voting_secret_hash TEXT`)
} catch (e) {
  // Column already exists, ignore error
}

// Migration: Add recurring vote fields
try {
  db.exec(`ALTER TABLE votes ADD COLUMN period_days INTEGER`)
} catch (e) {
  // Column already exists, ignore error
}

try {
  db.exec(`ALTER TABLE votes ADD COLUMN vote_duration_hours INTEGER`)
} catch (e) {
  // Column already exists, ignore error
}

try {
  db.exec(`ALTER TABLE votes ADD COLUMN recurrence_start_at TEXT`)
} catch (e) {
  // Column already exists, ignore error
}

try {
  db.exec(`ALTER TABLE votes ADD COLUMN recurrence_group_id TEXT`)
} catch (e) {
  // Column already exists, ignore error
}

try {
  db.exec(`ALTER TABLE votes ADD COLUMN integration_id INTEGER`)
} catch (e) {
  // Column already exists, ignore error
}

try {
  db.exec(`ALTER TABLE votes ADD COLUMN recurrence_active INTEGER DEFAULT 0`)
} catch (e) {
  // Column already exists, ignore error
}

try {
  db.exec(`ALTER TABLE votes ADD COLUMN voting_secret_plaintext TEXT`)
} catch (e) {
  // Column already exists, ignore error
}

// Migration: Add open_notified_at column if it doesn't exist
try {
  db.exec(`ALTER TABLE votes ADD COLUMN open_notified_at TEXT`)
} catch (e) {
  // Column already exists, ignore error
}

// Migration: Add closed_notified_at column if it doesn't exist
try {
  db.exec(`ALTER TABLE votes ADD COLUMN closed_notified_at TEXT`)
} catch (e) {
  // Column already exists, ignore error
}

// Create integrations table
db.exec(`
  CREATE TABLE IF NOT EXISTS integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

export default db

export interface Vote {
  id: string
  title: string
  options: string[]
  write_secret_hash: string
  voting_secret_hash: string | null
  voting_secret_plaintext: string | null
  created_at: string
  closed_at: string | null
  auto_close_at: string | null
  open_notified_at: string | null
  closed_notified_at: string | null
  voter_names_required: boolean
  period_days: number | null
  vote_duration_hours: number | null
  recurrence_start_at: string | null
  recurrence_group_id: string | null
  integration_id: number | null
  recurrence_active: boolean
}

export interface DiscordIntegrationConfig {
  webhook_url: string
}

export interface SlackIntegrationConfig {
  webhook_url: string
}

export interface WebhookIntegrationConfig {
  url: string
  headers?: Record<string, string>
}

export type IntegrationConfig = DiscordIntegrationConfig | SlackIntegrationConfig | WebhookIntegrationConfig

export interface Integration {
  id: number
  name: string
  type: 'discord' | 'slack' | 'webhook'
  config: IntegrationConfig
  created_at: string
}

export interface LiveVoteSummary {
  id: string
  title: string
  options: string[]
  created_at: string
  auto_close_at: string | null
  voter_names_required: boolean
  period_days: number | null
  vote_duration_hours: number | null
  recurrence_start_at: string | null
  recurrence_group_id: string | null
  integration_id: number | null
  recurrence_active: boolean
}

export interface Ballot {
  id: number
  vote_id: string
  rankings: string[]
  voter_name: string
  created_at: string
}

export interface ApiKey {
  id: number
  key_hash: string
  name: string | null
  created_at: string
  last_used_at: string | null
}

// Vote operations
export function createVote(
  id: string,
  title: string,
  options: string[],
  writeSecretHash: string,
  voterNamesRequired: boolean = true,
  autoCloseAt: string | null = null,
  votingSecretHash: string | null = null,
  recurrence?: {
    periodDays?: number | null
    voteDurationHours?: number | null
    recurrenceStartAt?: string | null
    recurrenceGroupId?: string | null
    integrationId?: number | null
    recurrenceActive?: boolean
    votingSecretPlaintext?: string | null
  }
): Vote {
  const periodDays = recurrence?.periodDays ?? null
  const voteDurationHours = recurrence?.voteDurationHours ?? null
  const recurrenceStartAt = recurrence?.recurrenceStartAt ?? null
  const recurrenceGroupId = recurrence?.recurrenceGroupId ?? null
  const integrationId = recurrence?.integrationId ?? null
  const recurrenceActive = recurrence?.recurrenceActive ? 1 : 0
  const votingSecretPlaintext = recurrence?.votingSecretPlaintext ?? null

  const stmt = db.prepare(`
    INSERT INTO votes (
      id, title, options, write_secret_hash, voter_names_required,
      auto_close_at, open_notified_at, closed_notified_at, voting_secret_hash, voting_secret_plaintext, period_days, vote_duration_hours,
      recurrence_start_at, recurrence_group_id, integration_id, recurrence_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    id,
    title,
    JSON.stringify(options),
    writeSecretHash,
    voterNamesRequired ? 1 : 0,
    autoCloseAt,
    null,
    null,
    votingSecretHash,
    votingSecretPlaintext,
    periodDays,
    voteDurationHours,
    recurrenceStartAt,
    recurrenceGroupId,
    integrationId,
    recurrenceActive
  )
  return getVote(id)!
}

export function getVote(id: string): Vote | null {
  const stmt = db.prepare('SELECT * FROM votes WHERE id = ?')
  const row = stmt.get(id) as any
  if (!row) return null

  const vote: Vote = {
    ...row,
    options: JSON.parse(row.options),
    voter_names_required: Boolean(row.voter_names_required),
    recurrence_active: Boolean(row.recurrence_active),
  }

  // Auto-close vote if auto_close_at has passed and vote is not already closed
  if (vote.auto_close_at && !vote.closed_at) {
    const now = new Date()
    const autoCloseDate = new Date(vote.auto_close_at)
    if (now >= autoCloseDate) {
      closeVote(id)
      vote.closed_at = new Date().toISOString()
    }
  }

  return vote
}

export function voteExists(id: string): boolean {
  const stmt = db.prepare('SELECT 1 FROM votes WHERE id = ?')
  return stmt.get(id) !== undefined
}

export function closeExpiredVotes(): number {
  const stmt = db.prepare(
    "UPDATE votes SET closed_at = datetime('now') WHERE closed_at IS NULL AND auto_close_at IS NOT NULL AND auto_close_at <= datetime('now')"
  )
  return stmt.run().changes
}

export function getLiveVotesPaginated(limit: number, offset: number): { votes: LiveVoteSummary[]; total: number } {
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM votes
    WHERE closed_at IS NULL
      AND (auto_close_at IS NULL OR auto_close_at > datetime('now'))
  `)
  const total = (countStmt.get() as { count: number }).count

  const stmt = db.prepare(`
    SELECT
      id,
      title,
      options,
      created_at,
      auto_close_at,
      voter_names_required,
      period_days,
      vote_duration_hours,
      recurrence_start_at,
      recurrence_group_id,
      integration_id,
      recurrence_active
    FROM votes
    WHERE closed_at IS NULL
      AND (auto_close_at IS NULL OR auto_close_at > datetime('now'))
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `)
  const rows = stmt.all(limit, offset) as any[]

  const votes = rows.map((row) => ({
    ...row,
    options: JSON.parse(row.options),
    voter_names_required: Boolean(row.voter_names_required),
    recurrence_active: Boolean(row.recurrence_active),
  }))

  return { votes, total }
}

// Ballot operations
export function createBallot(voteId: string, rankings: string[], voterName: string = ''): Ballot {
  const stmt = db.prepare(`
    INSERT INTO ballots (vote_id, rankings, voter_name)
    VALUES (?, ?, ?)
  `)
  const result = stmt.run(voteId, JSON.stringify(rankings), voterName)
  return getBallot(result.lastInsertRowid as number)!
}

export function getBallot(id: number): Ballot | null {
  const stmt = db.prepare('SELECT * FROM ballots WHERE id = ?')
  const row = stmt.get(id) as any
  if (!row) return null
  return {
    ...row,
    rankings: JSON.parse(row.rankings),
  }
}

export function getBallotsByVoteId(voteId: string): Ballot[] {
  const stmt = db.prepare('SELECT * FROM ballots WHERE vote_id = ? ORDER BY created_at')
  const rows = stmt.all(voteId) as any[]
  return rows.map((row) => ({
    ...row,
    rankings: JSON.parse(row.rankings),
  }))
}

export function countBallots(voteId: string): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM ballots WHERE vote_id = ?')
  const row = stmt.get(voteId) as { count: number }
  return row.count
}

// Admin operations
export function deleteVote(id: string): void {
  // Delete all ballots first (foreign key constraint)
  const deleteBallots = db.prepare('DELETE FROM ballots WHERE vote_id = ?')
  deleteBallots.run(id)

  // Delete the vote
  const deleteVote = db.prepare('DELETE FROM votes WHERE id = ?')
  deleteVote.run(id)
}

export function deleteBallot(id: number): void {
  const stmt = db.prepare('DELETE FROM ballots WHERE id = ?')
  stmt.run(id)
}

export function closeVote(id: string): void {
  const stmt = db.prepare("UPDATE votes SET closed_at = datetime('now') WHERE id = ?")
  stmt.run(id)
}

export function reopenVote(id: string): void {
  const stmt = db.prepare('UPDATE votes SET closed_at = NULL WHERE id = ?')
  stmt.run(id)
}

export function updateVoteOptions(id: string, options: string[]): void {
  // Update the vote options
  const updateStmt = db.prepare('UPDATE votes SET options = ? WHERE id = ?')
  updateStmt.run(JSON.stringify(options), id)

  // Clean up existing ballots by removing rankings for deleted options
  const ballots = getBallotsByVoteId(id)
  const optionsSet = new Set(options)

  for (const ballot of ballots) {
    // Filter rankings to only include options that still exist
    const filteredRankings = ballot.rankings.filter((option) => optionsSet.has(option))

    // Update the ballot if rankings changed
    if (filteredRankings.length !== ballot.rankings.length) {
      const updateBallot = db.prepare('UPDATE ballots SET rankings = ? WHERE id = ?')
      updateBallot.run(JSON.stringify(filteredRankings), ballot.id)
    }
  }
}

export function appendVoteOptions(id: string, newOptions: string[]): void {
  const vote = getVote(id)
  if (!vote) return

  // Get existing options and add new ones (avoid duplicates)
  const existingOptions = new Set(vote.options.map((o) => o.toLowerCase()))
  const uniqueNewOptions = newOptions.filter((o) => !existingOptions.has(o.toLowerCase()))

  if (uniqueNewOptions.length === 0) return

  const updatedOptions = [...vote.options, ...uniqueNewOptions]
  const updateStmt = db.prepare('UPDATE votes SET options = ? WHERE id = ?')
  updateStmt.run(JSON.stringify(updatedOptions), id)
}

export function setAutoCloseAt(id: string, autoCloseAt: string | null): void {
  const stmt = db.prepare('UPDATE votes SET auto_close_at = ? WHERE id = ?')
  stmt.run(autoCloseAt, id)
}

// API Key operations
export function createApiKey(keyHash: string, name: string | null = null): ApiKey {
  const stmt = db.prepare(`
    INSERT INTO api_keys (key_hash, name)
    VALUES (?, ?)
  `)
  const result = stmt.run(keyHash, name)
  return getApiKeyById(result.lastInsertRowid as number)!
}

export function getApiKeyById(id: number): ApiKey | null {
  const stmt = db.prepare('SELECT * FROM api_keys WHERE id = ?')
  return stmt.get(id) as ApiKey | null
}

export function getApiKeyByHash(keyHash: string): ApiKey | null {
  const stmt = db.prepare('SELECT * FROM api_keys WHERE key_hash = ?')
  return stmt.get(keyHash) as ApiKey | null
}

export function getAllApiKeys(): ApiKey[] {
  const stmt = db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC')
  return stmt.all() as ApiKey[]
}

export function updateApiKeyLastUsed(id: number): void {
  const stmt = db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?")
  stmt.run(id)
}

export function deleteApiKey(id: number): void {
  const stmt = db.prepare('DELETE FROM api_keys WHERE id = ?')
  stmt.run(id)
}

// Integration operations
export function createIntegration(
  type: 'discord' | 'slack' | 'webhook',
  name: string,
  config: IntegrationConfig
): Integration {
  const stmt = db.prepare(`
    INSERT INTO integrations (name, type, config)
    VALUES (?, ?, ?)
  `)
  const result = stmt.run(name, type, JSON.stringify(config))
  return getIntegrationById(result.lastInsertRowid as number)!
}

export function getIntegrationById(id: number): Integration | null {
  const stmt = db.prepare('SELECT * FROM integrations WHERE id = ?')
  const row = stmt.get(id) as any
  if (!row) return null
  return {
    ...row,
    config: JSON.parse(row.config),
  }
}

export function getAllIntegrations(): Integration[] {
  const stmt = db.prepare('SELECT * FROM integrations ORDER BY created_at DESC')
  const rows = stmt.all() as any[]
  return rows.map((row) => ({
    ...row,
    config: JSON.parse(row.config),
  }))
}

export function updateIntegration(
  id: number,
  name: string,
  config: IntegrationConfig
): Integration | null {
  const integration = getIntegrationById(id)
  if (!integration) return null

  const stmt = db.prepare('UPDATE integrations SET name = ?, config = ? WHERE id = ?')
  stmt.run(name, JSON.stringify(config), id)
  return getIntegrationById(id)
}

export function deleteIntegration(id: number): void {
  const stmt = db.prepare('DELETE FROM integrations WHERE id = ?')
  stmt.run(id)
}

// Recurring vote operations
export function getRecurringVotesNeedingNewInstance(): Vote[] {
  // Find recurring votes where:
  // 1. recurrence_active is true
  // 2. The latest vote in the group is closed
  // 3. Enough time has passed since the last vote started (period_days)
  const stmt = db.prepare(`
    SELECT v.* FROM votes v
    WHERE v.recurrence_active = 1
    AND v.closed_at IS NOT NULL
    AND v.recurrence_group_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM votes v2
      WHERE v2.recurrence_group_id = v.recurrence_group_id
      AND v2.closed_at IS NULL
    )
    AND v.created_at = (
      SELECT MAX(v3.created_at) FROM votes v3
      WHERE v3.recurrence_group_id = v.recurrence_group_id
    )
    AND datetime(COALESCE(v.recurrence_start_at, v.created_at), '+' || v.period_days || ' days') <= datetime('now')
  `)
  const rows = stmt.all() as any[]
  return rows.map((row) => ({
    ...row,
    options: JSON.parse(row.options),
    voter_names_required: Boolean(row.voter_names_required),
    recurrence_active: Boolean(row.recurrence_active),
  }))
}

export function getLatestVoteInRecurrenceGroup(recurrenceGroupId: string): Vote | null {
  const stmt = db.prepare(`
    SELECT * FROM votes
    WHERE recurrence_group_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `)
  const row = stmt.get(recurrenceGroupId) as any
  if (!row) return null
  return {
    ...row,
    options: JSON.parse(row.options),
    voter_names_required: Boolean(row.voter_names_required),
    recurrence_active: Boolean(row.recurrence_active),
  }
}

export function createNextRecurringVote(
  baseVote: Vote,
  newId: string,
  autoCloseAt: string,
  recurrenceStartAt: string
): Vote {
  const stmt = db.prepare(`
    INSERT INTO votes (
      id, title, options, write_secret_hash, voter_names_required,
      auto_close_at, open_notified_at, closed_notified_at, voting_secret_hash, voting_secret_plaintext, period_days, vote_duration_hours,
      recurrence_start_at, recurrence_group_id, integration_id, recurrence_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    newId,
    baseVote.title,
    JSON.stringify(baseVote.options),
    baseVote.write_secret_hash,
    baseVote.voter_names_required ? 1 : 0,
    autoCloseAt,
    null,
    null,
    baseVote.voting_secret_hash,
    baseVote.voting_secret_plaintext,
    baseVote.period_days,
    baseVote.vote_duration_hours,
    recurrenceStartAt,
    baseVote.recurrence_group_id,
    baseVote.integration_id,
    1 // Keep recurrence active
  )
  return getVote(newId)!
}

export function setVoteRecurrence(
  id: string,
  periodDays: number | null,
  voteDurationHours: number | null,
  recurrenceGroupId: string | null,
  integrationId: number | null,
  recurrenceActive: boolean
): void {
  const stmt = db.prepare(`
    UPDATE votes SET
      period_days = ?,
      vote_duration_hours = ?,
      recurrence_group_id = ?,
      integration_id = ?,
      recurrence_active = ?
    WHERE id = ?
  `)
  stmt.run(
    periodDays,
    voteDurationHours,
    recurrenceGroupId,
    integrationId,
    recurrenceActive ? 1 : 0,
    id
  )
}

/**
 * Stop a recurring vote group - prevents new instances from being created
 * Updates the latest vote in the group to set recurrence_active = false
 */
export function stopRecurringVoteGroup(recurrenceGroupId: string): void {
  const stmt = db.prepare(`
    UPDATE votes SET recurrence_active = 0
    WHERE recurrence_group_id = ?
  `)
  stmt.run(recurrenceGroupId)
}

/**
 * Count the number of active recurring vote groups
 * Used for enforcing system limits on recurring votes
 */
export function countActiveRecurringVoteGroups(): number {
  const stmt = db.prepare(`
    SELECT COUNT(DISTINCT recurrence_group_id) as count
    FROM votes
    WHERE recurrence_active = 1
    AND recurrence_group_id IS NOT NULL
  `)
  const row = stmt.get() as { count: number }
  return row.count
}

/**
 * Get all votes in a recurrence group (for migration/admin purposes)
 */
export function getVotesInRecurrenceGroup(recurrenceGroupId: string): Vote[] {
  const stmt = db.prepare(`
    SELECT * FROM votes
    WHERE recurrence_group_id = ?
    ORDER BY created_at DESC
  `)
  const rows = stmt.all(recurrenceGroupId) as any[]
  return rows.map((row) => ({
    ...row,
    options: JSON.parse(row.options),
    voter_names_required: Boolean(row.voter_names_required),
    recurrence_active: Boolean(row.recurrence_active),
  }))
}

/**
 * Find votes that should send an "open" notification
 */
export function getVotesNeedingOpenNotification(): Vote[] {
  const stmt = db.prepare(`
    SELECT * FROM votes
    WHERE recurrence_start_at IS NOT NULL
      AND closed_at IS NULL
      AND open_notified_at IS NULL
      AND datetime(recurrence_start_at) <= datetime('now')
  `)
  const rows = stmt.all() as any[]
  return rows.map((row) => ({
    ...row,
    options: JSON.parse(row.options),
    voter_names_required: Boolean(row.voter_names_required),
    recurrence_active: Boolean(row.recurrence_active),
  }))
}

/**
 * Mark a vote as having sent the "open" notification
 */
export function setVoteOpenNotifiedAt(id: string, timestamp: string): void {
  const stmt = db.prepare('UPDATE votes SET open_notified_at = ? WHERE id = ?')
  stmt.run(timestamp, id)
}

/**
 * Mark a vote as having sent the "closed" notification
 */
export function setVoteClosedNotifiedAt(id: string, timestamp: string): void {
  const stmt = db.prepare('UPDATE votes SET closed_notified_at = ? WHERE id = ?')
  stmt.run(timestamp, id)
}

/**
 * Find votes that should send a "closed" notification.
 * Includes both manually closed votes and auto-close votes that have reached their deadline.
 */
export function getVotesNeedingClosedNotification(): Vote[] {
  const stmt = db.prepare(`
    SELECT * FROM votes
    WHERE integration_id IS NOT NULL
      AND closed_notified_at IS NULL
      AND (
        closed_at IS NOT NULL
        OR (closed_at IS NULL AND auto_close_at IS NOT NULL AND datetime(auto_close_at) <= datetime('now'))
      )
  `)
  const rows = stmt.all() as any[]
  return rows.map((row) => ({
    ...row,
    options: JSON.parse(row.options),
    voter_names_required: Boolean(row.voter_names_required),
    recurrence_active: Boolean(row.recurrence_active),
  }))
}

/**
 * Update recurring vote template settings for future instances
 * This updates the latest vote in the group which will be used as template
 */
export function updateRecurringVoteTemplate(
  recurrenceGroupId: string,
  updates: {
    title?: string
    options?: string[]
    periodDays?: number
    voteDurationHours?: number
    integrationId?: number | null
  }
): Vote | null {
  const latest = getLatestVoteInRecurrenceGroup(recurrenceGroupId)
  if (!latest) return null

  const setClauses: string[] = []
  const values: any[] = []

  if (updates.title !== undefined) {
    setClauses.push('title = ?')
    values.push(updates.title)
  }
  if (updates.options !== undefined) {
    setClauses.push('options = ?')
    values.push(JSON.stringify(updates.options))
  }
  if (updates.periodDays !== undefined) {
    setClauses.push('period_days = ?')
    values.push(updates.periodDays)
  }
  if (updates.voteDurationHours !== undefined) {
    setClauses.push('vote_duration_hours = ?')
    values.push(updates.voteDurationHours)
  }
  if (updates.integrationId !== undefined) {
    setClauses.push('integration_id = ?')
    values.push(updates.integrationId)
  }

  if (setClauses.length === 0) return latest

  values.push(latest.id)
  const stmt = db.prepare(`UPDATE votes SET ${setClauses.join(', ')} WHERE id = ?`)
  stmt.run(...values)

  return getVote(latest.id)
}
