import { NextRequest, NextResponse } from 'next/server'
import { getVote, getBallot, deleteBallot } from '@/lib/db'
import { canonicalizeVoteId, verifySecret } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ voteId: string; ballotId: string }> }
) {
  try {
    const { voteId: rawId, ballotId: rawBallotId } = await params
    const voteId = canonicalizeVoteId(rawId)
    const ballotId = parseInt(rawBallotId, 10)

    if (isNaN(ballotId)) {
      return NextResponse.json(
        { error: 'Invalid ballot ID' },
        { status: 400 }
      )
    }

    const vote = getVote(voteId)

    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

    const ballot = getBallot(ballotId)

    if (!ballot) {
      return NextResponse.json(
        { error: 'Ballot not found' },
        { status: 404 }
      )
    }

    // Verify ballot belongs to this vote
    if (ballot.vote_id !== voteId) {
      return NextResponse.json(
        { error: 'Ballot does not belong to this vote' },
        { status: 400 }
      )
    }

    // Verify write secret
    const body = await request.json()
    const { writeSecret } = body

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
        { status: 401 }
      )
    }

    // Delete the ballot
    deleteBallot(ballotId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ballot:', error)
    return NextResponse.json(
      { error: 'Failed to delete ballot' },
      { status: 500 }
    )
  }
}
