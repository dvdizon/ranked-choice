import { NextRequest, NextResponse } from 'next/server'
import { closeExpiredVotes, getAllRecurringVotesForAdmin } from '@/lib/db'

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

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    closeExpiredVotes()

    const votes = getAllRecurringVotesForAdmin()

    return NextResponse.json({
      success: true,
      votes,
    })
  } catch (error) {
    console.error('Error listing recurring votes:', error)
    return NextResponse.json(
      { error: 'Failed to list recurring votes' },
      { status: 500 }
    )
  }
}
