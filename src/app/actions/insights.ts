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

  // 2. Map categories (category_ids 컬럼은 DB에 없으므로 category_id를 사용)
  const categoryIdsToMap = template.category_id ? [template.category_id] : []

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

// ─── 템플릿 센터 서버 액션 ───

export type TemplateSummary = {
  templateId: string
  title: string
  hexColor: string
  categoryNames: string[]
  currentMonthHours: number
  currentMonthCount: number
  prevMonthHours: number
  prevMonthCount: number
  totalHours: number
  totalCount: number
  avgSessionMinutes: number
  lastPerformedAt: string | null
  dailyTrend: { date: string; minutes: number }[]
}

export type TemplateUsageStats = {
  totalMinutes: number
  totalCount: number
  avgSessionMinutes: number
  maxSessionMinutes: number
  maxSessionDate: string | null
  firstPerformedAt: string | null
  lastPerformedAt: string | null
}

export type MonthlyTrendData = {
  month: string // 'YYYY-MM'
  minutes: number
  count: number
}

export type WeeklyTrendData = {
  weekStart: string // ISO date
  minutes: number
  count: number
}

export type DailyTrendData = {
  date: string // 'YYYY-MM-DD'
  minutes: number
  count: number
}

/**
 * 전체 템플릿의 요약 통계 (카드 그리드용)
 */
export async function getAllTemplatesSummary(startDate: string, endDate: string): Promise<TemplateSummary[]> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 1. 모든 템플릿 조회
  const templates = await getActivityTemplates()

  // 2. 현재 기간의 활동 (template_id가 있는 것만)
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  // 3. 전체 기간 활동 (template_id NOT NULL)
  const { data: allActivities, error } = await supabase
    .from('activities')
    .select('id, template_id, start_time, end_time')
    .eq('user_id', userData.user.id)
    .not('template_id', 'is', null)
    .is('deleted_at', null)
    .order('start_time', { ascending: false })

  if (error) throw new Error(error.message)

  // 4. 최근 7일 일별 데이터 계산
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const summaries: TemplateSummary[] = templates.map(tmpl => {
    const acts = (allActivities || []).filter((a: any) => a.template_id === tmpl.id)
    
    let totalMinutes = 0
    let currentMonthMinutes = 0
    let currentMonthCount = 0
    let prevMonthMinutes = 0
    let prevMonthCount = 0
    let maxSession = 0
    const dailyMap = new Map<string, number>()

    acts.forEach((a: any) => {
      const start = new Date(a.start_time)
      const end = new Date(a.end_time)
      const mins = (end.getTime() - start.getTime()) / 60000

      totalMinutes += mins

      if (a.start_time >= currentMonthStart && a.start_time <= currentMonthEnd) {
        currentMonthMinutes += mins
        currentMonthCount++
      }
      if (a.start_time >= prevMonthStart && a.start_time <= prevMonthEnd) {
        prevMonthMinutes += mins
        prevMonthCount++
      }
      if (mins > maxSession) maxSession = mins

      // 최근 7일 일별
      if (start >= sevenDaysAgo) {
        const dateKey = start.toISOString().split('T')[0]
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + mins)
      }
    })

    // 최근 7일 배열 생성
    const dailyTrend: { date: string; minutes: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailyTrend.push({ date: key, minutes: dailyMap.get(key) || 0 })
    }

    const categories = (tmpl as any).category_ids || []
    
    return {
      templateId: tmpl.id,
      title: tmpl.title,
      hexColor: tmpl.hex_color || '#4f46e5',
      categoryNames: categories,
      currentMonthHours: Number((currentMonthMinutes / 60).toFixed(1)),
      currentMonthCount,
      prevMonthHours: Number((prevMonthMinutes / 60).toFixed(1)),
      prevMonthCount,
      totalHours: Number((totalMinutes / 60).toFixed(1)),
      totalCount: acts.length,
      avgSessionMinutes: acts.length > 0 ? Math.round(totalMinutes / acts.length) : 0,
      lastPerformedAt: acts.length > 0 ? acts[0].start_time : null,
      dailyTrend
    }
  })

  return summaries
}

/**
 * 특정 템플릿의 상세 사용 통계
 */
