import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Utility function to get start and end dates if not provided
function getDefaultDateRange() {
  const now = new Date()
  
  // Default to this week (Monday to Sunday)
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  
  const start = new Date(now.setDate(diff))
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse dates or use defaults
  let startDate = searchParams.get('startDate')
  let endDate = searchParams.get('endDate')

  if (!startDate || !endDate) {
    const defaults = getDefaultDateRange()
    startDate = defaults.startDate
    endDate = defaults.endDate
  }

  // Call the RPC function defined in the migration
  const { data, error } = await supabase.rpc('get_activity_insights', {
    p_user_id: user.id,
    p_start_date: startDate,
    p_end_date: endDate
  })

  if (error) {
    console.error('Insights RPC Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // data structure is { template_id, category_id, total_minutes, activity_count }
  // Calculate summary
  let totalMinutes = 0
  let totalCount = 0

  const categoryBreakdown: Record<string, { minutes: number, count: number }> = {}

  data.forEach((row: any) => {
    totalMinutes += row.total_minutes || 0
    totalCount += row.activity_count || 0

    if (row.category_id) {
      if (!categoryBreakdown[row.category_id]) {
        categoryBreakdown[row.category_id] = { minutes: 0, count: 0 }
      }
      categoryBreakdown[row.category_id].minutes += row.total_minutes || 0
      categoryBreakdown[row.category_id].count += row.activity_count || 0
    }
  })

  // Format response for the frontend charts
  // Note: For a real app we might want to also fetch category colors here,
  // or the frontend can map the category_id to the user's categories in state.
  return NextResponse.json({
    summary: {
      totalHours: +(totalMinutes / 60).toFixed(1),
      totalMinutes,
      totalCount,
    },
    breakdown: categoryBreakdown,
    rawData: data
  })
}
