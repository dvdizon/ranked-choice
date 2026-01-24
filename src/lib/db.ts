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
    closed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ballots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vote_id TEXT NOT NULL,
    rankings TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (vote_id) REFERENCES votes(id)
  );

  CREATE INDEX IF NOT EXISTS idx_ballots_vote_id ON ballots(vote_id);
`)

export default db

export interface Vote {
  id: string
  title: string
  options: string[]
  write_secret_hash: string
  created_at: string
  closed_at: string | null
}

export interface Ballot {
  id: number
  vote_id: string
  rankings: string[]
  created_at: string
}

// Vote operations
export function createVote(
  id: string,
  title: string,
  options: string[],
  writeSecretHash: string
): Vote {
  const stmt = db.prepare(`
    INSERT INTO votes (id, title, options, write_secret_hash)
    VALUES (?, ?, ?, ?)
  `)
  stmt.run(id, title, JSON.stringify(options), writeSecretHash)
  return getVote(id)!
}

export function getVote(id: string): Vote | null {
  const stmt = db.prepare('SELECT * FROM votes WHERE id = ?')
  const row = stmt.get(id) as any
  if (!row) return null
  return {
    ...row,
    options: JSON.parse(row.options),
  }
}

export function voteExists(id: string): boolean {
  const stmt = db.prepare('SELECT 1 FROM votes WHERE id = ?')
  return stmt.get(id) !== undefined
}

// Ballot operations
export function createBallot(voteId: string, rankings: string[]): Ballot {
  const stmt = db.prepare(`
    INSERT INTO ballots (vote_id, rankings)
    VALUES (?, ?)
  `)
  const result = stmt.run(voteId, JSON.stringify(rankings))
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
