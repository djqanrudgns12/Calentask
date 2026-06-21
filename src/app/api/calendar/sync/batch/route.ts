import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { syncBatchActivitiesToGoogle } from '@/lib/google-calendar'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const offset = parseInt(body.offset || '0', 10)
    const limit = parseInt(body.limit || '50', 10)

    // Fetch activities for the chunk
    const { data: activities, error, count } = await supabase
      .from('activities')
      .select('*, activity_category_map(categories(*))', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Batch sync fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    const total = count || 0
    let synced = 0
    let skipped = 0
    let failed = 0
    let failedItems: any[] = []

    if (activities && activities.length > 0) {
      const result = await syncBatchActivitiesToGoogle(user.id, activities)
      synced = result.synced
      skipped = result.skipped
      failed = result.failed
      failedItems = result.failedItems
    }

    const nextOffset = offset + limit
    const hasMore = nextOffset < total

    return NextResponse.json({
      synced,
      skipped,
      failed,
      failedItems,
      hasMore,
      nextOffset,
      total,
      chunkSize: activities?.length || 0,
      recentActivityTitle: activities?.[0]?.title || null
    })

  } catch (error: any) {
    console.error('Batch sync API error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
