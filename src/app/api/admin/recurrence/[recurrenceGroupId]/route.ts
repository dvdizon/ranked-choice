import { NextRequest, NextResponse } from 'next/server'
import { stopRecurringVoteGroup } from '@/lib/db'

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
  { params }: { params: Promise<{ recurrenceGroupId: string }> }
) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action !== 'stop') {
      return NextResponse.json(
        { error: 'Unsupported action' },
        { status: 400 }
      )
    }

    const { recurrenceGroupId } = await params
    stopRecurringVoteGroup(recurrenceGroupId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating recurrence group:', error)
    return NextResponse.json(
      { error: 'Failed to update recurrence group' },
      { status: 500 }
    )
  }
}
