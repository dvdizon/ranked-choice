import { NextRequest, NextResponse } from 'next/server'
import { createApiKey, getAllApiKeys, deleteApiKey } from '@/lib/db'
import { generateApiKey, hashApiKey } from '@/lib/auth'

// Admin authentication
function verifyAdminAuth(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return false // Admin endpoints disabled if no secret set
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)
  return token === adminSecret
}

// GET /api/admin/api-keys - List all API keys
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const apiKeys = getAllApiKeys()

    return NextResponse.json({
      success: true,
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        created_at: key.created_at,
        last_used_at: key.last_used_at,
      })),
    })
  } catch (error) {
    console.error('Error listing API keys:', error)
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 }
    )
  }
}

// POST /api/admin/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name } = body

    // Generate new API key
    const apiKey = generateApiKey()
    const keyHash = await hashApiKey(apiKey)

    // Store in database
    const createdKey = createApiKey(keyHash, name || null)

    return NextResponse.json({
      success: true,
      apiKey: {
        id: createdKey.id,
        key: apiKey, // Only shown once
        name: createdKey.name,
        created_at: createdKey.created_at,
      },
    })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/api-keys - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      )
    }

    deleteApiKey(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
