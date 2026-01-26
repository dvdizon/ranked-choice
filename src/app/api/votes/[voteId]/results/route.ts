import { NextRequest, NextResponse } from 'next/server'
import { getVote, getBallotsByVoteId } from '@/lib/db'
import { countIRV } from '@/lib/irv'
import { canonicalizeVoteId } from '@/lib/auth'
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
      return NextResponse.redirect(new URL(withBasePath(`/api/votes/${voteId}/results`), request.url))
    }

    const vote = getVote(voteId)

    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

    const ballots = getBallotsByVoteId(voteId)
    const irvBallots = ballots.map((b) => ({ rankings: b.rankings }))

    const results = countIRV(vote.options, irvBallots)

    return NextResponse.json({
      vote: {
        id: vote.id,
        title: vote.title,
        options: vote.options,
        created_at: vote.created_at,
      },
      results: {
        winner: results.winner,
        isTie: results.isTie,
        tiedOptions: results.tiedOptions,
        totalBallots: results.totalBallots,
        rounds: results.rounds,
      },
      ballots: ballots.map((b) => ({
        voter_name: b.voter_name,
        rankings: b.rankings,
        created_at: b.created_at,
      })),
    })
  } catch (error) {
    console.error('Error fetching results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    )
  }
}
