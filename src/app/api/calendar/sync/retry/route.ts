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
    const activityIds = body.activityIds

    if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
      return NextResponse.json({ error: 'No activity IDs provided' }, { status: 400 })
    }

    // Fetch the specific activities requested for retry
    const { data: activities, error } = await supabase
      .from('activities')
      .select('*, activity_category_map(categories(*))')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .in('id', activityIds)

    if (error) {
      console.error('Batch sync retry fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch activities for retry' }, { status: 500 })
    }

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

    return NextResponse.json({
      synced,
      skipped,
      failed,
      failedItems,
      total: activities?.length || 0
    })

  } catch (error: any) {
    console.error('Batch sync retry API error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
