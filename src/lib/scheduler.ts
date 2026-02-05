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
  Vote,
} from './db'
import { notifyVoteOpened, notifyVoteClosed } from './notifications'
import { countIRV } from './irv'
import { withBasePath } from './paths'

// Protection limits (configurable via environment variables)
const MAX_RECURRING_VOTES_PER_TICK = parseInt(process.env.MAX_RECURRING_VOTES_PER_TICK || '10', 10)
const MAX_ACTIVE_RECURRING_GROUPS = parseInt(process.env.MAX_ACTIVE_RECURRING_GROUPS || '100', 10)

// Store the cron task so we can stop it if needed
let schedulerTask: ScheduledTask | null = null

/**
 * Get the base URL for constructing vote links
 */
function getBaseUrl(): string {
  return process.env.BASE_URL || 'http://localhost:3100'
}

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
function generateRecurringVoteId(recurrenceGroupId: string): string {
  const timestamp = Date.now().toString(36)
  return `${recurrenceGroupId}-${timestamp}`
}

/**
 * Send a vote closed notification
 */
async function sendVoteClosedNotification(vote: Vote): Promise<void> {
  if (!vote.integration_id) return

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
    await notifyVoteClosed(vote.integration_id, {
      title: vote.title,
      resultsUrl: `${baseUrl}${withBasePath(`/v/${vote.id}/results`)}`,
      winner,
      totalBallots: ballots.length,
    })

    console.log(`[Scheduler] Sent vote closed notification for: ${vote.id}`)
  } catch (error) {
    console.error(`[Scheduler] Failed to send vote closed notification for ${vote.id}:`, error)
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
 * Process a closed recurring vote - create next instance and send notifications
 */
async function processClosedRecurringVote(closedVote: Vote): Promise<void> {
  console.log(`[Scheduler] Processing closed recurring vote: ${closedVote.id}`)

  try {
    // Send vote closed notification for the closed vote
    if (closedVote.integration_id) {
      await sendVoteClosedNotification(closedVote)
    }

    // Create the next vote instance
    const newVoteId = generateRecurringVoteId(closedVote.recurrence_group_id!)
    const nextStartAt = calculateNextStartAt(closedVote)
    const autoCloseAt = calculateNextAutoCloseAt(nextStartAt, closedVote)

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

  await processOpenNotifications()
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
  const newVoteId = generateRecurringVoteId(recurrenceGroupId)
  const nextStartAt = calculateNextStartAt(latestVote)
  const autoCloseAt = calculateNextAutoCloseAt(nextStartAt, latestVote)

  const newVote = createNextRecurringVote(
    latestVote,
    newVoteId,
    autoCloseAt,
    nextStartAt.toISOString()
  )
  console.log(`[Scheduler] Manually triggered new vote: ${newVote.id}`)

  return newVote
}
