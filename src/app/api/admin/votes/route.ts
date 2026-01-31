import { NextRequest, NextResponse } from 'next/server'
import { closeExpiredVotes, getLiveVotesPaginated } from '@/lib/db'

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

    const { searchParams } = new URL(request.url)
    const pageParam = searchParams.get('page') || '1'
    const pageSizeParam = searchParams.get('pageSize') || '10'

    const page = Math.max(1, Number.parseInt(pageParam, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(pageSizeParam, 10) || 10))
    const offset = (page - 1) * pageSize

    closeExpiredVotes()

    const { votes, total } = getLiveVotesPaginated(pageSize, offset)
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return NextResponse.json({
      success: true,
      page,
      pageSize,
      total,
      totalPages,
      votes,
    })
  } catch (error) {
    console.error('Error listing live votes:', error)
    return NextResponse.json(
      { error: 'Failed to list live votes' },
      { status: 500 }
    )
  }
}
