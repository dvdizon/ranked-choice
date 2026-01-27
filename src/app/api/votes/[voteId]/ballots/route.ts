import { NextRequest, NextResponse } from 'next/server'
import { getVote, createBallot, countBallots, getBallotsByVoteId, appendVoteOptions } from '@/lib/db'
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
    const { rankings, writeSecret, votingSecret, voterName, customOptions } = body

    // Accept either votingSecret (new) or writeSecret (legacy)
    const providedSecret = votingSecret || writeSecret
    if (!providedSecret || typeof providedSecret !== 'string') {
      return NextResponse.json(
        { error: 'Voting secret is required' },
        { status: 401 }
      )
    }

    // Validate voter name if required
    if (vote.voter_names_required) {
      if (!voterName || typeof voterName !== 'string' || voterName.trim().length === 0) {
        return NextResponse.json(
          { error: 'Voter name is required' },
          { status: 400 }
        )
      }
    }

    // Verify against voting_secret_hash if available, otherwise fall back to write_secret_hash
    const hashToVerify = vote.voting_secret_hash || vote.write_secret_hash
    const isValid = await verifySecret(providedSecret, hashToVerify)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid voting secret' },
        { status: 403 }
      )
    }

    // Check if voting is closed
    if (vote.closed_at) {
      return NextResponse.json(
        { error: 'Voting is closed for this poll' },
        { status: 403 }
      )
    }

    // Add custom options to the vote if provided
    if (customOptions && Array.isArray(customOptions) && customOptions.length > 0) {
      // Validate custom options
      for (const option of customOptions) {
        if (typeof option !== 'string' || option.trim().length === 0) {
          return NextResponse.json(
            { error: 'Invalid custom option format' },
            { status: 400 }
          )
        }
      }

      // Append custom options to vote
      appendVoteOptions(voteId, customOptions)

      // Reload vote to include new options
      const updatedVote = getVote(voteId)
      if (updatedVote) {
        vote.options = updatedVote.options
      }
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
    const ballot = createBallot(
      voteId,
      rankings,
      voterName && typeof voterName === 'string' ? voterName.trim() : ''
    )
    const totalBallots = countBallots(voteId)

    return NextResponse.json({
      success: true,
      ballot: {
        id: ballot.id,
        rankings: ballot.rankings,
        voter_name: ballot.voter_name,
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

export async function GET(
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

    // Verify write secret for admin access
    const writeSecret = request.headers.get('X-Write-Secret')

    if (!writeSecret) {
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

    // Get all ballots for this vote
    const ballots = getBallotsByVoteId(voteId)

    return NextResponse.json({
      success: true,
      ballots: ballots.map((ballot) => ({
        id: ballot.id,
        rankings: ballot.rankings,
        voter_name: ballot.voter_name,
        created_at: ballot.created_at,
      })),
    })
  } catch (error) {
    console.error('Error fetching ballots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ballots' },
      { status: 500 }
    )
  }
}
