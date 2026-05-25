import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { template_id, title, category_id, duration_minutes } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }

    const start_time = new Date()
    const end_time = new Date(start_time.getTime() + (duration_minutes || 60) * 60000)

    const { data: activity, error } = await supabase
      .from('activities')
      .insert({
        user_id: user.id,
        title,
        template_id,
        start_time: start_time.toISOString(),
        end_time: end_time.toISOString(),
        type: 'EVENT'
      })
      .select()
      .single()

    if (error) throw error

    // Create mapping if category exists
    if (category_id) {
      await supabase.from('activity_category_map').insert({
        activity_id: activity.id,
        category_id
      })
    }

    return NextResponse.json(activity)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
