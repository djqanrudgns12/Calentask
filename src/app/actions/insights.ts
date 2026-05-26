'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getActivities, type Activity } from './calendar'

export type ActivityTemplate = {
  id: string
  title: string
  category_id: string
  category_ids: string[]
  duration_minutes: number
  hex_color?: string
  memo?: string
  default_start_time?: string // HH:mm format
}

export async function getActivityTemplates() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('activity_templates')
    .select(`
      id,
      title,
      category_id,
      category_ids,
      duration_minutes,
      hex_color,
      memo,
      default_start_time,
      categories ( hex_color )
    `)
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return data.map((t: any) => ({
    id: t.id,
    title: t.title,
    category_id: t.category_id,
    category_ids: t.category_ids || (t.category_id ? [t.category_id] : []),
    duration_minutes: t.duration_minutes,
    hex_color: t.hex_color || t.categories?.hex_color,
    memo: t.memo,
    default_start_time: t.default_start_time ? t.default_start_time.substring(0, 5) : undefined
  })) as ActivityTemplate[]
}

export async function createActivityTemplate(payload: Omit<ActivityTemplate, 'id'>) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { data: null, error: '로그인이 필요합니다.' }

  const insertPayload: Record<string, unknown> = {
    user_id: userData.user.id,
    title: payload.title,
    category_id: payload.category_ids?.[0] || payload.category_id || null,
    category_ids: payload.category_ids || (payload.category_id ? [payload.category_id] : []),
    duration_minutes: payload.duration_minutes,
  }
  if (payload.hex_color) insertPayload.hex_color = payload.hex_color
  if (payload.memo) insertPayload.memo = payload.memo
  if (payload.default_start_time) insertPayload.default_start_time = payload.default_start_time + ':00'

  const { data, error } = await supabase
    .from('activity_templates')
    .insert([insertPayload])
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function updateActivityTemplate(id: string, payload: Partial<Omit<ActivityTemplate, 'id'>>) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { data: null, error: '로그인이 필요합니다.' }

  const updatePayload: Record<string, unknown> = {}
  if (payload.title !== undefined) updatePayload.title = payload.title
  if (payload.category_ids !== undefined) {
    updatePayload.category_ids = payload.category_ids
    updatePayload.category_id = payload.category_ids[0] || null
  } else if (payload.category_id !== undefined) {
    updatePayload.category_id = payload.category_id
  }
  if (payload.duration_minutes !== undefined) updatePayload.duration_minutes = payload.duration_minutes
  if (payload.hex_color !== undefined) updatePayload.hex_color = payload.hex_color
  if (payload.memo !== undefined) updatePayload.memo = payload.memo
  if (payload.default_start_time !== undefined) updatePayload.default_start_time = payload.default_start_time ? payload.default_start_time + ':00' : null

  const { data, error } = await supabase
    .from('activity_templates')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // --- 기존 일정에도 변경 사항 전파 (시간·메모 제외) ---
  const activityUpdate: Record<string, unknown> = {}
  if (payload.title !== undefined) activityUpdate.title = payload.title
  if (payload.hex_color !== undefined) activityUpdate.hex_color = payload.hex_color || null

  // 1. 일정의 title/memo/hex_color 동기화
  if (Object.keys(activityUpdate).length > 0) {
    await supabase
      .from('activities')
      .update(activityUpdate)
      .eq('template_id', id)
      .eq('user_id', userData.user.id)
  }

  // 2. 카테고리 매핑 동기화
  if (payload.category_ids !== undefined) {
    // 해당 템플릿으로 생성된 모든 일정 ID 조회
    const { data: linkedActivities } = await supabase
      .from('activities')
      .select('id')
      .eq('template_id', id)
      .eq('user_id', userData.user.id)

    if (linkedActivities && linkedActivities.length > 0) {
      const activityIds = linkedActivities.map(a => a.id)

      // 기존 카테고리 매핑 삭제
      await supabase
        .from('activity_category_map')
        .delete()
        .in('activity_id', activityIds)

      // 새 카테고리 매핑 일괄 삽입
      if (payload.category_ids.length > 0) {
        const newMappings = activityIds.flatMap(actId =>
          payload.category_ids!.map(catId => ({
            activity_id: actId,
            category_id: catId
          }))
        )
        await supabase.from('activity_category_map').insert(newMappings)
      }
    }
  }

  revalidatePath('/')
  return { data, error: null }
}

