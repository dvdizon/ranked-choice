/**
 * Discord webhook integration for sending notifications
 */

export interface DiscordEmbed {
  title?: string
  description?: string
  url?: string
  color?: number
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  footer?: {
    text: string
  }
  timestamp?: string
}

export interface DiscordWebhookPayload {
  content?: string
  embeds?: DiscordEmbed[]
  username?: string
  avatar_url?: string
}

const DISCORD_COLORS = {
  primary: 0x5865f2, // Discord blurple
  success: 0x57f287, // Green
  warning: 0xfee75c, // Yellow
  error: 0xed4245, // Red
  info: 0x5865f2, // Blurple
}

/**
 * Send a message to a Discord webhook
 * Fire-and-forget: logs errors but doesn't throw
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Discord webhook failed: ${response.status} - ${errorText}`)
      return false
    }

    return true
  } catch (error) {
    console.error('Discord webhook error:', error)
    return false
  }
}

/**
 * Send a vote created notification to Discord
 */
export async function sendVoteCreatedNotification(
  webhookUrl: string,
  options: {
    title: string
    voteUrl: string
    resultsUrl: string
    autoCloseAt?: string | null
    surveyName?: string
  }
): Promise<boolean> {
  const fields: DiscordEmbed['fields'] = [
    {
      name: 'Vote',
      value: `[Cast your vote](${options.voteUrl})`,
      inline: true,
    },
    {
      name: 'Results',
      value: `[View results](${options.resultsUrl})`,
      inline: true,
    },
  ]

  if (options.autoCloseAt) {
    const closeDate = new Date(options.autoCloseAt)
    fields.push({
      name: 'Voting Closes',
      value: `<t:${Math.floor(closeDate.getTime() / 1000)}:R>`,
      inline: false,
    })
  }

  const embed: DiscordEmbed = {
    title: `New Vote: ${options.title}`,
    description: options.surveyName
      ? `A new voting session has started for **${options.surveyName}**`
      : 'A new voting session has started!',
    color: DISCORD_COLORS.primary,
    fields,
    timestamp: new Date().toISOString(),
  }

  return sendDiscordWebhook(webhookUrl, {
    embeds: [embed],
  })
}

/**
 * Send a vote opened notification to Discord
 */
export async function sendVoteOpenNotification(
  webhookUrl: string,
  options: {
    title: string
    voteUrl: string
    resultsUrl: string
    autoCloseAt?: string | null
    surveyName?: string
  }
): Promise<boolean> {
  const fields: DiscordEmbed['fields'] = [
    {
      name: 'Vote',
      value: `[Cast your vote](${options.voteUrl})`,
      inline: true,
    },
    {
      name: 'Results',
      value: `[View results](${options.resultsUrl})`,
      inline: true,
    },
  ]

  if (options.autoCloseAt) {
    const closeDate = new Date(options.autoCloseAt)
    fields.push({
      name: 'Voting Closes',
      value: `<t:${Math.floor(closeDate.getTime() / 1000)}:R>`,
      inline: false,
    })
  }

  const embed: DiscordEmbed = {
    title: `Voting Open: ${options.title}`,
    description: options.surveyName
      ? `Voting is now open for **${options.surveyName}**`
      : 'Voting is now open!',
    color: DISCORD_COLORS.info,
    fields,
    timestamp: new Date().toISOString(),
  }

  return sendDiscordWebhook(webhookUrl, {
    embeds: [embed],
  })
}

/**
 * Send a vote closed notification to Discord
 */
export async function sendVoteClosedNotification(
  webhookUrl: string,
  options: {
    title: string
    resultsUrl: string
    winner?: string | null
    totalBallots: number
    surveyName?: string
  }
): Promise<boolean> {
  const fields: DiscordEmbed['fields'] = []

  if (options.winner) {
    fields.push({
      name: 'Winner',
      value: options.winner,
      inline: true,
    })
  } else {
    fields.push({
      name: 'Result',
      value: 'Tie or no clear winner',
      inline: true,
    })
  }

  fields.push({
    name: 'Total Votes',
    value: options.totalBallots.toString(),
    inline: true,
  })

  fields.push({
    name: 'Full Results',
    value: `[View detailed results](${options.resultsUrl})`,
    inline: false,
  })

  const embed: DiscordEmbed = {
    title: `Voting Closed: ${options.title}`,
    description: options.surveyName
      ? `Voting has ended for **${options.surveyName}**`
      : 'Voting has ended!',
    color: DISCORD_COLORS.success,
    fields,
    timestamp: new Date().toISOString(),
  }

  return sendDiscordWebhook(webhookUrl, {
    embeds: [embed],
  })
}

/**
 * Send a runoff-required notification to Discord
 */
export async function sendRunoffRequiredNotification(
  webhookUrl: string,
  options: {
    title: string
    tiedOptions: string[]
    voteUrl: string
    resultsUrl: string
    sourceResultsUrl: string
    autoCloseAt?: string | null
  }
): Promise<boolean> {
  const fields: DiscordEmbed['fields'] = [
    {
      name: 'Tied Options',
      value: options.tiedOptions.join(', '),
      inline: false,
    },
    {
      name: 'Runoff Vote',
      value: `[Cast runoff vote](${options.voteUrl})`,
      inline: true,
    },
    {
      name: 'Runoff Results',
      value: `[Track runoff results](${options.resultsUrl})`,
      inline: true,
    },
    {
      name: 'Previous Round',
      value: `[View tied round results](${options.sourceResultsUrl})`,
      inline: false,
    },
  ]

  if (options.autoCloseAt) {
    const closeDate = new Date(options.autoCloseAt)
    fields.push({
      name: 'Runoff Closes',
      value: `<t:${Math.floor(closeDate.getTime() / 1000)}:R>`,
      inline: false,
    })
  }

  const embed: DiscordEmbed = {
    title: `Runoff Required: ${options.title}`,
    description: 'The previous round ended in a pure tie. A second-round runoff vote is now open.',
    color: DISCORD_COLORS.warning,
    fields,
    timestamp: new Date().toISOString(),
  }

  return sendDiscordWebhook(webhookUrl, {
    embeds: [embed],
  })
}
