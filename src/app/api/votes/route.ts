import { NextRequest, NextResponse } from 'next/server'
import { createVote, voteExists } from '@/lib/db'
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
    const { title, options, voteId: requestedId, writeSecret: requestedSecret, voterNamesRequired } = body

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

    // Generate or use provided write secret
    const writeSecret = requestedSecret && typeof requestedSecret === 'string' && requestedSecret.trim().length > 0
      ? requestedSecret.trim()
      : generateWriteSecret()

    // Hash the secret for storage
    const writeSecretHash = await hashSecret(writeSecret)

    // Create the vote
    const vote = createVote(
      voteId,
      title.trim(),
      cleanOptions,
      writeSecretHash,
      voterNamesRequired !== false // Default to true if not specified
    )

    return NextResponse.json({
      success: true,
      vote: {
        id: vote.id,
        title: vote.title,
        options: vote.options,
        created_at: vote.created_at,
      },
      writeSecret, // Show once to creator
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
