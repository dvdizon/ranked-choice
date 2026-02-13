import { NextRequest, NextResponse } from 'next/server'
import { closeVote, deleteVote, getVote, reopenVote } from '@/lib/db'
import { triggerTieRunoffVote } from '@/lib/scheduler'

function verifyAdminAuth(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return false
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)
  return token === adminSecret
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ voteId: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { voteId } = await params
    const vote = getVote(voteId)
    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'close') {
      closeVote(voteId)
      return NextResponse.json({ success: true })
    }

    if (action === 'reopen') {
      reopenVote(voteId)
      return NextResponse.json({ success: true })
    }

    if (action === 'triggerTieBreaker') {
      try {
        const runoffVote = await triggerTieRunoffVote(voteId)
        return NextResponse.json({ success: true, runoffVoteId: runoffVote.id })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to trigger tie breaker'
        return NextResponse.json({ error: message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Unsupported action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating vote:', error)
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ voteId: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { voteId } = await params
    const vote = getVote(voteId)
    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

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
