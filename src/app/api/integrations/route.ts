import { NextRequest, NextResponse } from 'next/server'
import {
  createIntegration,
  getAllIntegrations,
  Integration,
  IntegrationConfig,
  DiscordIntegrationConfig,
} from '@/lib/db'

/**
 * Verify admin authentication via ADMIN_SECRET
 */
function verifyAdminAuth(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return false

  const authHeader = request.headers.get('Authorization')
  return authHeader === `Bearer ${adminSecret}`
}

/**
 * GET /api/integrations - List all integrations
 * Requires ADMIN_SECRET authentication
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integrations = getAllIntegrations()

    // Redact sensitive config data (webhook URLs)
    const redactedIntegrations = integrations.map((integration) => ({
      ...integration,
      config: redactConfig(integration),
    }))

    return NextResponse.json({ integrations: redactedIntegrations })
  } catch (error) {
    console.error('Error listing integrations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/integrations - Create a new integration
 * Requires ADMIN_SECRET authentication
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, name, config } = body

    // Validate required fields
    if (!type || !name || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: type, name, config' },
        { status: 400 }
      )
    }

    // Validate integration type
    if (!['discord', 'slack', 'webhook'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid integration type. Must be: discord, slack, or webhook' },
        { status: 400 }
      )
    }

    // Validate config based on type
    const validationError = validateConfig(type, config)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Test the webhook if it's Discord
    if (type === 'discord') {
      const testResult = await testDiscordWebhook(config.webhook_url)
      if (!testResult.valid) {
        return NextResponse.json(
          { error: `Discord webhook test failed: ${testResult.error}` },
          { status: 400 }
        )
      }
    }

    const integration = createIntegration(type, name, config as IntegrationConfig)

    return NextResponse.json({
      integration: {
        ...integration,
        config: redactConfig(integration),
      },
    })
  } catch (error) {
    console.error('Error creating integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Validate config based on integration type
 */
function validateConfig(type: string, config: any): string | null {
  switch (type) {
    case 'discord':
      if (!config.webhook_url) {
        return 'Discord integration requires webhook_url in config'
      }
      if (!isValidDiscordWebhookUrl(config.webhook_url)) {
        return 'Invalid Discord webhook URL format'
      }
      break
    case 'slack':
      if (!config.webhook_url) {
        return 'Slack integration requires webhook_url in config'
      }
      if (!config.webhook_url.startsWith('https://hooks.slack.com/')) {
        return 'Invalid Slack webhook URL format'
      }
      break
    case 'webhook':
      if (!config.url) {
        return 'Webhook integration requires url in config'
      }
      try {
        new URL(config.url)
      } catch {
        return 'Invalid webhook URL format'
      }
      break
  }
  return null
}

/**
 * Check if a URL is a valid Discord webhook URL
 */
function isValidDiscordWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.hostname === 'discord.com' ||
      parsed.hostname === 'discordapp.com' ||
      parsed.hostname.endsWith('.discord.com')
    ) && parsed.pathname.includes('/api/webhooks/')
  } catch {
    return false
  }
}

/**
 * Test a Discord webhook by fetching its info
 */
async function testDiscordWebhook(
  webhookUrl: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, { method: 'GET' })
    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}` }
    }
    const data = await response.json()
    if (!data.id || !data.token) {
      return { valid: false, error: 'Invalid webhook response' }
    }
    return { valid: true }
  } catch (error) {
    return { valid: false, error: String(error) }
  }
}

/**
 * Redact sensitive config data for API responses
 */
function redactConfig(integration: Integration): Record<string, any> {
  const config = integration.config as any
  switch (integration.type) {
    case 'discord':
    case 'slack':
      return {
        ...config,
        webhook_url: redactUrl(config.webhook_url),
      }
    case 'webhook':
      return {
        ...config,
        url: redactUrl(config.url),
      }
    default:
      return config
  }
}

/**
 * Redact a URL to show only the beginning
 */
function redactUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}/...`
  } catch {
    return '***'
  }
}
