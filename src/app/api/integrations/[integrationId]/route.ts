import { NextRequest, NextResponse } from 'next/server'
import { getIntegrationById, deleteIntegration, updateIntegration, IntegrationConfig } from '@/lib/db'

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
 * GET /api/integrations/[integrationId] - Get integration details
 * Requires ADMIN_SECRET authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId } = await params
    const id = parseInt(integrationId, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 })
    }

    const integration = getIntegrationById(id)
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Redact sensitive config data
    const redactedConfig = redactConfig(integration.type, integration.config as any)

    return NextResponse.json({
      integration: {
        ...integration,
        config: redactedConfig,
      },
    })
  } catch (error) {
    console.error('Error getting integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/integrations/[integrationId] - Update integration
 * Requires ADMIN_SECRET authentication
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId } = await params
    const id = parseInt(integrationId, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 })
    }

    const integration = getIntegrationById(id)
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, config } = body

    if (!name && !config) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const newName = name || integration.name
    const newConfig = config || integration.config

    updateIntegration(id, newName, newConfig as IntegrationConfig)

    const updated = getIntegrationById(id)!
    return NextResponse.json({
      integration: {
        ...updated,
        config: redactConfig(updated.type, updated.config as any),
      },
    })
  } catch (error) {
    console.error('Error updating integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/integrations/[integrationId] - Delete an integration
 * Requires ADMIN_SECRET authentication
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { integrationId } = await params
    const id = parseInt(integrationId, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 })
    }

    const integration = getIntegrationById(id)
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    deleteIntegration(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Redact sensitive config data for API responses
 */
function redactConfig(type: string, config: any): Record<string, any> {
  switch (type) {
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
