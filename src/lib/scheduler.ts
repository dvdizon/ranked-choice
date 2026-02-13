/**
 * Background job scheduler for periodic/recurring votes
 * Uses node-cron to check for votes that need new instances created
 *
 * Protection limits:
 * - MAX_RECURRING_VOTES_PER_TICK: Limits how many new vote instances can be created per minute
 * - MAX_ACTIVE_RECURRING_GROUPS: Limits total number of active recurring vote groups in the system
 *
 * These limits prevent:
 * - Server overload from too many simultaneous vote creations
 * - Database bloat from unbounded recurring vote creation
 * - Notification spam to messaging platforms
 */

import cron, { ScheduledTask } from 'node-cron'
import {
  getRecurringVotesNeedingNewInstance,
  createNextRecurringVote,
  getLatestVoteInRecurrenceGroup,
  getBallotsByVoteId,
  countActiveRecurringVoteGroups,
  getVotesNeedingOpenNotification,
  setVoteOpenNotifiedAt,
  setVoteClosedNotifiedAt,
  getVotesNeedingClosedNotification,
  closeVote,
  Vote,
  getVotesNeedingTieRunoff,
  setTieRunoffCreated,
  createVote,
  voteExists,
  getVote,
} from './db'
import { notifyVoteOpened, notifyVoteClosed, notifyRunoffRequired } from './notifications'
import { countIRV } from './irv'
import { getBaseUrl, withBasePath } from './paths'
import { buildContestIdFromFormat, createUniqueVoteId } from './contest-id'

// Protection limits (configurable via environment variables)
const MAX_RECURRING_VOTES_PER_TICK = parseInt(process.env.MAX_RECURRING_VOTES_PER_TICK || '10', 10)
const MAX_ACTIVE_RECURRING_GROUPS = parseInt(process.env.MAX_ACTIVE_RECURRING_GROUPS || '100', 10)

// Store the cron task so we can stop it if needed
let schedulerTask: ScheduledTask | null = null

/**
 * Calculate the auto-close time for the next vote instance
 */
function calculateNextAutoCloseAt(startAt: Date, closedVote: Vote): string {
  const durationHours = closedVote.vote_duration_hours || 24
  const autoClose = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000)
  return autoClose.toISOString()
}

/**
 * Determine the start time for the next vote instance
 */
function calculateNextStartAt(closedVote: Vote): Date {
  const baseStart = closedVote.recurrence_start_at
    ? new Date(closedVote.recurrence_start_at)
    : new Date(closedVote.created_at)
  const periodDays = closedVote.period_days || 7
  return new Date(baseStart.getTime() + periodDays * 24 * 60 * 60 * 1000)
}

/**
 * Generate a unique vote ID for a recurring vote instance
 */
function generateRecurringVoteId(vote: Vote, nextStartAt: Date, nextCloseAt: Date): string {
  if (!vote.recurrence_id_format) {
    const timestamp = Date.now().toString(36)
    return createUniqueVoteId(`${vote.recurrence_group_id}-${timestamp}`, voteExists)
  }

  const baseId = buildContestIdFromFormat({
    title: vote.title,
    closeAt: nextCloseAt,
    startAt: nextStartAt,
    format: vote.recurrence_id_format,
  })

  return createUniqueVoteId(baseId, voteExists)
}

/**
 * Send a vote closed notification
 */
async function sendVoteClosedNotification(vote: Vote): Promise<boolean> {
  if (!vote.integration_id) return false

  try {
    const ballots = getBallotsByVoteId(vote.id)

    let winner: string | null = null
    if (ballots.length > 0) {
      const result = countIRV(
        vote.options,
        ballots.map((b) => ({ rankings: b.rankings }))
      )
      winner = result.winner
    }

    const baseUrl = getBaseUrl()
    const sent = await notifyVoteClosed(vote.integration_id, {
      title: vote.title,
      resultsUrl: `${baseUrl}${withBasePath(`/v/${vote.id}/results`)}`,
      winner,
      totalBallots: ballots.length,
    })

    if (sent) {
      console.log(`[Scheduler] Sent vote closed notification for: ${vote.id}`)
    }

    return sent
  } catch (error) {
    console.error(`[Scheduler] Failed to send vote closed notification for ${vote.id}:`, error)
    return false
  }
}

