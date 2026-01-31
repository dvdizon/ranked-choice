/**
 * Notifications abstraction layer for messaging platform integrations
 * Supports Discord, Slack, and generic webhooks
 */

import {
  getIntegrationById,
  Integration,
  DiscordIntegrationConfig,
  SlackIntegrationConfig,
  WebhookIntegrationConfig,
} from './db'
import {
  sendVoteCreatedNotification as sendDiscordVoteCreated,
  sendVoteClosedNotification as sendDiscordVoteClosed,
} from './discord'

export interface VoteCreatedEvent {
  title: string
  voteUrl: string
  resultsUrl: string
  autoCloseAt?: string | null
  surveyName?: string
}

export interface VoteClosedEvent {
  title: string
  resultsUrl: string
  winner?: string | null
  totalBallots: number
  surveyName?: string
}

/**
 * Send a vote created notification via the specified integration
 * Fire-and-forget: logs errors but doesn't throw
 */
export async function notifyVoteCreated(
  integrationId: number,
  event: VoteCreatedEvent
): Promise<boolean> {
  const integration = getIntegrationById(integrationId)
  if (!integration) {
    console.error(`Integration not found: ${integrationId}`)
    return false
  }

  return sendNotification(integration, 'vote_created', event)
}

/**
 * Send a vote closed notification via the specified integration
 * Fire-and-forget: logs errors but doesn't throw
 */
export async function notifyVoteClosed(
  integrationId: number,
  event: VoteClosedEvent
): Promise<boolean> {
  const integration = getIntegrationById(integrationId)
  if (!integration) {
    console.error(`Integration not found: ${integrationId}`)
    return false
  }

  return sendNotification(integration, 'vote_closed', event)
}

/**
 * Route notification to the appropriate platform handler
 */
async function sendNotification(
  integration: Integration,
  eventType: 'vote_created' | 'vote_closed',
  event: VoteCreatedEvent | VoteClosedEvent
): Promise<boolean> {
  switch (integration.type) {
    case 'discord':
      return handleDiscordNotification(integration.config as DiscordIntegrationConfig, eventType, event)
    case 'slack':
      return handleSlackNotification(integration.config as SlackIntegrationConfig, eventType, event)
    case 'webhook':
      return handleGenericWebhook(integration.config as WebhookIntegrationConfig, eventType, event)
    default:
      console.error(`Unknown integration type: ${integration.type}`)
      return false
  }
}

/**
 * Handle Discord notifications
 */
async function handleDiscordNotification(
  config: DiscordIntegrationConfig,
  eventType: 'vote_created' | 'vote_closed',
  event: VoteCreatedEvent | VoteClosedEvent
): Promise<boolean> {
  if (eventType === 'vote_created') {
    const e = event as VoteCreatedEvent
    return sendDiscordVoteCreated(config.webhook_url, {
      title: e.title,
      voteUrl: e.voteUrl,
      resultsUrl: e.resultsUrl,
      autoCloseAt: e.autoCloseAt,
      surveyName: e.surveyName,
    })
  } else {
    const e = event as VoteClosedEvent
    return sendDiscordVoteClosed(config.webhook_url, {
      title: e.title,
      resultsUrl: e.resultsUrl,
      winner: e.winner,
      totalBallots: e.totalBallots,
      surveyName: e.surveyName,
    })
  }
}

/**
 * Handle Slack notifications (similar to Discord webhooks)
 */
async function handleSlackNotification(
  config: SlackIntegrationConfig,
  eventType: 'vote_created' | 'vote_closed',
  event: VoteCreatedEvent | VoteClosedEvent
): Promise<boolean> {
  try {
    let blocks: any[]

    if (eventType === 'vote_created') {
      const e = event as VoteCreatedEvent
      blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `New Vote: ${e.title}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: e.surveyName
              ? `A new voting session has started for *${e.surveyName}*`
              : 'A new voting session has started!',
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Cast Vote' },
              url: e.voteUrl,
              style: 'primary',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Results' },
              url: e.resultsUrl,
            },
          ],
        },
      ]

      if (e.autoCloseAt) {
        const closeDate = new Date(e.autoCloseAt)
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Voting closes <!date^${Math.floor(closeDate.getTime() / 1000)}^{date_short_pretty} at {time}|${closeDate.toISOString()}>`,
            },
          ],
        })
      }
    } else {
      const e = event as VoteClosedEvent
      blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Voting Closed: ${e.title}`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Winner:*\n${e.winner || 'Tie or no clear winner'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Total Votes:*\n${e.totalBallots}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Full Results' },
              url: e.resultsUrl,
              style: 'primary',
            },
          ],
        },
      ]
    }

    const response = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Slack webhook failed: ${response.status} - ${errorText}`)
      return false
    }

    return true
  } catch (error) {
    console.error('Slack webhook error:', error)
    return false
  }
}

/**
 * Handle generic webhook notifications
 */
async function handleGenericWebhook(
  config: WebhookIntegrationConfig,
  eventType: 'vote_created' | 'vote_closed',
  event: VoteCreatedEvent | VoteClosedEvent
): Promise<boolean> {
  try {
    const payload = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      data: event,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    }

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Generic webhook failed: ${response.status} - ${errorText}`)
      return false
    }

    return true
  } catch (error) {
    console.error('Generic webhook error:', error)
    return false
  }
}
