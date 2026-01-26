import { NextRequest, NextResponse } from 'next/server'
import { getVote, countBallots, deleteVote, closeVote, reopenVote, updateVoteOptions } from '@/lib/db'
import { canonicalizeVoteId, verifySecret } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ voteId: string }> }
) {
  try {
    const { voteId: rawId } = await params
    const voteId = canonicalizeVoteId(rawId)

    // Redirect if ID was not canonical
    if (rawId !== voteId) {
      return NextResponse.redirect(new URL(`/api/votes/${voteId}`, request.url))
    }

    const vote = getVote(voteId)

    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

    const ballotCount = countBallots(voteId)

    return NextResponse.json({
      id: vote.id,
      title: vote.title,
      options: vote.options,
      created_at: vote.created_at,
      closed_at: vote.closed_at,
      voter_names_required: vote.voter_names_required,
      ballotCount,
    })
  } catch (error) {
    console.error('Error fetching vote:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vote' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Delete the vote and all its ballots
    deleteVote(voteId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vote:', error)
    return NextResponse.json(
      { error: 'Failed to delete vote' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    // Verify write secret
    const body = await request.json()
    const { writeSecret, action, options } = body

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

    // Handle different actions
    if (action === 'close') {
      closeVote(voteId)
    } else if (action === 'reopen') {
      reopenVote(voteId)
    } else if (action === 'updateOptions') {
      if (!Array.isArray(options) || options.length < 2) {
        return NextResponse.json(
          { error: 'At least 2 options are required' },
          { status: 400 }
        )
      }
      updateVoteOptions(voteId, options)
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Return updated vote
    const updatedVote = getVote(voteId)
    const ballotCount = countBallots(voteId)

    return NextResponse.json({
      success: true,
      vote: {
        id: updatedVote!.id,
        title: updatedVote!.title,
        options: updatedVote!.options,
        created_at: updatedVote!.created_at,
        closed_at: updatedVote!.closed_at,
        voter_names_required: updatedVote!.voter_names_required,
        ballotCount,
      },
    })
  } catch (error) {
    console.error('Error updating vote:', error)
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    )
  }
}
