import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATABASE_PATH = process.env.DATABASE_PATH || './data/rcv.sqlite'

// Ensure the directory exists
const dbDir = path.dirname(DATABASE_PATH)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(DATABASE_PATH)

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL')

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    options TEXT NOT NULL,
    write_secret_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT,
    auto_close_at TEXT
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

export default db

export interface Vote {
  id: string
  title: string
  options: string[]
  write_secret_hash: string
  created_at: string
  closed_at: string | null
  auto_close_at: string | null
  voter_names_required: boolean
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
  autoCloseAt: string | null = null
): Vote {
  const stmt = db.prepare(`
    INSERT INTO votes (id, title, options, write_secret_hash, voter_names_required, auto_close_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  stmt.run(id, title, JSON.stringify(options), writeSecretHash, voterNamesRequired ? 1 : 0, autoCloseAt)
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
