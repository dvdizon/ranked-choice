/**
 * Vote lifecycle helpers for handling vote events with notifications
 */

import {
  getVote,
  getBallotsByVoteId,
  getIntegrationById,
  Vote,
} from './db'
import { countIRV } from './irv'
import { notifyVoteClosed } from './notifications'
import { getBaseUrl, withBasePath } from './paths'

/**
 * Send a vote closed notification if the vote has an integration configured
 * Fire-and-forget: logs errors but doesn't throw
 */
export async function sendVoteClosedNotification(vote: Vote): Promise<void> {
  // Only send notification if vote has an integration
  if (!vote.integration_id) {
    return
  }

  const integration = getIntegrationById(vote.integration_id)
  if (!integration) {
    return
  }

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

    console.log(`[VoteLifecycle] Sent vote closed notification for: ${vote.id}`)
  } catch (error) {
    console.error(`[VoteLifecycle] Failed to send vote closed notification for ${vote.id}:`, error)
  }
}

/**
 * Check if a vote should auto-close and close it with notification
 * Returns true if the vote was closed
 */
export async function checkAndCloseVote(vote: Vote): Promise<boolean> {
  if (!vote.auto_close_at || vote.closed_at) {
    return false
  }

  const now = new Date()
  const autoCloseDate = new Date(vote.auto_close_at)

  if (now >= autoCloseDate) {
    // Send notification before marking as closed
    // The vote will be marked as closed by the caller
    await sendVoteClosedNotification(vote)
    return true
  }

  return false
}
