import { NextRequest, NextResponse } from 'next/server'
import { getVote, countBallots, deleteVote, closeVote, reopenVote, updateVoteOptions, setAutoCloseAt } from '@/lib/db'
import { canonicalizeVoteId, verifySecret } from '@/lib/auth'
import { withBasePath } from '@/lib/paths'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ voteId: string }> }
) {
  try {
    const { voteId: rawId } = await params
    const voteId = canonicalizeVoteId(rawId)

    // Redirect if ID was not canonical
    if (rawId !== voteId) {
      return NextResponse.redirect(new URL(withBasePath(`/api/votes/${voteId}`), request.url))
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
      auto_close_at: vote.auto_close_at,
      recurrence_start_at: vote.recurrence_start_at,
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
    const { writeSecret, action, options, autoCloseAt } = body

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
    } else if (action === 'setAutoClose') {
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
      setAutoCloseAt(voteId, validAutoCloseAt)
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
        auto_close_at: updatedVote!.auto_close_at,
        recurrence_start_at: updatedVote!.recurrence_start_at,
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