export async function getTemplateUsageStats(templateId: string, startDate: string, endDate: string): Promise<TemplateUsageStats> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('activities')
    .select('start_time, end_time')
    .eq('user_id', userData.user.id)
    .eq('template_id', templateId)
    .is('deleted_at', null)
    .order('start_time', { ascending: true })

  if (error) throw new Error(error.message)

  let totalMinutes = 0
  let maxSessionMinutes = 0
  let maxSessionDate: string | null = null

  ;(data || []).forEach((a: any) => {
    const mins = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
    totalMinutes += mins
    if (mins > maxSessionMinutes) {
      maxSessionMinutes = mins
      maxSessionDate = a.start_time
    }
  })

  return {
    totalMinutes,
    totalCount: (data || []).length,
    avgSessionMinutes: (data || []).length > 0 ? Math.round(totalMinutes / (data || []).length) : 0,
    maxSessionMinutes: Math.round(maxSessionMinutes),
    maxSessionDate,
    firstPerformedAt: (data || []).length > 0 ? data![0].start_time : null,
    lastPerformedAt: (data || []).length > 0 ? data![data!.length - 1].start_time : null
  }
}

/**
 * 특정 템플릿의 월별 트렌드 (최근 12개월)
 */
export async function getTemplateMonthlyTrend(templateId: string): Promise<MonthlyTrendData[]> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const now = new Date()
  const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString()

  const { data, error } = await supabase
    .from('activities')
    .select('start_time, end_time')
    .eq('user_id', userData.user.id)
    .eq('template_id', templateId)
    .gte('start_time', startDate)
    .is('deleted_at', null)

  if (error) throw new Error(error.message)

  const monthMap = new Map<string, { minutes: number; count: number }>()

  // 최근 12개월 초기화
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { minutes: 0, count: 0 })
  }

  ;(data || []).forEach((a: any) => {
    const start = new Date(a.start_time)
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
    const mins = (new Date(a.end_time).getTime() - start.getTime()) / 60000
    const existing = monthMap.get(key)
    if (existing) {
      existing.minutes += mins
      existing.count++
    }
  })

  return Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    minutes: Math.round(data.minutes),
    count: data.count
  }))
}

/**
 * 특정 템플릿의 주간 트렌드 (최근 8주)
 */
export async function getTemplateWeeklyTrend(templateId: string): Promise<WeeklyTrendData[]> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const now = new Date()
  const startDate = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('activities')
    .select('start_time, end_time')
    .eq('user_id', userData.user.id)
    .eq('template_id', templateId)
    .gte('start_time', startDate)
    .is('deleted_at', null)

  if (error) throw new Error(error.message)

  // 8주 초기화 (월요일 기준)
  const weeks: WeeklyTrendData[] = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const day = weekStart.getDay()
    const diff = day === 0 ? 6 : day - 1
    weekStart.setDate(weekStart.getDate() - diff)
    weekStart.setHours(0, 0, 0, 0)
    weeks.push({ weekStart: weekStart.toISOString().split('T')[0], minutes: 0, count: 0 })
  }

  ;(data || []).forEach((a: any) => {
    const start = new Date(a.start_time)
    const mins = (new Date(a.end_time).getTime() - start.getTime()) / 60000
    
    // 해당 주 찾기
    for (let i = weeks.length - 1; i >= 0; i--) {
      const ws = new Date(weeks[i].weekStart)
      if (start >= ws) {
        weeks[i].minutes += mins
        weeks[i].count++
        break
      }
    }
  })

  return weeks.map(w => ({ ...w, minutes: Math.round(w.minutes) }))
}

/**
 * 특정 템플릿의 일별 트렌드 (스파크라인용)
 */
export async function getTemplateDailyTrend(templateId: string, days: number = 30): Promise<DailyTrendData[]> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('activities')
    .select('start_time, end_time')
    .eq('user_id', userData.user.id)
    .eq('template_id', templateId)
    .gte('start_time', startDate)
    .is('deleted_at', null)

  if (error) throw new Error(error.message)

  const dayMap = new Map<string, { minutes: number; count: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    dayMap.set(d.toISOString().split('T')[0], { minutes: 0, count: 0 })
  }

  ;(data || []).forEach((a: any) => {
    const start = new Date(a.start_time)
    const key = start.toISOString().split('T')[0]
    const mins = (new Date(a.end_time).getTime() - start.getTime()) / 60000
    const existing = dayMap.get(key)
    if (existing) {
      existing.minutes += mins
      existing.count++
    }
  })

  return Array.from(dayMap.entries()).map(([date, data]) => ({
    date,
    minutes: Math.round(data.minutes),
    count: data.count
  }))
}

