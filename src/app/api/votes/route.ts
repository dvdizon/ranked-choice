import { NextRequest, NextResponse } from 'next/server'
import { createVote, getIntegrationById, voteExists } from '@/lib/db'
import {
  generateVoteId,
  generateWriteSecret,
  hashSecret,
  isValidVoteId,
  canonicalizeVoteId,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      options,
      voteId: requestedId,
      writeSecret: requestedSecret,
      votingSecret: requestedVotingSecret,
      voterNamesRequired,
      autoCloseAt,
      integrationId,
      integrationAdminSecret,
    } = body

    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Validate options
    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 options are required' },
        { status: 400 }
      )
    }

    const cleanOptions = options
      .map((o: any) => (typeof o === 'string' ? o.trim() : ''))
      .filter((o: string) => o.length > 0)

    if (cleanOptions.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 non-empty options are required' },
        { status: 400 }
      )
    }

    // Check for duplicate options
    const uniqueOptions = new Set(cleanOptions.map((o: string) => o.toLowerCase()))
    if (uniqueOptions.size !== cleanOptions.length) {
      return NextResponse.json(
        { error: 'Duplicate options are not allowed' },
        { status: 400 }
      )
    }

    // Generate or validate vote ID
    let voteId: string
    if (requestedId && typeof requestedId === 'string' && requestedId.trim().length > 0) {
      voteId = canonicalizeVoteId(requestedId.trim())
      if (!isValidVoteId(voteId)) {
        return NextResponse.json(
          { error: 'Vote ID must be 3-32 characters (lowercase letters, numbers, and dashes)' },
          { status: 400 }
        )
      }
      if (voteExists(voteId)) {
        return NextResponse.json(
          { error: 'Vote ID already exists' },
          { status: 409 }
        )
      }
    } else {
      // Generate unique ID
      voteId = generateVoteId()
      while (voteExists(voteId)) {
        voteId = generateVoteId()
      }
    }

    // Generate or use provided admin (write) secret
    const adminSecret = requestedSecret && typeof requestedSecret === 'string' && requestedSecret.trim().length > 0
      ? requestedSecret.trim()
      : generateWriteSecret()

    // Generate or use provided voting secret (separate from admin secret)
    const votingSecret = requestedVotingSecret && typeof requestedVotingSecret === 'string' && requestedVotingSecret.trim().length > 0
      ? requestedVotingSecret.trim()
      : generateWriteSecret()

    // Validate autoCloseAt if provided
    let validAutoCloseAt: string | null = null
    if (autoCloseAt && typeof autoCloseAt === 'string' && autoCloseAt.trim().length > 0) {
      const autoCloseDate = new Date(autoCloseAt)
      if (isNaN(autoCloseDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid auto-close date format' },
          { status: 400 }
        )
      }
      if (autoCloseDate <= new Date()) {
        return NextResponse.json(
          { error: 'Auto-close date must be in the future' },
          { status: 400 }
        )
      }
      validAutoCloseAt = autoCloseDate.toISOString()
    }

    let validIntegrationId: number | null = null
    if (integrationId !== undefined && integrationId !== null && String(integrationId).trim().length > 0) {
      const systemAdminSecret = process.env.ADMIN_SECRET
      if (!systemAdminSecret) {
        return NextResponse.json(
          { error: 'Admin secret is not configured for integrations' },
          { status: 400 }
        )
      }

      if (!integrationAdminSecret || typeof integrationAdminSecret !== 'string' || integrationAdminSecret.trim().length === 0) {
        return NextResponse.json(
          { error: 'Admin secret is required to attach integrations' },
          { status: 401 }
        )
      }

      if (integrationAdminSecret.trim() !== systemAdminSecret) {
        return NextResponse.json(
          { error: 'Invalid admin secret for integrations' },
          { status: 403 }
        )
      }

      const parsedIntegrationId = Number.parseInt(String(integrationId), 10)
      if (!Number.isInteger(parsedIntegrationId) || parsedIntegrationId <= 0) {
        return NextResponse.json(
          { error: 'Integration ID must be a positive integer' },
          { status: 400 }
        )
      }

      const integration = getIntegrationById(parsedIntegrationId)
      if (!integration) {
        return NextResponse.json(
          { error: 'Integration not found' },
          { status: 400 }
        )
      }
      validIntegrationId = parsedIntegrationId
    }

    // Hash the secrets for storage
    const adminSecretHash = await hashSecret(adminSecret)
    const votingSecretHash = await hashSecret(votingSecret)

    // Create the vote
    const vote = createVote(
      voteId,
      title.trim(),
      cleanOptions,
      adminSecretHash,
      voterNamesRequired !== false, // Default to true if not specified
      validAutoCloseAt,
      votingSecretHash,
      validIntegrationId
    )

    return NextResponse.json({
      success: true,
      vote: {
        id: vote.id,
        title: vote.title,
        options: vote.options,
        created_at: vote.created_at,
      },
      adminSecret,   // For managing the vote
      votingSecret,  // For submitting ballots
      writeSecret: adminSecret, // Legacy field for backwards compatibility
      voteUrl: `/v/${vote.id}`,
      resultsUrl: `/v/${vote.id}/results`,
    })
  } catch (error) {
    console.error('Error creating vote:', error)
    return NextResponse.json(
      { error: 'Failed to create vote' },
      { status: 500 }
    )
  }
}
