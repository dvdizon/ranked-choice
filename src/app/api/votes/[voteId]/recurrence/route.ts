import { NextRequest, NextResponse } from 'next/server'
import { countBallots, getVote, getVotesInRecurrenceGroup, stopRecurringVoteGroup } from '@/lib/db'
import { canonicalizeVoteId, verifySecret } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ voteId: string }> }
) {
  try {
    const { voteId: rawId } = await params
    const voteId = canonicalizeVoteId(rawId)

    const vote = getVote(voteId)
    if (!vote) {
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 })
    }

    const writeSecret = request.headers.get('X-Write-Secret')
    if (!writeSecret) {
      return NextResponse.json({ error: 'Write secret is required' }, { status: 401 })
    }

    const isValid = await verifySecret(writeSecret, vote.write_secret_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid write secret' }, { status: 403 })
    }

    if (!vote.recurrence_group_id) {
      return NextResponse.json({ success: true, recurrenceGroupId: null, recurrenceActive: false, votes: [] })
    }

    const recurringVotes = getVotesInRecurrenceGroup(vote.recurrence_group_id).map((recurringVote) => ({
      id: recurringVote.id,
      title: recurringVote.title,
      created_at: recurringVote.created_at,
      closed_at: recurringVote.closed_at,
      auto_close_at: recurringVote.auto_close_at,
      ballotCount: countBallots(recurringVote.id),
    }))

    return NextResponse.json({
      success: true,
      recurrenceGroupId: vote.recurrence_group_id,
      recurrenceActive: vote.recurrence_active,
      votes: recurringVotes,
    })
  } catch (error) {
    console.error('Error fetching recurrence group:', error)
    return NextResponse.json({ error: 'Failed to fetch recurrence group' }, { status: 500 })
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
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 })
    }

    const body = await request.json()
    const { writeSecret, action } = body

    if (!writeSecret || typeof writeSecret !== 'string') {
      return NextResponse.json({ error: 'Write secret is required' }, { status: 401 })
    }

    const isValid = await verifySecret(writeSecret, vote.write_secret_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid write secret' }, { status: 403 })
    }

    if (action !== 'stopRecurring') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!vote.recurrence_group_id) {
      return NextResponse.json({ error: 'Vote is not part of a recurring group' }, { status: 400 })
    }

    stopRecurringVoteGroup(vote.recurrence_group_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating recurrence group:', error)
    return NextResponse.json({ error: 'Failed to update recurrence group' }, { status: 500 })
  }
}
