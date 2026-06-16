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
  custom_unit_enabled?: boolean
  custom_unit_minutes?: number
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
      custom_unit_enabled,
      custom_unit_minutes,
      template_category_map ( category_id, categories ( hex_color ) )
    `)
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return data.map((t: any) => {
    // 맵핑 테이블 데이터 처리
    const maps = t.template_category_map || []
    const mappedCategoryIds = maps.map((m: any) => m.category_id)
    // fallback 처리: 매핑이 없으면 기존 category_id 사용
    const categoryIds = mappedCategoryIds.length > 0 ? mappedCategoryIds : (t.category_id ? [t.category_id] : [])
    
    // 첫 번째 카테고리의 색상을 기본 색상으로 사용 (매핑된 카테고리 우선)
    const firstCatColor = maps.length > 0 ? maps[0].categories?.hex_color : undefined

    return {
      id: t.id,
      title: t.title,
      category_id: categoryIds[0] || t.category_id,
      category_ids: categoryIds,
      duration_minutes: t.duration_minutes,
      hex_color: t.hex_color || firstCatColor,
      memo: t.memo,
      default_start_time: t.default_start_time ? t.default_start_time.substring(0, 5) : undefined,
      custom_unit_enabled: t.custom_unit_enabled || false,
      custom_unit_minutes: t.custom_unit_minutes || 60
    }
  }) as ActivityTemplate[]
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
  if (payload.custom_unit_enabled !== undefined) insertPayload.custom_unit_enabled = payload.custom_unit_enabled
  if (payload.custom_unit_minutes !== undefined) insertPayload.custom_unit_minutes = payload.custom_unit_minutes

  const { data, error } = await supabase
    .from('activity_templates')
    .insert([insertPayload])
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // 다중 카테고리 매핑 추가
  if (payload.category_ids && payload.category_ids.length > 0) {
    const mappings = payload.category_ids.map(catId => ({
      template_id: data.id,
      category_id: catId
    }))
    await supabase.from('template_category_map').insert(mappings)
  }

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
  if (payload.custom_unit_enabled !== undefined) updatePayload.custom_unit_enabled = payload.custom_unit_enabled
  if (payload.custom_unit_minutes !== undefined) updatePayload.custom_unit_minutes = payload.custom_unit_minutes

  const { data, error } = await supabase
    .from('activity_templates')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // 1. 템플릿 본체 카테고리 맵핑 업데이트
  if (payload.category_ids !== undefined) {
    // 기존 맵핑 삭제
    await supabase.from('template_category_map').delete().eq('template_id', id)
    // 새 맵핑 추가
    if (payload.category_ids.length > 0) {
      const mappings = payload.category_ids.map(catId => ({
        template_id: id,
        category_id: catId
      }))
      await supabase.from('template_category_map').insert(mappings)
    }
  }

  // --- 기존 일정에도 변경 사항 전파 (사용자 요구사항: 카테고리, 색상만 영향 받도록 설계) ---
  const activityUpdate: Record<string, unknown> = {}
  if (payload.hex_color !== undefined) activityUpdate.hex_color = payload.hex_color || null

  // 2. 일정의 hex_color 동기화
  if (Object.keys(activityUpdate).length > 0) {
    await supabase
      .from('activities')
      .update(activityUpdate)
      .eq('template_id', id)
      .eq('user_id', userData.user.id)
  }

  // 3. 카테고리 매핑 동기화
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

  // 2. Map categories (템플릿의 다중 카테고리 매핑 가져오기)
  const { data: templateMaps } = await supabase
    .from('template_category_map')
    .select('category_id')
    .eq('template_id', template.id)

  const categoryIdsToMap = templateMaps && templateMaps.length > 0 
    ? templateMaps.map(m => m.category_id) 
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
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // FEAT: 경량 쿼리로 불필요한 필드(memo, location 등) 제외
  const { data: activitiesData } = await supabase
    .from('activities')
    .select(`
      id, title, start_time, end_time, is_all_day, type, hex_color,
      activity_category_map(categories(id, name, hex_color))
    `)
    .eq('user_id', userData.user.id)
    .gte('start_time', startDate)
    .lte('end_time', endDate)
    .is('deleted_at', null)

  const activities = (activitiesData || []).map((a: any) => ({
    ...a,
    categories: (a.activity_category_map || [])
      .map((map: any) => map.categories)
      .filter(Boolean)
  }))
  
  // 1. Summary
  let totalMinutes = 0
  let totalCount = activities.length

  // 2. Breakdown
  const breakdown: Record<string, { minutes: number, count: number, name: string, hex_color: string }> = {}

  // 3. Weekly Chart (Mon-Sun)
  const days = ['월', '화', '수', '목', '금', '토', '일']
  const weeklyData: { day: string; hours: number; activities: any[] }[] = days.map(day => ({ day, hours: 0, activities: [] }))

  activities.forEach(act => {
    const start = new Date(act.start_time)
    const end = new Date(act.end_time)
    const durationMins = (end.getTime() - start.getTime()) / 60000

    totalMinutes += durationMins

    // Chart logic (assuming current week or specific period)
    const dayOfWeek = start.getDay() // 0=Sun, 1=Mon...
    const adjustedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 0=Mon, 6=Sun
    if (adjustedDayIndex >= 0 && adjustedDayIndex <= 6) {
      weeklyData[adjustedDayIndex].hours += Number((durationMins / 60).toFixed(1))
      weeklyData[adjustedDayIndex].activities.push(act)
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
    rawData: activities.map(act => ({
      id: act.id,
      title: act.title,
      start_time: act.start_time,
      end_time: act.end_time,
      is_all_day: act.is_all_day,
      categories: act.categories?.map((c: any) => ({
        id: c.id,
        name: c.name,
        hex_color: c.hex_color
      })) || []
    }))
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
  categoryIds: string[]
  templateDurationMinutes: number
  templateStartTime?: string
  currentMonthHours: number
  currentMonthMinutes: number
  currentMonthCount: number
  prevMonthHours: number
  prevMonthMinutes: number
  prevMonthCount: number
  totalHours: number
  totalMinutes: number
  totalCount: number
  avgSessionMinutes: number
  lastPerformedAt: string | null
  dailyTrend: { date: string; minutes: number }[]
  // FEAT-02: 커스텀 시간 단위
  customUnitEnabled: boolean
  customUnitMinutes: number
  currentMonthUnits: number
  prevMonthUnits: number
  totalUnits: number
  dailyTrendUnits: { date: string; units: number }[]
}

export type TemplateUsageStats = {
  totalMinutes: number
  totalUnits: number
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

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

function getKSTDate(dateInput: Date | string) {
  const utcDate = new Date(dateInput)
  return new Date(utcDate.getTime() + KST_OFFSET_MS)
}

function getKSTNow() {
  return getKSTDate(new Date())
}

/**
 * 전체 템플릿의 요약 통계 (카드 그리드용)
 */
export async function getAllTemplatesSummary(
  startDate: string,
  endDate: string,
  prevStartDate: string,
  prevEndDate: string,
  trendType: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<TemplateSummary[]> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 기간 계산
  const currentMonthStart = startDate
  const currentMonthEnd = endDate
  const prevMonthStart = prevStartDate
  const prevMonthEnd = prevEndDate

  // 1단계: 템플릿, 직접생성 활동, 수동 연결, 카테고리 병렬 조회
  const [
    templates,
    { data: directActivities, error: directError },
    { data: links },
    { data: allCategories }
  ] = await Promise.all([
    getActivityTemplates(),
    supabase
      .from('activities')
      .select('id, template_id, start_time, end_time')
      .eq('user_id', userData.user.id)
      .not('template_id', 'is', null)
      .is('deleted_at', null),
    supabase
      .from('template_activity_links')
      .select('template_id, activity_id'),
    supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', userData.user.id)
  ])

  if (directError) throw new Error(directError.message)

  // 2단계: 수동 연결된 활동의 상세 정보 조회 (links 결과에 의존)
  const linkedIds = (links || []).map((l: any) => l.activity_id)
  let linkedActivities: any[] = []
  if (linkedIds.length > 0) {
    const { data: linkedData } = await supabase
      .from('activities')
      .select('id, start_time, end_time')
      .eq('user_id', userData.user.id)
      .in('id', linkedIds)
      .is('deleted_at', null)
    linkedActivities = linkedData || []
  }

  const linkedActMap = new Map(linkedActivities.map(a => [a.id, a]))
  
  const allActivities = [...(directActivities || [])]
  ;(links || []).forEach((l: any) => {
    const act = linkedActMap.get(l.activity_id)
    if (act) {
      allActivities.push({
        id: act.id,
        template_id: l.template_id,
        start_time: act.start_time,
        end_time: act.end_time
      })
    }
  })

  // 시간 역순 정렬
  allActivities.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  // 카테고리 ID → name 매핑
  const categoryNameMap: Record<string, string> = {}
  ;(allCategories || []).forEach((c: any) => { categoryNameMap[c.id] = c.name })

  // 4. 트렌드 버킷 구조 생성
  const currentStartKST = getKSTDate(startDate)
  const currentEndKST = getKSTDate(endDate)
  
  const getTrendKey = (date: Date) => {
    if (trendType === 'monthly') {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    } else if (trendType === 'weekly') {
      const d = new Date(date)
      d.setUTCDate(d.getUTCDate() - d.getUTCDay())
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    } else {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
    }
  }

  const baseTrendBuckets: { date: string, minutes: number, units: number }[] = []
  const bucketMap = new Map<string, number>()
  
  let iterDate = new Date(currentStartKST)
  while (iterDate <= currentEndKST) {
    const key = getTrendKey(iterDate)
    if (!bucketMap.has(key)) {
      bucketMap.set(key, baseTrendBuckets.length)
      baseTrendBuckets.push({ date: key, minutes: 0, units: 0 })
    }
    iterDate.setUTCDate(iterDate.getUTCDate() + 1)
  }

  const summaries: TemplateSummary[] = templates.map(tmpl => {
    const acts = allActivities.filter((a: any) => a.template_id === tmpl.id)
    
    let totalMinutes = 0
    let currentMonthMinutes = 0
    let currentMonthCount = 0
    let prevMonthMinutes = 0
    let prevMonthCount = 0
    let maxSession = 0
    
    // 복사하여 독립적인 트렌드 배열 생성
    const trendBuckets = baseTrendBuckets.map(b => ({ ...b }))

    let totalUnits = 0
    let currentMonthUnits = 0
    let prevMonthUnits = 0

    const customUnitEnabled = (tmpl as any).custom_unit_enabled || false
    const customUnitMinutes = (tmpl as any).custom_unit_minutes || 40

    acts.forEach((a: any) => {
      const start = new Date(a.start_time)
      const end = new Date(a.end_time)
      const mins = (end.getTime() - start.getTime()) / 60000

      totalMinutes += mins
      const units = customUnitEnabled ? Math.floor(mins / customUnitMinutes) : 0
      totalUnits += units

      if (a.start_time >= currentMonthStart && a.start_time <= currentMonthEnd) {
        currentMonthMinutes += mins
        currentMonthCount++
        currentMonthUnits += units
      }
      if (a.start_time >= prevMonthStart && a.start_time <= prevMonthEnd) {
        prevMonthMinutes += mins
        prevMonthCount++
        prevMonthUnits += units
      }
      if (mins > maxSession) maxSession = mins

      // 트렌드 데이터 (선택된 기간 내)
      if (a.start_time >= currentMonthStart && a.start_time <= currentMonthEnd) {
        const actKST = getKSTDate(a.start_time)
        const key = getTrendKey(actKST)
        const bucketIndex = bucketMap.get(key)
        if (bucketIndex !== undefined) {
          trendBuckets[bucketIndex].minutes += mins
          trendBuckets[bucketIndex].units += units
        }
      }
    })

    const dailyTrend = trendBuckets.map(b => ({ date: b.date, minutes: b.minutes }))
    const dailyTrendUnits = trendBuckets.map(b => ({ date: b.date, units: b.units }))

    const categoryIds = (tmpl as any).category_ids || []
    const categoryNames = categoryIds.map((id: string) => categoryNameMap[id] || '미분류')
    
    return {
      templateId: tmpl.id,
      title: tmpl.title,
      hexColor: tmpl.hex_color || '#4f46e5',
      categoryNames, // BUG-07 수정: 실제 카테고리 이름 배열
      categoryIds, // 카테고리 ID 배열 (편집용)
      templateDurationMinutes: tmpl.duration_minutes,
      templateStartTime: tmpl.default_start_time,
      currentMonthHours: Number((currentMonthMinutes / 60).toFixed(1)),
      currentMonthMinutes,
      currentMonthCount,
      prevMonthHours: Number((prevMonthMinutes / 60).toFixed(1)),
      prevMonthMinutes,
      prevMonthCount,
      totalHours: Number((totalMinutes / 60).toFixed(1)),
      totalMinutes,
      totalCount: acts.length,
      avgSessionMinutes: acts.length > 0 ? Math.round(totalMinutes / acts.length) : 0,
      lastPerformedAt: acts.length > 0 ? acts[0].start_time : null,
      dailyTrend,
      // FEAT-02: 커스텀 시간 단위
      customUnitEnabled,
      customUnitMinutes,
      currentMonthUnits,
      prevMonthUnits,
      totalUnits,
      dailyTrendUnits
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

  const { data: tmpl } = await supabase
    .from('activity_templates')
    .select('custom_unit_enabled, custom_unit_minutes')
    .eq('id', templateId)
    .single()

  const customUnitEnabled = tmpl?.custom_unit_enabled || false
  const customUnitMinutes = tmpl?.custom_unit_minutes || 40

  const rawActs = await getTemplateLinkedActivities(templateId)
  const data = rawActs.map(a => ({ start_time: a.startTime, end_time: a.endTime }))
  data.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  let totalMinutes = 0
  let totalUnits = 0
  let maxSessionMinutes = 0
  let maxSessionDate: string | null = null

  ;(data || []).forEach((a: any) => {
    const mins = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
    totalMinutes += mins
    totalUnits += customUnitEnabled ? Math.floor(mins / customUnitMinutes) : 0
    if (mins > maxSessionMinutes) {
      maxSessionMinutes = mins
      maxSessionDate = a.start_time
    }
  })

  return {
    totalMinutes,
    totalUnits,
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

  const kstNow = getKSTNow()
  const startKST = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() - 11, 1))
  const startDate = new Date(startKST.getTime() - KST_OFFSET_MS).toISOString()

  const rawActs = await getTemplateLinkedActivities(templateId)
  const data = rawActs
    .filter(a => a.startTime >= startDate)
    .map(a => ({ start_time: a.startTime, end_time: a.endTime }))

  const monthMap = new Map<string, { minutes: number; count: number }>()

  // 최근 12개월 초기화
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { minutes: 0, count: 0 })
  }

  ;(data || []).forEach((a: any) => {
    const actKST = getKSTDate(a.start_time)
    const key = `${actKST.getUTCFullYear()}-${String(actKST.getUTCMonth() + 1).padStart(2, '0')}`
    const mins = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
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

  const kstNow = getKSTNow()
  const startDateKST = new Date(kstNow.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)
  const startDate = new Date(startDateKST.getTime() - KST_OFFSET_MS).toISOString()

  const rawActs = await getTemplateLinkedActivities(templateId)
  const data = rawActs
    .filter(a => a.startTime >= startDate)
    .map(a => ({ start_time: a.startTime, end_time: a.endTime }))

  // 8주 초기화 (월요일 기준)
  const weeks: WeeklyTrendData[] = []
  for (let i = 7; i >= 0; i--) {
    const weekStartKST = new Date(kstNow.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const day = weekStartKST.getUTCDay()
    const diff = day === 0 ? 6 : day - 1
    weekStartKST.setUTCDate(weekStartKST.getUTCDate() - diff)
    weekStartKST.setUTCHours(0, 0, 0, 0)
    weeks.push({ weekStart: weekStartKST.toISOString().split('T')[0], minutes: 0, count: 0 })
  }

  ;(data || []).forEach((a: any) => {
    const actKST = getKSTDate(a.start_time)
    const mins = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
    
    // 해당 주 찾기
    for (let i = weeks.length - 1; i >= 0; i--) {
      const ws = new Date(weeks[i].weekStart + 'T00:00:00Z')
      const actDateTrunc = new Date(Date.UTC(actKST.getUTCFullYear(), actKST.getUTCMonth(), actKST.getUTCDate()))
      if (actDateTrunc >= ws) {
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

  const kstNow = getKSTNow()
  const startDateKST = new Date(kstNow.getTime() - days * 24 * 60 * 60 * 1000)
  const startDate = new Date(startDateKST.getTime() - KST_OFFSET_MS).toISOString()

  const rawActs = await getTemplateLinkedActivities(templateId)
  const data = rawActs
    .filter(a => a.startTime >= startDate)
    .map(a => ({ start_time: a.startTime, end_time: a.endTime }))

  const dayMap = new Map<string, { minutes: number; count: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(kstNow.getTime() - i * 24 * 60 * 60 * 1000)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    dayMap.set(key, { minutes: 0, count: 0 })
  }

  ;(data || []).forEach((a: any) => {
    const actKST = getKSTDate(a.start_time)
    const key = `${actKST.getUTCFullYear()}-${String(actKST.getUTCMonth() + 1).padStart(2, '0')}-${String(actKST.getUTCDate()).padStart(2, '0')}`
    const mins = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
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

/**
 * FEAT: 통합 상세 분석 (중복 쿼리 제거)
 * 1번의 DB 조회로 UsageStats, MonthlyTrend, WeeklyTrend, DailyTrend를 모두 산출합니다.
 */
export async function getTemplateFullAnalytics(templateId: string, daysForDaily: number = 30) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 1. 템플릿 정보 및 연결된 일정 병렬 조회
  const [
    { data: tmpl },
    rawActs
  ] = await Promise.all([
    supabase.from('activity_templates').select('custom_unit_enabled, custom_unit_minutes').eq('id', templateId).single(),
    getTemplateLinkedActivities(templateId)
  ])

  const customUnitEnabled = tmpl?.custom_unit_enabled || false
  const customUnitMinutes = tmpl?.custom_unit_minutes || 40

  const data = rawActs.map(a => ({ start_time: a.startTime, end_time: a.endTime }))
  data.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const kstNow = getKSTNow()

  // --- 1) Usage Stats 계산 ---
  let totalMinutes = 0
  let totalUnits = 0
  let maxSessionMinutes = 0
  let maxSessionDate: string | null = null

  ;(data || []).forEach((a: any) => {
    const mins = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
    totalMinutes += mins
    totalUnits += customUnitEnabled ? Math.floor(mins / customUnitMinutes) : 0
    if (mins > maxSessionMinutes) {
      maxSessionMinutes = mins
      maxSessionDate = a.start_time
    }
  })

  const usageStats: TemplateUsageStats = {
    totalMinutes,
    totalUnits,
    totalCount: (data || []).length,
    avgSessionMinutes: (data || []).length > 0 ? Math.round(totalMinutes / (data || []).length) : 0,
    maxSessionMinutes: Math.round(maxSessionMinutes),
    maxSessionDate,
    firstPerformedAt: (data || []).length > 0 ? data![0].start_time : null,
    lastPerformedAt: (data || []).length > 0 ? data![data!.length - 1].start_time : null
  }

  // --- 2) Monthly Trend (최근 12개월) ---
  const startMonthKST = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() - 11, 1))
  const startMonthDate = new Date(startMonthKST.getTime() - KST_OFFSET_MS).toISOString()
  
  const monthMap = new Map<string, { minutes: number; count: number }>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { minutes: 0, count: 0 })
  }

  data.filter(a => a.start_time >= startMonthDate).forEach((a: any) => {
    const actKST = getKSTDate(a.start_time)
    const key = `${actKST.getUTCFullYear()}-${String(actKST.getUTCMonth() + 1).padStart(2, '0')}`
    const mins = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
    const existing = monthMap.get(key)
    if (existing) {
      existing.minutes += mins
      existing.count++
    }
  })

  const monthlyTrend: MonthlyTrendData[] = Array.from(monthMap.entries()).map(([month, d]) => ({
    month,
    minutes: Math.round(d.minutes),
    count: d.count
  }))

  // --- 3) Weekly Trend (최근 8주) ---
  const startWeekKST = new Date(kstNow.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)
  const startWeekDate = new Date(startWeekKST.getTime() - KST_OFFSET_MS).toISOString()

  const weeks: WeeklyTrendData[] = []
  for (let i = 7; i >= 0; i--) {
    const weekStartKST = new Date(kstNow.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const day = weekStartKST.getUTCDay()
    const diff = day === 0 ? 6 : day - 1
    weekStartKST.setUTCDate(weekStartKST.getUTCDate() - diff)
    weekStartKST.setUTCHours(0, 0, 0, 0)
    weeks.push({ weekStart: weekStartKST.toISOString().split('T')[0], minutes: 0, count: 0 })
  }

  data.filter(a => a.start_time >= startWeekDate).forEach((a: any) => {
    const actKST = getKSTDate(a.start_time)
    const mins = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
    for (let i = weeks.length - 1; i >= 0; i--) {
      const ws = new Date(weeks[i].weekStart + 'T00:00:00Z')
      const actDateTrunc = new Date(Date.UTC(actKST.getUTCFullYear(), actKST.getUTCMonth(), actKST.getUTCDate()))
      if (actDateTrunc >= ws) {
        weeks[i].minutes += mins
        weeks[i].count++
        break
      }
    }
  })

  const weeklyTrend: WeeklyTrendData[] = weeks.map(w => ({ ...w, minutes: Math.round(w.minutes) }))

  // --- 4) Daily Trend (최근 30일) ---
  const startDayKST = new Date(kstNow.getTime() - daysForDaily * 24 * 60 * 60 * 1000)
  const startDayDate = new Date(startDayKST.getTime() - KST_OFFSET_MS).toISOString()

  const dayMap = new Map<string, { minutes: number; count: number }>()
  for (let i = daysForDaily - 1; i >= 0; i--) {
    const d = new Date(kstNow.getTime() - i * 24 * 60 * 60 * 1000)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    dayMap.set(key, { minutes: 0, count: 0 })
  }

  data.filter(a => a.start_time >= startDayDate).forEach((a: any) => {
    const actKST = getKSTDate(a.start_time)
    const key = `${actKST.getUTCFullYear()}-${String(actKST.getUTCMonth() + 1).padStart(2, '0')}-${String(actKST.getUTCDate()).padStart(2, '0')}`
    const mins = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
    const existing = dayMap.get(key)
    if (existing) {
      existing.minutes += mins
      existing.count++
    }
  })

  const dailyTrend: DailyTrendData[] = Array.from(dayMap.entries()).map(([date, d]) => ({
    date,
    minutes: Math.round(d.minutes),
    count: d.count
  }))

  return { usageStats, monthlyTrend, weeklyTrend, dailyTrend }
}

// ─── 시간 분석 탭 서버 액션 ───

/**
 * 특정 카테고리의 월별 트렌드 (최근 6개월)
 */
export async function getCategoryMonthlyTrend(categoryId: string): Promise<MonthlyTrendData[]> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const kstNow = getKSTNow()
  const startKST = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() - 5, 1))
  const startDate = new Date(startKST.getTime() - KST_OFFSET_MS).toISOString()

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
    const d = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, { minutes: 0, count: 0 })
  }

  ;(data || []).forEach((a: any) => {
    const actKST = getKSTDate(a.start_time)
    const key = `${actKST.getUTCFullYear()}-${String(actKST.getUTCMonth() + 1).padStart(2, '0')}`
    const mins = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
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
 * startDate/endDate: 선택된 기간의 ISO 날짜 문자열
 * periodType: 'week' | 'month' | 'year' | 'custom' — 비교 레이블용
 */
export async function getOverviewKPI(startDate: string, endDate: string, periodType: string = 'week'): Promise<OverviewKPI> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 방어 코드: startDate/endDate가 비어있거나 유효하지 않은 경우 이번 주를 기본값으로 사용
  const now = new Date()
  let currentStart = new Date(startDate)
  let currentEnd = new Date(endDate)
  if (isNaN(currentStart.getTime()) || isNaN(currentEnd.getTime())) {
    // 폴백: 이번 주(월~일)
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    currentStart = new Date(now)
    currentStart.setDate(now.getDate() - mondayOffset)
    currentStart.setHours(0, 0, 0, 0)
    currentEnd = new Date(currentStart)
    currentEnd.setDate(currentStart.getDate() + 6)
    currentEnd.setHours(23, 59, 59, 999)
  }

  // 비교 기간: 선택 기간과 동일 길이의 직전 기간 (BUG-09 수정)
  const diffMs = currentEnd.getTime() - currentStart.getTime()
  const prevEnd = new Date(currentStart)
  prevEnd.setDate(prevEnd.getDate() - 1)
  prevEnd.setHours(23, 59, 59, 999)
  const prevStart = new Date(prevEnd.getTime() - diffMs)
  prevStart.setHours(0, 0, 0, 0)

  // 1단계: 독립적인 7개 쿼리를 병렬로 실행
  const [
    { data: currentActs },
    { data: prevActs },
    { data: currentDone },
    { data: prevDone },
    { data: currentNotes },
    { data: prevNotes },
    { data: streakActs }
  ] = await Promise.all([
    // 1) 활동 시간 (현재 기간)
    supabase
      .from('activities')
      .select('id, start_time, end_time')
      .eq('user_id', userData.user.id)
      .gte('start_time', currentStart.toISOString())
      .lte('end_time', currentEnd.toISOString())
      .is('deleted_at', null),
    // 1-2) 활동 시간 (이전 기간)
    supabase
      .from('activities')
      .select('start_time, end_time')
      .eq('user_id', userData.user.id)
      .gte('start_time', prevStart.toISOString())
      .lte('end_time', prevEnd.toISOString())
      .is('deleted_at', null),
    // 2) 할 일 완료 (현재 기간)
    supabase
      .from('agenda_tasks')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('status', 'done')
      .not('completed_at', 'is', null)
      .gte('completed_at', currentStart.toISOString())
      .lte('completed_at', currentEnd.toISOString()),
    // 2-2) 할 일 완료 (이전 기간)
    supabase
      .from('agenda_tasks')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('status', 'done')
      .not('completed_at', 'is', null)
      .gte('completed_at', prevStart.toISOString())
      .lte('completed_at', prevEnd.toISOString()),
    // 3) 아카이브 메모 (현재 기간)
    supabase
      .from('notes')
      .select('id')
      .eq('user_id', userData.user.id)
      .gte('updated_at', currentStart.toISOString())
      .lte('updated_at', currentEnd.toISOString()),
    // 3-2) 아카이브 메모 (이전 기간)
    supabase
      .from('notes')
      .select('id')
      .eq('user_id', userData.user.id)
      .gte('updated_at', prevStart.toISOString())
      .lte('updated_at', prevEnd.toISOString()),
    // 4) 스트릭 계산 (최근 90일)
    supabase
      .from('activities')
      .select('start_time')
      .eq('user_id', userData.user.id)
      .gte('start_time', new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .is('deleted_at', null)
  ])

  let currentMins = 0
  ;(currentActs || []).forEach((a: any) => {
    currentMins += (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
  })
  let prevMins = 0
  ;(prevActs || []).forEach((a: any) => {
    prevMins += (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
  })

  // 평균 세션
  const avgSessionMins = (currentActs || []).length > 0 ? Math.round(currentMins / (currentActs || []).length) : 0

  // BUG-06 수정: KST 기준으로 날짜 파싱
  const activeDays = new Set<string>()
  ;(streakActs || []).forEach((a: any) => {
    const kst = getKSTDate(a.start_time)
    activeDays.add(`${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`)
  })

  let currentStreak = 0
  let maxStreak = 0
  let tempStreak = 0
  for (let i = 0; i < 90; i++) {
    const dKst = getKSTDate(new Date(now.getTime() - i * 24 * 60 * 60 * 1000))
    const key = `${dKst.getUTCFullYear()}-${String(dKst.getUTCMonth() + 1).padStart(2, '0')}-${String(dKst.getUTCDate()).padStart(2, '0')}`
    if (activeDays.has(key)) {
      if (i === 0 || currentStreak > 0) currentStreak++
      tempStreak++
      maxStreak = Math.max(maxStreak, tempStreak)
    } else {
      if (i === 0) currentStreak = 0
      tempStreak = 0
    }
  }

  // 2단계: currentActs에 의존하는 activeCats와 독립적인 allCats를 병렬 실행
  const currentActIds = (currentActs || []).map((a: any) => a.id).filter(Boolean)
  
  const [
    { data: allCats },
    { data: activeCats }
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('id')
      .eq('user_id', userData.user.id),
    supabase
      .from('activity_category_map')
      .select('category_id')
      .in('activity_id', currentActIds.length > 0 ? currentActIds : ['__none__'])
  ])

  const uniqueActiveCats = new Set((activeCats || []).map((c: any) => c.category_id))

  return {
    currentWeekHours: Number((currentMins / 60).toFixed(1)),
    prevWeekHours: Number((prevMins / 60).toFixed(1)),
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

export async function getExecutionAnalytics(startDate?: string, endDate?: string): Promise<ExecutionAnalytics> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  let query = supabase
    .from('agenda_tasks')
    .select(`
      *,
      subtasks:agenda_subtasks(*)
    `)
    .eq('user_id', userData.user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data: tasks } = await query

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
    const completed = new Date(t.completed_at || t.updated_at) // BUG-05: completed_at 우선
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

    const doneInWeek = allTasks.filter(t => {
      if (t.status !== 'done') return false
      const completedDate = new Date(t.completed_at || t.updated_at) // BUG-05: completed_at 우선
      return completedDate >= weekStart && completedDate <= weekEnd
    }).length

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
      (new Date(t.completed_at || t.updated_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24) // BUG-05: completed_at 우선
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

// ─── FEAT-01: 템플릿-일정 연결 관리 서버 액션 ───

/**
 * 특정 템플릿에 연결된 모든 일정 조회 (직접 생성 + 수동 연결)
 * 시간순(최신순) 정렬, 정확한 연/월/일과 시작~종료 시각 포함
 */
export async function getTemplateLinkedActivities(templateId: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 1단계: 직접 생성 일정과 수동 연결 링크를 병렬 조회
  const [
    { data: directActs },
    { data: links }
  ] = await Promise.all([
    supabase
      .from('activities')
      .select('id, title, start_time, end_time, is_all_day, template_id')
      .eq('user_id', userData.user.id)
      .eq('template_id', templateId)
      .is('deleted_at', null)
      .order('start_time', { ascending: false }),
    supabase
      .from('template_activity_links')
      .select('activity_id')
      .eq('template_id', templateId)
  ])

  const linkedIds = (links || []).map((l: any) => l.activity_id)
  
  let linkedActs: any[] = []
  if (linkedIds.length > 0) {
    const { data } = await supabase
      .from('activities')
      .select('id, title, start_time, end_time, is_all_day, template_id')
      .eq('user_id', userData.user.id)
      .in('id', linkedIds)
      .is('deleted_at', null)
      .order('start_time', { ascending: false })
    linkedActs = data || []
  }

  // 3. 합치기 (중복 제거) + 소스 표시
  const directIds = new Set((directActs || []).map((a: any) => a.id))
  const linkedIdSet = new Set(linkedIds)

  const allActs = [
    ...(directActs || []).map((a: any) => ({ ...a, linkType: 'direct' as const })),
    ...linkedActs
      .filter((a: any) => !directIds.has(a.id))
      .map((a: any) => ({ ...a, linkType: 'manual' as const }))
  ]

  // 시간순 정렬 (최신순)
  allActs.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  return allActs.map(a => ({
    id: a.id,
    title: a.title,
    startTime: a.start_time,
    endTime: a.end_time,
    isAllDay: a.is_all_day,
    durationMinutes: Math.round((new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000),
    linkType: a.linkType // 'direct' | 'manual'
  }))
}

/**
 * 일정을 템플릿에 통계 전용으로 연결
 */
export async function linkActivityToTemplate(templateId: string, activityId: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { error: '로그인이 필요합니다.' }

  // 템플릿 소유자 확인
  const { data: tmpl } = await supabase
    .from('activity_templates')
    .select('id')
    .eq('id', templateId)
    .eq('user_id', userData.user.id)
    .single()
  if (!tmpl) return { error: '템플릿을 찾을 수 없습니다.' }

  const { error } = await supabase
    .from('template_activity_links')
    .upsert({ template_id: templateId, activity_id: activityId }, { onConflict: 'template_id,activity_id' })

  if (error) return { error: error.message }
  return { error: null }
}

/**
 * 템플릿-일정 연결 해제
 */
export async function unlinkActivityFromTemplate(templateId: string, activityId: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('template_activity_links')
    .delete()
    .eq('template_id', templateId)
    .eq('activity_id', activityId)

  if (error) return { error: error.message }
  return { error: null }
}

/**
 * 연결 가능한 일정 검색 (제목 검색 + 날짜 필터)
 * 이미 연결된 일정도 포함하여 반환 (체크 상태 표시용)
 */
export async function searchActivitiesForLinking(
  templateId: string,
  query: string,
  dateFrom?: string,
  dateTo?: string
) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 1. 일정 검색
  let qb = supabase
    .from('activities')
    .select('id, title, start_time, end_time, is_all_day, template_id')
    .eq('user_id', userData.user.id)
    .is('deleted_at', null)
    .order('start_time', { ascending: false })
    .limit(50)

  if (query.trim()) {
    qb = qb.ilike('title', `%${query.trim()}%`)
  }
  if (dateFrom) {
    qb = qb.gte('start_time', dateFrom)
  }
  if (dateTo) {
    qb = qb.lte('start_time', dateTo)
  }

  const { data: activities } = await qb

  // 2. 이미 연결된 일정 ID 조회
  const { data: links } = await supabase
    .from('template_activity_links')
    .select('activity_id')
    .eq('template_id', templateId)
  const linkedIds = new Set((links || []).map((l: any) => l.activity_id))

  return (activities || []).map((a: any) => ({
    id: a.id,
    title: a.title,
    startTime: a.start_time,
    endTime: a.end_time,
    isAllDay: a.is_all_day,
    durationMinutes: Math.round((new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000),
    isDirectlyCreated: a.template_id === templateId,
    isLinked: linkedIds.has(a.id)
  }))
}

/**
 * FEAT-03: 연간 목표 달성률 (초경량 API)
 * 전체 일정을 반환하지 않고, 서버에서 연산 후 시간 수치만 반환합니다.
 */
export async function getAnnualGoalProgress(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('activities')
    .select('start_time, end_time')
    .eq('user_id', userData.user.id)
    .gte('start_time', startDate)
    .lte('end_time', endDate)
    .is('deleted_at', null)

  if (error) throw new Error(error.message)

  let totalMins = 0
  ;(data || []).forEach((act: any) => {
    const start = new Date(act.start_time).getTime()
    const end = new Date(act.end_time).getTime()
    totalMins += (end - start) / 60000
  })

  const hours = Math.round(totalMins / 60)
  const GOAL_HOURS = 1000
  const percent = Math.min(Math.round((hours / GOAL_HOURS) * 100), 100)

  return { hours, percent }
}