/**
 * Send a vote opened notification
 */
async function sendVoteOpenedNotification(vote: Vote): Promise<boolean> {
  if (!vote.integration_id) return false

  try {
    const baseUrl = getBaseUrl()
    const votePath = `${baseUrl}${withBasePath(`/v/${vote.id}`)}`
    const voteUrl = vote.voting_secret_plaintext
      ? `${votePath}?secret=${encodeURIComponent(vote.voting_secret_plaintext)}`
      : votePath

    const sent = await notifyVoteOpened(vote.integration_id, {
      title: vote.title,
      voteUrl,
      resultsUrl: `${baseUrl}${withBasePath(`/v/${vote.id}/results`)}`,
      autoCloseAt: vote.auto_close_at,
    })

    if (sent) {
      console.log(`[Scheduler] Sent vote opened notification for: ${vote.id}`)
    }

    return sent
  } catch (error) {
    console.error(`[Scheduler] Failed to send vote opened notification for ${vote.id}:`, error)
    return false
  }
}

/**
 * Send vote closed notifications for votes that closed manually or hit auto-close
 */
async function processClosedNotifications(): Promise<void> {
  const votesToNotify = getVotesNeedingClosedNotification()

  for (const vote of votesToNotify) {
    if (vote.closed_at === null && vote.auto_close_at && new Date(vote.auto_close_at) <= new Date()) {
      closeVote(vote.id)
      vote.closed_at = new Date().toISOString()
    }

    const sent = await sendVoteClosedNotification(vote)
    if (sent) {
      setVoteClosedNotifiedAt(vote.id, new Date().toISOString())
    }
  }
}

/**
 * Send vote opened notifications for votes whose start time has arrived
 */
async function processOpenNotifications(): Promise<void> {
  const votesToNotify = getVotesNeedingOpenNotification()

  for (const vote of votesToNotify) {
    if (!vote.integration_id) {
      continue
    }

    const sent = await sendVoteOpenedNotification(vote)
    if (sent) {
      setVoteOpenNotifiedAt(vote.id, new Date().toISOString())
    }
  }
}



/**
 * Generate a unique vote ID for a tie runoff vote while respecting 32-char limit.
 */
function generateTieRunoffVoteId(sourceVoteId: string): string {
  const suffix = `r2-${Date.now().toString(36)}`
  const maxPrefixLength = Math.max(3, 32 - suffix.length - 1)
  const prefix = sourceVoteId.slice(0, maxPrefixLength).replace(/-+$/g, '') || 'runoff'
  let candidate = `${prefix}-${suffix}`

  while (voteExists(candidate)) {
    const nextSuffix = `r2-${Date.now().toString(36)}${Math.floor(Math.random() * 9)}`
    const nextPrefix = sourceVoteId.slice(0, Math.max(3, 32 - nextSuffix.length - 1)).replace(/-+$/g, '') || 'runoff'
    candidate = `${nextPrefix}-${nextSuffix}`
  }

  return candidate
}

/**
 * Preserve the original vote duration when opening a tie runoff vote.
 */
function calculateRunoffAutoCloseAt(vote: Vote): string | null {
  if (!vote.auto_close_at) return null

  const createdAt = new Date(vote.created_at)
  const closedAt = new Date(vote.auto_close_at)
  const durationMs = closedAt.getTime() - createdAt.getTime()

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return null
  }

  return new Date(Date.now() + durationMs).toISOString()
}

/**
 * Create and notify a second-round runoff when a pure tie is detected.
 */
