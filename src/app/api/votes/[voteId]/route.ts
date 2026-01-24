import { NextRequest, NextResponse } from 'next/server'
import { getVote, countBallots } from '@/lib/db'
import { canonicalizeVoteId } from '@/lib/auth'

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