// ─── 시간 분석 탭 서버 액션 ───

/**
 * 특정 카테고리의 월별 트렌드 (최근 6개월)
 */
export async function getCategoryMonthlyTrend(categoryId: string): Promise<MonthlyTrendData[]> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

  const { data, error } = await supabase
    .from('activities')
    .select(`
      start_time, end_time,
      activity_category_map!inner ( category_id )
    `)
    .eq('user_id', userData.user.id)
    .eq('activity_category_map.category_id', categoryId)
    .gte('start_time', startDate)
    .is('deleted_at', null)

  if (error) throw new Error(error.message)

  const monthMap = new Map<string, { minutes: number; count: number }>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { minutes: 0, count: 0 })
  }

  ;(data || []).forEach((a: any) => {
    const start = new Date(a.start_time)
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
    const mins = (new Date(a.end_time).getTime() - start.getTime()) / 60000
    const existing = monthMap.get(key)
    if (existing) {
      existing.minutes += mins
      existing.count++
    }
  })

  return Array.from(monthMap.entries()).map(([month, d]) => ({
    month,
    minutes: Math.round(d.minutes),
    count: d.count
  }))
}

/**
 * 특정 카테고리의 일별 트렌드 (스파크라인용)
 */
export async function getCategoryDailyTrend(categoryId: string, days: number = 7): Promise<DailyTrendData[]> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('activities')
    .select(`
      start_time, end_time,
      activity_category_map!inner ( category_id )
    `)
    .eq('user_id', userData.user.id)
    .eq('activity_category_map.category_id', categoryId)
    .gte('start_time', startDate)
    .is('deleted_at', null)

  if (error) throw new Error(error.message)

  const dayMap = new Map<string, { minutes: number; count: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    dayMap.set(d.toISOString().split('T')[0], { minutes: 0, count: 0 })
  }

  ;(data || []).forEach((a: any) => {
    const start = new Date(a.start_time)
    const key = start.toISOString().split('T')[0]
    const mins = (new Date(a.end_time).getTime() - start.getTime()) / 60000
    const existing = dayMap.get(key)
    if (existing) {
      existing.minutes += mins
      existing.count++
    }
  })

  return Array.from(dayMap.entries()).map(([date, d]) => ({
    date,
    minutes: Math.round(d.minutes),
    count: d.count
  }))
}

// ─── 종합 현황 탭 서버 액션 ───

export type OverviewKPI = {
  // 시간
  currentWeekHours: number
  prevWeekHours: number
  // 할 일
  currentWeekDone: number
  prevWeekDone: number
  // 아카이브
  currentWeekNotes: number
  prevWeekNotes: number
  // 스트릭
  currentStreak: number
  maxStreak: number
  // 레이더 차트용
  totalActivities: number
  avgSessionMins: number
  activeCategoryCount: number
  totalCategoryCount: number
}

/**
 * 종합 현황 탭의 Hero KPI + 레이더 차트 데이터
 */