async function processTieRunoffVotes(): Promise<void> {
  const closedVotes = getVotesNeedingTieRunoff()

  for (const vote of closedVotes) {
    if (!vote.integration_id) {
      continue
    }

    try {
      await triggerTieRunoffVote(vote.id, true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown tie runoff error'
      if (message === 'At least one ballot is required to trigger a tie breaker' || message === 'Current results are not a tie') {
        setTieRunoffCreated(vote.id, '', new Date().toISOString())
        continue
      }
      console.error(`[Scheduler] Error creating tie runoff for ${vote.id}:`, error)
    }
  }
}

export async function triggerTieRunoffVote(voteId: string, requireIntegration: boolean = false): Promise<Vote> {
  const vote = getVote(voteId)
  if (!vote) {
    throw new Error('Vote not found')
  }

  if (!vote.closed_at) {
    throw new Error('Vote must be closed before triggering a tie breaker')
  }

  if (vote.tie_runoff_vote_id) {
    throw new Error(`Tie breaker already created: ${vote.tie_runoff_vote_id}`)
  }

  if (requireIntegration && !vote.integration_id) {
    throw new Error('Integration is required to auto-create tie breaker votes')
  }

  const ballots = getBallotsByVoteId(vote.id)
  if (ballots.length === 0) {
    throw new Error('At least one ballot is required to trigger a tie breaker')
  }

  const result = countIRV(
    vote.options,
    ballots.map((ballot) => ({ rankings: ballot.rankings }))
  )

  if (!result.isTie || result.tiedOptions.length < 2) {
    throw new Error('Current results are not a tie')
  }

  const runoffVoteId = generateTieRunoffVoteId(vote.id)
  const runoffVote = createVote(
    runoffVoteId,
    `${vote.title} (Runoff)`,
    result.tiedOptions,
    vote.write_secret_hash,
    vote.voter_names_required,
    calculateRunoffAutoCloseAt(vote),
    vote.voting_secret_hash,
    {
      periodDays: null,
      voteDurationHours: null,
      recurrenceStartAt: null,
      recurrenceGroupId: null,
      integrationId: vote.integration_id,
      recurrenceActive: false,
      votingSecretPlaintext: vote.voting_secret_plaintext,
    }
  )

  if (vote.integration_id) {
    const baseUrl = getBaseUrl()
    const runoffPath = `${baseUrl}${withBasePath(`/v/${runoffVote.id}`)}`
    const runoffVoteUrl = runoffVote.voting_secret_plaintext
      ? `${runoffPath}?secret=${encodeURIComponent(runoffVote.voting_secret_plaintext)}`
      : runoffPath

    await notifyRunoffRequired(vote.integration_id, {
      title: vote.title,
      tiedOptions: result.tiedOptions,
      voteUrl: runoffVoteUrl,
      resultsUrl: `${baseUrl}${withBasePath(`/v/${runoffVote.id}/results`)}`,
      sourceResultsUrl: `${baseUrl}${withBasePath(`/v/${vote.id}/results`)}`,
      autoCloseAt: runoffVote.auto_close_at,
    })
  }

  setTieRunoffCreated(vote.id, runoffVote.id, new Date().toISOString())
  return runoffVote
}

/**
 * Process a closed recurring vote - create next instance and send notifications
 */
async function processClosedRecurringVote(closedVote: Vote): Promise<void> {
  console.log(`[Scheduler] Processing closed recurring vote: ${closedVote.id}`)

  try {
    const nextStartAt = calculateNextStartAt(closedVote)
    const autoCloseAt = calculateNextAutoCloseAt(nextStartAt, closedVote)
    const newVoteId = generateRecurringVoteId(closedVote, nextStartAt, new Date(autoCloseAt))

    const newVote = createNextRecurringVote(
      closedVote,
      newVoteId,
      autoCloseAt,
      nextStartAt.toISOString()
    )
    console.log(`[Scheduler] Created new recurring vote: ${newVote.id} (closes at ${autoCloseAt})`)
  } catch (error) {
    console.error(`[Scheduler] Error processing recurring vote ${closedVote.id}:`, error)
  }
}

/**
 * Main scheduler tick - runs every minute
 * Enforces protection limits to prevent server overload
 */
async function schedulerTick(): Promise<void> {
  await processClosedNotifications()
  await processOpenNotifications()
  await processTieRunoffVotes()

  // Check system-wide limit on active recurring groups
  const activeGroups = countActiveRecurringVoteGroups()
  if (activeGroups >= MAX_ACTIVE_RECURRING_GROUPS) {
    console.warn(
      `[Scheduler] System limit reached: ${activeGroups}/${MAX_ACTIVE_RECURRING_GROUPS} active recurring vote groups. ` +
        `New recurring votes will not spawn until some are stopped.`
    )
    // Still process existing ones, but log the warning
  }

  // Get all recurring votes that are closed and need a new instance
  const votesNeedingNewInstance = getRecurringVotesNeedingNewInstance()

  // Enforce per-tick limit to prevent server overload
  const votesToProcess = votesNeedingNewInstance.slice(0, MAX_RECURRING_VOTES_PER_TICK)

  if (votesNeedingNewInstance.length > MAX_RECURRING_VOTES_PER_TICK) {
    console.warn(
      `[Scheduler] Processing ${votesToProcess.length} of ${votesNeedingNewInstance.length} votes this tick ` +
        `(limited by MAX_RECURRING_VOTES_PER_TICK=${MAX_RECURRING_VOTES_PER_TICK}). Remaining will be processed in subsequent ticks.`
    )
  }

  for (const vote of votesToProcess) {
    await processClosedRecurringVote(vote)
  }
}

/**
 * Start the scheduler
 * Runs every minute to check for recurring votes that need new instances
 */
export function startScheduler(): void {
  if (schedulerTask) {
    console.log('[Scheduler] Already running')
    return
  }

  console.log('[Scheduler] Starting recurring vote scheduler')

  // Run every minute
  schedulerTask = cron.schedule('* * * * *', async () => {
    try {
      await schedulerTick()
    } catch (error) {
      console.error('[Scheduler] Error in scheduler tick:', error)
    }
  })

  // Run immediately on startup to catch any missed votes
  schedulerTick().catch((error) => {
    console.error('[Scheduler] Error in initial tick:', error)
  })
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop()
    schedulerTask = null
    console.log('[Scheduler] Stopped')
  }
}

