import { NextRequest, NextResponse } from 'next/server'
import { createVote, getIntegrationById, voteExists } from '@/lib/db'
import {
  generateVoteId,
  generateWriteSecret,
  hashSecret,
  isValidVoteId,
  canonicalizeVoteId,
} from '@/lib/auth'
import { buildContestIdFromFormat, createUniqueVoteId, DEFAULT_RECURRING_ID_FORMAT } from '@/lib/contest-id'

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
      recurrenceEnabled,
      periodDays,
      voteDurationHours,
      integrationId,
      recurrenceStartAt,
      recurrenceIdFormat,
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

    const recurringRequested = recurrenceEnabled === true
    let validPeriodDays: number | null = null
    let validVoteDurationHours: number | null = null
    let recurrenceGroupId: string | null = null
    let recurrenceActive = false
    let validRecurrenceStartAt: string | null = null
    let validAutoCloseAt: string | null = null
    let validRecurrenceIdFormat: string | null = null

    if (recurringRequested) {
      if (!recurrenceStartAt || typeof recurrenceStartAt !== 'string' || recurrenceStartAt.trim().length === 0) {
        return NextResponse.json(
          { error: 'Start date/time is required for recurring votes' },
          { status: 400 }
        )
      }

      const startDate = new Date(recurrenceStartAt)
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start date/time format' },
          { status: 400 }
        )
      }

      const periodValue = Number(periodDays)
      if (!Number.isInteger(periodValue) || periodValue < 7) {
        return NextResponse.json(
          { error: 'Period must be an integer number of days (minimum 7)' },
          { status: 400 }
        )
      }

      const durationValue = Number(voteDurationHours)
      if (!Number.isInteger(durationValue) || durationValue < 1) {
        return NextResponse.json(
          { error: 'Vote duration must be an integer number of hours (minimum 1)' },
          { status: 400 }
        )
      }

      validPeriodDays = periodValue
      validVoteDurationHours = durationValue
      validRecurrenceStartAt = startDate.toISOString()
      recurrenceActive = true

      const autoCloseDate = new Date(startDate.getTime() + durationValue * 60 * 60 * 1000)
      if (autoCloseDate <= new Date()) {
        return NextResponse.json(
          { error: 'Recurring vote must close in the future' },
          { status: 400 }
        )
      }
      validAutoCloseAt = autoCloseDate.toISOString()

      if (recurrenceIdFormat !== undefined && recurrenceIdFormat !== null) {
        if (typeof recurrenceIdFormat !== 'string') {
          return NextResponse.json(
            { error: 'Recurring contest ID format must be a string' },
            { status: 400 }
          )
        }
        const trimmedFormat = recurrenceIdFormat.trim()
        if (trimmedFormat.length > 80) {
          return NextResponse.json(
            { error: 'Recurring contest ID format must be 80 characters or less' },
            { status: 400 }
          )
        }
        validRecurrenceIdFormat = trimmedFormat.length > 0 ? trimmedFormat : DEFAULT_RECURRING_ID_FORMAT
      } else {
        validRecurrenceIdFormat = DEFAULT_RECURRING_ID_FORMAT
      }
    } else if (periodDays !== undefined || voteDurationHours !== undefined) {
      return NextResponse.json(
        { error: 'Recurring settings require recurrenceEnabled=true' },
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
      if (recurringRequested && validAutoCloseAt) {
        const recurringBaseId = buildContestIdFromFormat({
          title: title.trim(),
          closeAt: new Date(validAutoCloseAt),
          startAt: validRecurrenceStartAt ? new Date(validRecurrenceStartAt) : undefined,
          format: validRecurrenceIdFormat,
        })
        voteId = createUniqueVoteId(recurringBaseId, voteExists)
      } else {
        // Generate unique ID
        voteId = generateVoteId()
        while (voteExists(voteId)) {
          voteId = generateVoteId()
        }
      }
    }

    recurrenceGroupId = recurringRequested ? voteId : null

    // Generate or use provided admin (write) secret
    const adminSecret = requestedSecret && typeof requestedSecret === 'string' && requestedSecret.trim().length > 0
      ? requestedSecret.trim()
      : generateWriteSecret()

    // Generate or use provided voting secret (separate from admin secret)
    const votingSecret = requestedVotingSecret && typeof requestedVotingSecret === 'string' && requestedVotingSecret.trim().length > 0
      ? requestedVotingSecret.trim()
      : generateWriteSecret()


    // Validate autoCloseAt if provided (non-recurring)
    if (!recurringRequested && autoCloseAt && typeof autoCloseAt === 'string' && autoCloseAt.trim().length > 0) {
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
      adminSecret,
      voterNamesRequired !== false, // Default to true if not specified
      validAutoCloseAt,
      votingSecretHash,
      {
        periodDays: validPeriodDays,
        voteDurationHours: validVoteDurationHours,
        recurrenceStartAt: validRecurrenceStartAt,
        recurrenceGroupId,
        recurrenceIdFormat: validRecurrenceIdFormat,
        integrationId: validIntegrationId,
        recurrenceActive,
        votingSecretPlaintext: validIntegrationId !== null ? votingSecret : null,
      }
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