export async function getOverviewKPI(): Promise<OverviewKPI> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // 이번 주 (월~일)
  const currentWeekStart = new Date(now)
  currentWeekStart.setDate(now.getDate() - mondayOffset)
  currentWeekStart.setHours(0, 0, 0, 0)
  const currentWeekEnd = new Date(currentWeekStart)
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6)
  currentWeekEnd.setHours(23, 59, 59, 999)

  // 지난 주
  const prevWeekStart = new Date(currentWeekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevWeekEnd = new Date(currentWeekStart)
  prevWeekEnd.setMilliseconds(-1)

  // 1) 활동 시간 (이번 주 / 지난 주)
  const { data: currentActs } = await supabase
    .from('activities')
    .select('start_time, end_time')
    .eq('user_id', userData.user.id)
    .gte('start_time', currentWeekStart.toISOString())
    .lte('start_time', currentWeekEnd.toISOString())
    .is('deleted_at', null)

  const { data: prevActs } = await supabase
    .from('activities')
    .select('start_time, end_time')
    .eq('user_id', userData.user.id)
    .gte('start_time', prevWeekStart.toISOString())
    .lte('start_time', prevWeekEnd.toISOString())
    .is('deleted_at', null)

  let currentWeekMins = 0
  ;(currentActs || []).forEach((a: any) => {
    currentWeekMins += (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
  })
  let prevWeekMins = 0
  ;(prevActs || []).forEach((a: any) => {
    prevWeekMins += (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
  })

  // 평균 세션
  const avgSessionMins = (currentActs || []).length > 0 ? Math.round(currentWeekMins / (currentActs || []).length) : 0

  // 2) 할 일 완료 (이번 주 / 지난 주) — updated_at 기반으로 done 상태 변경 시점 추정
  const { data: currentDone } = await supabase
    .from('agenda_tasks')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('status', 'done')
    .gte('updated_at', currentWeekStart.toISOString())
    .lte('updated_at', currentWeekEnd.toISOString())

  const { data: prevDone } = await supabase
    .from('agenda_tasks')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('status', 'done')
    .gte('updated_at', prevWeekStart.toISOString())
    .lte('updated_at', prevWeekEnd.toISOString())

  // 3) 아카이브 메모 (이번 주 / 지난 주)
  const { data: currentNotes } = await supabase
    .from('notes')
    .select('id')
    .eq('user_id', userData.user.id)
    .gte('updated_at', currentWeekStart.toISOString())
    .lte('updated_at', currentWeekEnd.toISOString())

  const { data: prevNotes } = await supabase
    .from('notes')
    .select('id')
    .eq('user_id', userData.user.id)
    .gte('updated_at', prevWeekStart.toISOString())
    .lte('updated_at', prevWeekEnd.toISOString())

  // 4) 스트릭 계산 (최근 90일)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const { data: streakActs } = await supabase
    .from('activities')
    .select('start_time')
    .eq('user_id', userData.user.id)
    .gte('start_time', ninetyDaysAgo.toISOString())
    .is('deleted_at', null)

  const activeDays = new Set<string>()
  ;(streakActs || []).forEach((a: any) => {
    activeDays.add(new Date(a.start_time).toISOString().split('T')[0])
  })

  let currentStreak = 0
  let maxStreak = 0
  let tempStreak = 0
  for (let i = 0; i < 90; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split('T')[0]
    if (activeDays.has(key)) {
      if (i === 0 || currentStreak > 0) currentStreak++
      tempStreak++
      maxStreak = Math.max(maxStreak, tempStreak)
    } else {
      if (i === 0) currentStreak = 0
      tempStreak = 0
    }
  }

  // 5) 카테고리 다양성
  const { data: allCats } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userData.user.id)

  const { data: activeCats } = await supabase
    .from('activity_category_map')
    .select('category_id')
    .in('activity_id', (currentActs || []).map((a: any) => a.id || '').filter(Boolean))

  const uniqueActiveCats = new Set((activeCats || []).map((c: any) => c.category_id))

  return {
    currentWeekHours: Number((currentWeekMins / 60).toFixed(1)),
    prevWeekHours: Number((prevWeekMins / 60).toFixed(1)),
    currentWeekDone: (currentDone || []).length,
    prevWeekDone: (prevDone || []).length,
    currentWeekNotes: (currentNotes || []).length,
    prevWeekNotes: (prevNotes || []).length,
    currentStreak,
    maxStreak,
    totalActivities: (currentActs || []).length,
    avgSessionMins,
    activeCategoryCount: uniqueActiveCats.size,
    totalCategoryCount: (allCats || []).length
  }
}

// ─── 실행력 탭 서버 액션 ───

export type ExecutionAnalytics = {
  // 핵심 KPI
  totalTasks: number
  doneTasks: number
  completionRate: number
  // 미루기 지수
  procrastinationIndex: number // 0~100, 높을수록 미룸
  avgDaysToComplete: number
  onTimeTasks: number
  lateTasks: number
  noDeadlineTasks: number
  // 서브태스크 통계
  totalSubtasks: number
  completedSubtasks: number
  subtaskCompletionRate: number
  // 주별 완료 추이
  weeklyCompletion: { week: string; done: number; created: number }[]
  // 할 일 수명 분포
  lifespanDistribution: { bucket: string; count: number }[]
  // 상태별 분포
  statusDistribution: { status: string; count: number; label: string }[]
  // 기한 초과 목록 (상위 5개)
  overdueTasks: { id: string; title: string; deadline: string; daysOverdue: number }[]
}

export async function getExecutionAnalytics(): Promise<ExecutionAnalytics> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 전체 할 일 (삭제 제외)
  const { data: tasks } = await supabase
    .from('agenda_tasks')
    .select(`
      *,
      subtasks:agenda_subtasks(*)
    `)
    .eq('user_id', userData.user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const allTasks = (tasks || []) as any[]
  const now = new Date()

  // 1) 핵심 KPI
  const doneTasks = allTasks.filter(t => t.status === 'done')
  const totalTasks = allTasks.length
  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0

  // 2) 미루기 지수
  let totalDaysToComplete = 0
  let completedWithDeadline = 0
  let onTimeTasks = 0
  let lateTasks = 0
  let noDeadlineTasks = 0

  doneTasks.forEach(t => {
    const created = new Date(t.created_at)
    const completed = new Date(t.updated_at)
    const days = Math.max(0, Math.round((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
    totalDaysToComplete += days

    if (t.deadline) {
      completedWithDeadline++
      const deadline = new Date(t.deadline)
      if (completed <= deadline) onTimeTasks++
      else lateTasks++
    } else {
      noDeadlineTasks++
    }
  })

  const avgDaysToComplete = doneTasks.length > 0 ? Math.round(totalDaysToComplete / doneTasks.length) : 0

  // 미루기 지수: 기한 내 완료율이 낮을수록 + 평균 완료일이 길수록 높음
  const deadlineRate = completedWithDeadline > 0 ? onTimeTasks / completedWithDeadline : 1
  const daysFactor = Math.min(avgDaysToComplete / 14, 1) // 14일 이상이면 1.0
  const procrastinationIndex = Math.round(((1 - deadlineRate) * 60 + daysFactor * 40))

  // 3) 서브태스크
  let totalSubtasks = 0
  let completedSubtasks = 0
  allTasks.forEach(t => {
    if (t.subtasks) {
      totalSubtasks += t.subtasks.length
      completedSubtasks += t.subtasks.filter((s: any) => s.is_completed).length
    }
  })
  const subtaskCompletionRate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0

  // 4) 주별 완료 추이 (최근 8주)
  const weeklyCompletion: { week: string; done: number; created: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) - i * 7)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`

    const doneInWeek = allTasks.filter(t =>
      t.status === 'done' &&
      new Date(t.updated_at) >= weekStart &&
      new Date(t.updated_at) <= weekEnd
    ).length

    const createdInWeek = allTasks.filter(t =>
      new Date(t.created_at) >= weekStart &&
      new Date(t.created_at) <= weekEnd
    ).length

    weeklyCompletion.push({ week: weekLabel, done: doneInWeek, created: createdInWeek })
  }

  // 5) 할 일 수명 분포 (생성~완료까지 일수)
  const lifespanBuckets = [
    { bucket: '당일', min: 0, max: 1, count: 0 },
    { bucket: '1~3일', min: 1, max: 4, count: 0 },
    { bucket: '4~7일', min: 4, max: 8, count: 0 },
    { bucket: '1~2주', min: 8, max: 15, count: 0 },
    { bucket: '2주+', min: 15, max: Infinity, count: 0 },
  ]

  doneTasks.forEach(t => {
    const days = Math.max(0, Math.round(
      (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)
    ))
    const bucket = lifespanBuckets.find(b => days >= b.min && days < b.max)
    if (bucket) bucket.count++
  })

  // 6) 상태별 분포
  const statusMap: Record<string, { count: number; label: string }> = {
    inbox: { count: 0, label: '대기 중' },
    done: { count: 0, label: '완료' },
    archive: { count: 0, label: '보관' },
  }
  allTasks.forEach(t => {
    if (statusMap[t.status]) statusMap[t.status].count++
  })
  const statusDistribution = Object.entries(statusMap).map(([status, d]) => ({ status, ...d }))

  // 7) 기한 초과 할 일 (상위 5개)
  const overdueTasks = allTasks
    .filter(t => t.status !== 'done' && t.deadline && new Date(t.deadline) < now)
    .map(t => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      daysOverdue: Math.round((now.getTime() - new Date(t.deadline).getTime()) / (1000 * 60 * 60 * 24))
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 5)

  return {
    totalTasks,
    doneTasks: doneTasks.length,
    completionRate,
    procrastinationIndex,
    avgDaysToComplete,
    onTimeTasks,
    lateTasks,
    noDeadlineTasks,
    totalSubtasks,
    completedSubtasks,
    subtaskCompletionRate,
    weeklyCompletion,
    lifespanDistribution: lifespanBuckets.map(b => ({ bucket: b.bucket, count: b.count })),
    statusDistribution,
    overdueTasks
  }
}