export async function deleteActivityTemplate(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('activity_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userData.user.id)

  if (error) throw new Error(error.message)
  return true
}

export async function createActivityFromTemplate(templateId: string, customStartDate?: Date, customDurationMinutes?: number) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // Fetch template
  const { data: template, error: tmplError } = await supabase
    .from('activity_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (tmplError || !template) throw new Error('Template not found')

  const start_time = customStartDate ? new Date(customStartDate) : new Date()
  const duration = customDurationMinutes ?? template.duration_minutes
  const end_time = new Date(start_time.getTime() + (duration * 60000))

  // 1. Create activity
  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .insert([{
      user_id: userData.user.id,
      title: template.title,
      start_time: start_time.toISOString(),
      end_time: end_time.toISOString(),
      is_all_day: false,
      type: 'EVENT',
      template_id: template.id,
      memo: template.memo || null,
      hex_color: template.hex_color || null
    }])
    .select()
    .single()

  if (activityError) throw new Error(activityError.message)

  // 2. Map categories
  const categoryIdsToMap = template.category_ids && template.category_ids.length > 0 
    ? template.category_ids 
    : (template.category_id ? [template.category_id] : [])

  if (categoryIdsToMap.length > 0) {
    const mappings = categoryIdsToMap.map((id: string) => ({
      activity_id: activity.id,
      category_id: id
    }))
    await supabase.from('activity_category_map').insert(mappings)
  }

  revalidatePath('/')
  return activity
}

export async function getInsightsData(startDate: string, endDate: string) {
  // Use existing getActivities action to get all activities in period
  const activities = await getActivities(startDate, endDate)
  
  // 1. Summary
  let totalMinutes = 0
  let totalCount = activities.length

  // 2. Breakdown
  const breakdown: Record<string, { minutes: number, count: number, name: string, hex_color: string }> = {}

  // 3. Weekly Chart (Mon-Sun)
  const days = ['월', '화', '수', '목', '금', '토', '일']
  const weeklyData = days.map(day => ({ day, value: 0 }))

  activities.forEach(act => {
    const start = new Date(act.start_time)
    const end = new Date(act.end_time)
    const durationMins = (end.getTime() - start.getTime()) / 60000

    totalMinutes += durationMins

    // Chart logic (assuming current week or specific period)
    const dayOfWeek = start.getDay() // 0=Sun, 1=Mon...
    const adjustedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 0=Mon, 6=Sun
    if (adjustedDayIndex >= 0 && adjustedDayIndex <= 6) {
      weeklyData[adjustedDayIndex].value += Number((durationMins / 60).toFixed(1))
    }

    // Breakdown logic
    if (act.categories && act.categories.length > 0) {
      const cat = act.categories[0] // take first category for simplicity
      if (!breakdown[cat.id]) {
        breakdown[cat.id] = { minutes: 0, count: 0, name: cat.name, hex_color: cat.hex_color }
      }
      breakdown[cat.id].minutes += durationMins
      breakdown[cat.id].count += 1
    } else {
      if (!breakdown['unclassified']) {
        breakdown['unclassified'] = { minutes: 0, count: 0, name: '미분류', hex_color: '#9CA3AF' }
      }
      breakdown['unclassified'].minutes += durationMins
      breakdown['unclassified'].count += 1
    }
  })

  return {
    summary: {
      totalHours: Number((totalMinutes / 60).toFixed(1)),
      totalCount
    },
    breakdown,
    weeklyData,
    rawData: activities
  }
}

export async function getSubjectDetails(subjectId: string, startDate: string, endDate: string) {
  // Get all activities for a specific category ID
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      activity_category_map!inner ( category_id )
    `)
    .eq('user_id', userData.user.id)
    .gte('start_time', startDate)
    .lte('end_time', endDate)
    .is('deleted_at', null)
    .eq('activity_category_map.category_id', subjectId)
    .order('start_time', { ascending: false })

  if (error) throw new Error(error.message)

  let totalMinutes = 0
  data.forEach((act: any) => {
    const start = new Date(act.start_time)
    const end = new Date(act.end_time)
    totalMinutes += (end.getTime() - start.getTime()) / 60000
  })

  return {
    activities: data,
    totalMinutes,
    totalCount: data.length
  }
}