/**
 * Check if the scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return schedulerTask !== null
}

/**
 * Check if a new recurring vote group can be created
 * Returns true if under the system limit, false otherwise
 */
export function canCreateRecurringVote(): boolean {
  const activeGroups = countActiveRecurringVoteGroups()
  return activeGroups < MAX_ACTIVE_RECURRING_GROUPS
}

/**
 * Get the current recurring vote limits and usage
 */
export function getRecurringVoteLimits(): {
  activeGroups: number
  maxActiveGroups: number
  maxPerTick: number
  canCreateNew: boolean
} {
  const activeGroups = countActiveRecurringVoteGroups()
  return {
    activeGroups,
    maxActiveGroups: MAX_ACTIVE_RECURRING_GROUPS,
    maxPerTick: MAX_RECURRING_VOTES_PER_TICK,
    canCreateNew: activeGroups < MAX_ACTIVE_RECURRING_GROUPS,
  }
}

/**
 * Manually trigger creation of next vote instance for a recurring vote
 * Useful for testing or admin override
 */
export async function triggerNextVoteInstance(recurrenceGroupId: string): Promise<Vote | null> {
  const latestVote = getLatestVoteInRecurrenceGroup(recurrenceGroupId)

  if (!latestVote) {
    throw new Error(`No votes found for recurrence group: ${recurrenceGroupId}`)
  }

  if (!latestVote.recurrence_active) {
    throw new Error(`Recurrence is not active for group: ${recurrenceGroupId}`)
  }

  // Create the next instance regardless of whether current is closed
  const nextStartAt = calculateNextStartAt(latestVote)
  const autoCloseAt = calculateNextAutoCloseAt(nextStartAt, latestVote)
  const newVoteId = generateRecurringVoteId(latestVote, nextStartAt, new Date(autoCloseAt))

  const newVote = createNextRecurringVote(
    latestVote,
    newVoteId,
    autoCloseAt,
    nextStartAt.toISOString()
  )
  console.log(`[Scheduler] Manually triggered new vote: ${newVote.id}`)

  return newVote
}
