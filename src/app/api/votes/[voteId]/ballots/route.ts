import { NextRequest, NextResponse } from 'next/server'
import { getVote, createBallot, countBallots } from '@/lib/db'
import { verifySecret, canonicalizeVoteId } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ voteId: string }> }
) {
  try {
    const { voteId: rawId } = await params
    const voteId = canonicalizeVoteId(rawId)

    const vote = getVote(voteId)

    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { rankings, writeSecret } = body

    // Verify write secret
    if (!writeSecret || typeof writeSecret !== 'string') {
      return NextResponse.json(
        { error: 'Write secret is required' },
        { status: 401 }
      )
    }

    const isValid = await verifySecret(writeSecret, vote.write_secret_hash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid write secret' },
        { status: 403 }
      )
    }

    // Validate rankings
    if (!Array.isArray(rankings) || rankings.length === 0) {
      return NextResponse.json(
        { error: 'Rankings are required' },
        { status: 400 }
      )
    }

    // Validate that all rankings are valid options
    const validOptions = new Set(vote.options)
    const seenRankings = new Set<string>()

    for (const rank of rankings) {
      if (typeof rank !== 'string') {
        return NextResponse.json(
          { error: 'Invalid ranking format' },
          { status: 400 }
        )
      }
      if (!validOptions.has(rank)) {
        return NextResponse.json(
          { error: `Invalid option: ${rank}` },
          { status: 400 }
        )
      }
      if (seenRankings.has(rank)) {
        return NextResponse.json(
          { error: `Duplicate ranking: ${rank}` },
          { status: 400 }
        )
      }
      seenRankings.add(rank)
    }

    // Create ballot
    const ballot = createBallot(voteId, rankings)
    const totalBallots = countBallots(voteId)

    return NextResponse.json({
      success: true,
      ballot: {
        id: ballot.id,
        rankings: ballot.rankings,
        created_at: ballot.created_at,
      },
      totalBallots,
    })
  } catch (error) {
    console.error('Error submitting ballot:', error)
    return NextResponse.json(
      { error: 'Failed to submit ballot' },
      { status: 500 }
    )
  }
}
