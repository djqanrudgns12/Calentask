/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { rrulestr } from 'rrule'
import { syncActivityToGoogle, deleteActivityFromGoogle } from '@/lib/google-calendar'
import type { GoogleEventHint } from '@/lib/google-calendar'

/**
 * 구글 반영을 응답 이후로 미룬다.
 *
 * 구글 왕복(캘린더 확인 → update/insert → 링크 저장)은 수백 ms~수 초가 걸린다.
 * 이걸 서버 액션 안에서 await 하면 사용자는 "저장" 버튼을 누르고 그만큼 기다린다.
 * DB 저장은 이미 끝났고 실패해도 되돌리지 않는 작업이므로, after()로 응답 뒤에 돌린다.
 * (Vercel 서버리스에서 일반 fire-and-forget Promise는 응답 후 동결되지만,
 *  after()는 waitUntil 기반이라 완료가 보장된다.)
 */
function afterGoogleSync(label: string, task: () => Promise<unknown>) {
  after(async () => {
    try {
      await task()
    } catch (e) {
      console.error(`Google Sync Error (${label}):`, e)
    }
  })
}

/**
 * 색상/프라이버시/그룹 매핑 계산에 필요한 카테고리 객체를 조회한다.
 *
 * after() 안에서 실행되므로 요청 스코프 클라이언트(쿠키 기반)를 쓰면 안 된다.
 * 응답이 끝난 뒤에는 세션이 유효하지 않을 수 있고, 그러면 RLS에 걸려 빈 배열이 돌아온다.
 * 카테고리가 비면 그룹 라우팅이 통째로 무시되어 모든 일정이 기본 캘린더로 몰린다.
 */
async function loadCategoryObjects(userId: string, categoryIds: string[]): Promise<any[]> {
  if (categoryIds.length === 0) return []
  const { createAdminClient } = await import('@/lib/supabase/server')
  const { data } = await createAdminClient()
    .from('categories')
    .select('id, name, hex_color')
    .eq('user_id', userId)
    .in('id', categoryIds)
  return data || []
}

/**
 * 반복 규칙(RRULE 본문)에 UNTIL을 안전하게 설정한다. rrule 라이브러리로 파싱·재직렬화하여
 * 문자열 조작/타임존 경계(KST) 오류를 피한다. 실패 시 기존 문자열 방식으로 폴백.
 * @param rruleBody "FREQ=WEEKLY;..." (RRULE: 접두사 없음)
 * @param until 이 시각(포함) 이후 발생을 제외 → 보통 "이번 회차 시작 - 1초"를 넘긴다
 */
function setRRuleUntil(rruleBody: string, until: Date): string {
  try {
    const rule = rrulestr(`RRULE:${rruleBody}`) as any
    const RRuleCtor = rule.constructor
    const newRule = new RRuleCtor({ ...rule.origOptions, until })
    // toString()이 "DTSTART:...\nRRULE:..."를 낼 수 있으므로 RRULE 라인만 추출
    const str: string = newRule.toString()
    const rruleLine = str.split('\n').find((l: string) => l.toUpperCase().startsWith('RRULE:')) || str
    return rruleLine.replace(/^RRULE:/i, '').trim()
  } catch {
    const untilStr = until.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    if (rruleBody.includes('UNTIL=')) return rruleBody.replace(/UNTIL=[^;]+/, `UNTIL=${untilStr}`)
    return rruleBody + `;UNTIL=${untilStr}`
  }
}

/**
 * 주어진 마스터 activity를 다시 조회해 Google에 재push한다(카테고리 포함).
 * 반복 스코프 편집/삭제 후 부모 마스터의 변경(UNTIL/EXDATE)을 Google에 반영하기 위함.
 */
async function resyncMasterToGoogle(supabase: any, userId: string, activityId: string) {
  try {
    const { data: activity } = await supabase.from('activities').select('*').eq('id', activityId).single()
    if (!activity) return
    const { data: catMaps } = await supabase
      .from('activity_category_map')
      .select('categories(id, name, hex_color)')
      .eq('activity_id', activityId)
    const categoryObjects = catMaps?.map((m: any) => m.categories).filter(Boolean) || []
    await syncActivityToGoogle(userId, activity, categoryObjects)
  } catch (e) {
    console.error('Google resync (master) error:', e)
  }
}

export type Activity = {
  id: string
  user_id: string
  title: string
  start_time: string
  end_time: string
  is_all_day: boolean
  memo: string | null
  type: 'EVENT' | 'TASK'
  hex_color: string | null
  template_id: string | null
  deleted_at: string | null
  categories: Category[]
  attachments: any[]
  reminders?: any[] | null
  recurrence_rule: string | null
  parent_activity_id: string | null
  original_start_time: string | null
  google_event_id?: string | null
  calendar_source?: 'activity' | 'agenda' | 'anniversary' | 'academic'
  calendar_entity_id?: string
  calendar_is_summary?: boolean
}

export type Category = {
  id: string
  user_id: string
  name: string
  hex_color: string
  is_default: boolean
}

export type CategoryPreset = {
  id: string
  user_id: string
  name: string
  category_ids: string[]
}

// 카테고리 가져오기
export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data as Category[]
}

// 카테고리 생성
export async function createCategory(name: string, hexColor: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('categories')
    .insert([
      { user_id: userData.user.id, name, hex_color: hexColor }
    ])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Category
}

// 카테고리 삭제
export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', userData.user.id) // 본인 것만 삭제 가능
    .eq('is_default', false) // 기본은 삭제 불가

  if (error) throw new Error(error.message)
  return true
}

// 카테고리 수정 (색상 변경 시 연관 일정/템플릿도 동기화)
export async function updateCategory(id: string, name: string, hexColor: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 1. 기존 카테고리의 색상 조회 (변경 전 색상 기억)
  const { data: oldCategory } = await supabase
    .from('categories')
    .select('hex_color')
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .single()

  const oldColor = oldCategory?.hex_color

  // 2. 카테고리 업데이트
  const { data, error } = await supabase
    .from('categories')
    .update({ name, hex_color: hexColor })
    .eq('id', id)
    .eq('user_id', userData.user.id) // 본인 것만 수정 가능 (기본 카테고리도 포함)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 3. 색상이 실제로 변경된 경우에만 연관 일정 동기화
  if (oldColor && oldColor !== hexColor) {
    // 이 카테고리에 연결된 모든 일정 ID 조회
    const { data: linkedActivities } = await supabase
      .from('activity_category_map')
      .select('activity_id')
      .eq('category_id', id)

    if (linkedActivities && linkedActivities.length > 0) {
      const activityIds = linkedActivities.map(a => a.activity_id)

      // 기존 카테고리 색과 동일한 hex_color를 가진 일정만 null로 초기화
      // → null이 되면 eventColor.ts에서 카테고리의 최신 색상을 런타임 참조
      // → 사용자가 직접 다른 색을 선택한 일정은 영향 받지 않음
      await supabase
        .from('activities')
        .update({ hex_color: null })
        .in('id', activityIds)
        .eq('hex_color', oldColor)

      // hex_color가 이미 null인 일정은 이미 카테고리 색을 따르므로 추가 작업 불필요
    }

    // 4. 연관 템플릿의 색상도 동기화
    // 템플릿의 hex_color가 이전 카테고리 색과 같으면 null로 초기화
    await supabase
      .from('activity_templates')
      .update({ hex_color: null })
      .eq('user_id', userData.user.id)
      .eq('hex_color', oldColor)
      .contains('category_ids', [id])
  }

  return data as Category
}

// 카테고리 프리셋 가져오기
export async function getCategoryPresets() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('category_presets')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data as CategoryPreset[]
}

// 카테고리 프리셋 생성
export async function createCategoryPreset(name: string, categoryIds: string[]) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('category_presets')
    .insert([{ user_id: userData.user.id, name, category_ids: categoryIds }])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as CategoryPreset
}

// 카테고리 프리셋 수정
export async function updateCategoryPreset(id: string, name: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('category_presets')
    .update({ name })
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as CategoryPreset
}

// 카테고리 프리셋 삭제
export async function deleteCategoryPreset(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('category_presets')
    .delete()
    .eq('id', id)
    .eq('user_id', userData.user.id)

  if (error) throw new Error(error.message)
  return true
}

// 일정 가져오기 (해당 월 기준 필터링을 위해 start, end 파라미터 사용)
export async function getActivities(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 날짜가 .or() 필터 문자열에 직접 보간되므로 형식을 사전 검증 (호출원은 모두 toISOString() 사용)
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/
  if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
    throw new Error('Invalid date range')
  }

  const { data, error } = await supabase
    .from('activities')
    .select(`
      id, title, start_time, end_time, is_all_day, memo, type, hex_color,
      template_id, deleted_at, recurrence_rule, parent_activity_id,
      original_start_time, google_event_id, attachments, reminders,
      activity_category_map(
        categories(id, name, hex_color, is_default, user_id)
      )
    `)
    // RLS 위에 이중 방어로 user_id를 명시 필터
    .eq('user_id', userData.user.id)
    // 반복(rrule) 마스터·예외 일정은 클라이언트 전개에 항상 필요하므로 날짜 범위와 무관하게 조회 (의도된 동작)
    .or(`and(start_time.lte.${endDate},end_time.gte.${startDate},deleted_at.is.null),and(recurrence_rule.not.is.null,deleted_at.is.null),and(parent_activity_id.not.is.null,deleted_at.is.null)`)

  if (error) throw new Error(error.message)

  // 매핑 테이블 구조를 평탄화 (Flatten)
  const activities: Activity[] = data.map((item: any) => ({
    ...item,
    categories: item.activity_category_map
      .map((mapItem: any) => mapItem.categories)
      .filter(Boolean)
  }))

  // 메인 캘린더 노출이 설정된 학사일정 병합 (소스에 category_id가 지정된 경우만, 읽기 전용)
  const academic = await getAcademicEventsForCalendar(supabase, startDate, endDate)

  return [...activities, ...academic]
}

// getActivities 내부 헬퍼: 소스에 카테고리가 지정된 학사일정 이벤트를 Activity 형태로 변환
async function getAcademicEventsForCalendar(supabase: any, startDate: string, endDate: string): Promise<Activity[]> {
  const fromYmd = startDate.slice(0, 10)
  const toYmd = endDate.slice(0, 10)
  const { data, error } = await supabase
    .from('academic_events')
    .select('id, event_date, title, academic_sources!inner(category_id, categories:category_id(id, name, hex_color, is_default, user_id))')
    .gte('event_date', fromYmd)
    .lte('event_date', toYmd)
    .not('academic_sources.category_id', 'is', null)

  if (error || !data) return []

  return data.map((r: any) => {
    const cat = r.academic_sources?.categories
    return {
      id: `academic:${r.id}`,
      user_id: '',
      title: r.title,
      start_time: `${r.event_date}T00:00:00`,
      end_time: `${r.event_date}T23:59:59`,
      is_all_day: true,
      memo: null,
      type: 'EVENT',
      hex_color: cat?.hex_color || '#0EA5E9',
      template_id: null,
      deleted_at: null,
      categories: cat ? [cat] : [],
      attachments: [],
      reminders: null,
      recurrence_rule: null,
      parent_activity_id: null,
      original_start_time: null,
      google_event_id: 'ACADEMIC_SHEET',
    } as Activity
  })
}

// 일정 생성
export async function createActivity(
  payload: Omit<Activity, 'id' | 'user_id' | 'deleted_at' | 'categories'>,
  categoryIds: string[]
) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 1. 일정(Activity) 생성
  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .insert([{ ...payload, user_id: userData.user.id }])
    .select()
    .single()

  if (activityError) throw new Error(activityError.message)

  // 2. 카테고리 매핑 생성
  if (categoryIds.length > 0) {
    const mappings = categoryIds.map(categoryId => ({
      activity_id: activity.id,
      category_id: categoryId
    }))
    const { error: mappingError } = await supabase
      .from('activity_category_map')
      .insert(mappings)

    if (mappingError) throw new Error(mappingError.message)
  }

  // Google Calendar 동기화는 응답 이후에 수행 (등록 체감 속도 확보)
  const userId = userData.user.id
  afterGoogleSync('Create', async () => {
    const categoryObjects = await loadCategoryObjects(userId, categoryIds)
    await syncActivityToGoogle(userId, activity, categoryObjects)
  })

  revalidatePath('/')
  return activity
}

// 일정 수정
export async function updateActivity(
  id: string,
  payload: Partial<Omit<Activity, 'id' | 'user_id' | 'deleted_at' | 'categories'>>,
  categoryIds: string[]
) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 1. 일정(Activity) 업데이트
  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .select()
    .single()

  if (activityError) throw new Error(activityError.message)

  // 2. 기존 카테고리 매핑 삭제
  const { error: deleteError } = await supabase
    .from('activity_category_map')
    .delete()
    .eq('activity_id', id)

  if (deleteError) throw new Error(deleteError.message)

  // 3. 새로운 카테고리 매핑 생성
  if (categoryIds.length > 0) {
    const mappings = categoryIds.map(categoryId => ({
      activity_id: id,
      category_id: categoryId
    }))
    const { error: mappingError } = await supabase
      .from('activity_category_map')
      .insert(mappings)

    if (mappingError) throw new Error(mappingError.message)
  }

  // Google Calendar 동기화는 응답 이후에 수행 (수정 체감 속도 확보)
  const userId = userData.user.id
  afterGoogleSync('Update', async () => {
    const categoryObjects = await loadCategoryObjects(userId, categoryIds)
    await syncActivityToGoogle(userId, activity, categoryObjects)
  })

  revalidatePath('/')
  return activity
}

// 일정 소프트 삭제 (휴지통)
export async function deleteActivity(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const userId = userData.user.id

  const { error } = await supabase
    .from('activities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  // 휴지통으로 이동 시 구글 캘린더에서는 완전 삭제 (정책 반영)
  afterGoogleSync('Soft Delete', () => deleteActivityFromGoogle(userId, id))

  revalidatePath('/')
  return true
}

// 휴지통 항목 가져오기
export async function getDeletedActivities() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Activity[]
}

// 휴지통 항목 복구하기
export async function restoreActivity(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const userId = userData.user.id

  const { data: activity, error } = await supabase
    .from('activities')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 휴지통 복구 시 구글 캘린더에 재생성 (정책 반영)
  afterGoogleSync('Restore', async () => {
    const { data: catMaps } = await supabase
      .from('activity_category_map')
      .select('categories(id, name, hex_color)')
      .eq('activity_id', id)
    const categoryObjects = catMaps?.map((m: any) => m.categories).filter(Boolean) || []
    await syncActivityToGoogle(userId, activity, categoryObjects)
  })

  revalidatePath('/')
  return true
}

// 휴지통 영구 삭제
export async function hardDeleteActivity(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const userId = userData.user.id

  // 행을 지우기 **전에** 구글 연결 정보를 확보한다.
  // 삭제 후에는 조회할 방법이 없어, 예전 구현은 커스텀 ID 추측에만 의존했고
  // 구글에서 유입된 일정(구글이 부여한 ID)은 구글 쪽에 그대로 남아 되살아났다.
  const { data: link } = await supabase
    .from('activities')
    .select('google_event_id, google_calendar_id, google_ical_uid')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  // 영구 삭제 시 구글 캘린더에서도 삭제 확인 사살
  const hint: GoogleEventHint = {
    googleEventId: link?.google_event_id ?? null,
    googleCalendarId: link?.google_calendar_id ?? null,
    googleICalUid: link?.google_ical_uid ?? null,
  }
  afterGoogleSync('Hard Delete', () => deleteActivityFromGoogle(userId, id, hint))

  revalidatePath('/')
  return true
}

// 휴지통 비우기 (전체 삭제)
export async function emptyTrash() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('user_id', userData.user.id)
    .not('deleted_at', 'is', null)

  if (error) throw new Error(error.message)
  revalidatePath('/')
  return true
}

// 통합 검색 (Spotlight Search)을 위한 전역 일정 검색
export async function searchActivities(query: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  if (!query || query.trim() === '') return []

  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      activity_category_map(
        categories(*)
      )
    `)
    .eq('user_id', userData.user.id)
    .is('deleted_at', null)
    .or(`title.ilike.%${query}%,memo.ilike.%${query}%`)
    .order('start_time', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)

  const activities: Activity[] = data.map((item: any) => ({
    ...item,
    categories: item.activity_category_map
      .map((mapItem: any) => mapItem.categories)
      .filter(Boolean)
  }))

  return activities
}

export async function hardDeleteAllActivities() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // Hard delete all activities
  const { error: actError } = await supabase
    .from('activities')
    .delete()
    .eq('user_id', userData.user.id)

  if (actError) throw new Error(actError.message)

  // Hard delete upload history as well to completely reset
  const { error: histError } = await supabase
    .from('upload_history')
    .delete()
    .eq('user_id', userData.user.id)

  if (histError) throw new Error(histError.message)
}

// 반복 일정 수정 전용 액션
export async function updateRecurringActivity(
  originalActivityId: string,
  payload: Partial<Omit<Activity, 'id' | 'user_id' | 'deleted_at' | 'categories'>>,
  categoryIds: string[],
  editMode: 'THIS_EVENT' | 'THIS_AND_FOLLOWING' | 'ALL_EVENTS',
  originalStartTime: string
) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data: originalActivity, error: fetchErr } = await supabase
    .from('activities')
    .select('*')
    .eq('id', originalActivityId)
    .single()
  
  if (fetchErr) throw new Error(fetchErr.message)

  const parentId = originalActivity.parent_activity_id || originalActivity.id

  if (editMode === 'THIS_EVENT') {
    // 자식 예외 일정 생성
    return await createActivity({
      ...payload,
      parent_activity_id: parentId,
      original_start_time: originalStartTime,
    } as any, categoryIds)
  } 
  
  if (editMode === 'ALL_EVENTS') {
    // 부모 자체 수정
    return await updateActivity(parentId, payload, categoryIds)
  }

  if (editMode === 'THIS_AND_FOLLOWING') {
    // 1. 부모 일정 UNTIL 설정 (이번 회차 직전까지만 유지) — rrule 라이브러리로 안전하게 처리
    const parentRRule = originalActivity.recurrence_rule || ''
    const until = new Date(new Date(originalStartTime).getTime() - 1000) // 이번 회차 시작 - 1초
    const newParentRRule = setRRuleUntil(parentRRule, until)

    await supabase.from('activities').update({ recurrence_rule: newParentRRule }).eq('id', parentId)
    // 잘린 부모 마스터를 Google에 반영
    await resyncMasterToGoogle(supabase, userData.user.id, parentId)

    // 2. 새로운 부모 일정 생성 (createActivity 내부에서 Google push 수행)
    return await createActivity({
      ...payload,
      parent_activity_id: null,
      original_start_time: null,
    } as any, categoryIds)
  }
}

// 반복 일정 삭제 전용 액션
export async function deleteRecurringActivity(
  originalActivityId: string,
  editMode: 'THIS_EVENT' | 'THIS_AND_FOLLOWING' | 'ALL_EVENTS',
  originalStartTime: string
) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data: originalActivity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', originalActivityId)
    .single()
  
  if (!originalActivity) return

  const parentId = originalActivity.parent_activity_id || originalActivity.id

  if (editMode === 'THIS_EVENT') {
    // 예외 일정으로 생성 후 삭제 처리 (해당 회차만 삭제했음을 마킹 = 로컬 EXDATE 표현)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, activity_category_map, ...rest } = originalActivity
    await supabase.from('activities').insert({
      ...rest,
      user_id: userData.user.id,
      parent_activity_id: parentId,
      original_start_time: originalStartTime,
      // 자식 예외는 자체 반복/구글 이벤트를 갖지 않음(마스터 값 복사 방지)
      recurrence_rule: null,
      google_event_id: null,
      deleted_at: new Date().toISOString()
    })
    // 마스터를 재push → mapActivityToGoogleEvent가 이 회차를 EXDATE로 제외 (Google에서도 사라짐)
    await resyncMasterToGoogle(supabase, userData.user.id, parentId)
  } else if (editMode === 'ALL_EVENTS') {
    await deleteActivity(parentId)
  } else if (editMode === 'THIS_AND_FOLLOWING') {
    const parentRRule = originalActivity.recurrence_rule || ''
    const until = new Date(new Date(originalStartTime).getTime() - 1000) // 이번 회차 시작 - 1초
    const newParentRRule = setRRuleUntil(parentRRule, until)
    await supabase.from('activities').update({ recurrence_rule: newParentRRule }).eq('id', parentId)
    // 잘린 부모 마스터를 Google에 반영
    await resyncMasterToGoogle(supabase, userData.user.id, parentId)
  }

  revalidatePath('/')
}

// 구글 캘린더 관련 액션
export async function getGoogleCalendarListAction() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { fetchGoogleCalendars } = await import('@/lib/google-calendar')
  return await fetchGoogleCalendars(userData.user.id)
}

export async function startGoogleSyncAction(calendarId?: string, calendarName?: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')
  
  if (calendarId && calendarName) {
    await supabase.from('users').update({
      google_sync_calendar_id: calendarId,
      google_sync_calendar_name: calendarName
    }).eq('id', userData.user.id)
  } else {
    // 간편 동기화의 경우 명시적으로 null 처리하여 Calentask 캘린더 생성 유도
    await supabase.from('users').update({
      google_sync_calendar_id: null,
      google_sync_calendar_name: null
    }).eq('id', userData.user.id)
  }

  // Watch API 활성화: 구글 캘린더 변경사항 실시간 수신 설정
  try {
    const { watchGoogleCalendar } = await import('@/lib/google-calendar')
    await watchGoogleCalendar(userData.user.id)
  } catch (watchError) {
    console.error('Failed to set up Google Calendar watch:', watchError)
    // Watch 실패해도 동기화 자체는 계속 진행
  }

  revalidatePath('/')
  return { success: true }
}

export async function forceSyncNowAction() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // Pull (구글 변경점 가져오기) 작업
  try {
    const { watchGoogleCalendar } = await import('@/lib/google-calendar')

    // watchGoogleCalendar는 멱등하다: 누락/만료 임박 채널(기본+모든 그룹 매핑 캘린더)만
    // 재구독하고, 마지막에 pull 동기화(handleGoogleCalendarSync)까지 수행한다.
    // 따라서 "지금 동기화" 버튼 한 번으로 매핑 캘린더 watch 누락도 즉시 복구된다.
    await watchGoogleCalendar(userData.user.id)
  } catch (error) {
    console.error('Failed to handle google calendar pull sync:', error)
  }

  return { success: true }
}

export async function verifyGoogleTokenAction() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { valid: false, reason: 'unauthenticated' }

  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const { getGoogleAuthClient } = await import('@/lib/google-calendar')
    const { google } = await import('googleapis')
    
    const adminClient = createAdminClient()
    const auth = await getGoogleAuthClient(userData.user.id, adminClient)
    
    if (!auth) {
      return { valid: false, reason: 'missing_token' }
    }

    const calendar = google.calendar({ version: 'v3', auth })
    // 가벼운 API 호출로 토큰 유효성 검증
    await calendar.calendarList.list({ maxResults: 1 })

    return { valid: true }
  } catch (error: any) {
    console.error('verifyGoogleTokenAction error:', error.message)
    
    // 권한이 해제되었거나 토큰이 유효하지 않은 경우 DB 정리
    if (error.message?.includes('invalid_grant') || error.message?.includes('invalid credentials')) {
      const { createAdminClient } = await import('@/lib/supabase/server')
      const adminClient = createAdminClient()
      
      await adminClient.from('users').update({
        google_refresh_token: null,
        google_channel_id: null,
        google_resource_id: null,
        google_sync_token: null,
        google_sync_calendar_id: null,
        google_sync_calendar_name: null
      }).eq('id', userData.user.id)

      return { valid: false, reason: 'revoked' }
    }
    
    return { success: false, error: 'Unknown error' }
  }
}

export async function forceSyncActivityAction(activityId: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 활동 상세 정보 조회
  const { data: activity, error } = await supabase
    .from('activities')
    .select(`
      *,
      activity_category_map(
        categories(id, name, hex_color)
      )
    `)
    .eq('id', activityId)
    .eq('user_id', userData.user.id)
    .single()

  if (error || !activity) throw new Error('Activity not found')

  const categories = activity.activity_category_map
    ?.map((m: any) => m.categories)
    .filter(Boolean) || []

  try {
    const { syncActivityToGoogle } = await import('@/lib/google-calendar')
    await syncActivityToGoogle(userData.user.id, activity, categories)
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    console.error('Manual Sync Error:', e)
    return { success: false, error: e.message }
  }
}

export async function getGoogleSyncSettingsAction() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('users')
    .select('google_sync_settings')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data.google_sync_settings || {}
}

export async function updateGoogleSyncSettingsAction(settings: any) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('users')
    .update({ google_sync_settings: settings })
    .eq('id', user.id)

  if (error) throw error

  // 그룹 매핑이 변경되면 새로 매핑된 구글 캘린더에도 watch 채널을 등록해야
  // 해당 캘린더에서의 추가/수정이 Calentask로 실시간 역방향 동기화됩니다.
  // 동기화가 활성 상태일 때만(연동/동기화 캘린더 존재) 재등록합니다.
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()
    const { data: userRow } = await adminClient
      .from('users')
      .select('is_google_linked, google_sync_calendar_id, google_refresh_token')
      .eq('id', user.id)
      .single()

    if (userRow?.google_refresh_token && (userRow?.is_google_linked || userRow?.google_sync_calendar_id)) {
      const { watchGoogleCalendar } = await import('@/lib/google-calendar')
      await watchGoogleCalendar(user.id)
    }
  } catch (watchErr) {
    console.error('Failed to re-register watch after settings update:', watchErr)
    // watch 재등록 실패해도 설정 저장 자체는 성공 처리
  }

  return { success: true }
}

export async function clearGoogleSyncDataAction() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { clearSyncedActivitiesFromGoogle } = await import('@/lib/google-calendar')
  const result = await clearSyncedActivitiesFromGoogle(user.id)
  
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to clear sync data')
  }
  
  return result
}

export async function createGoogleCalendarAction(name: string) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { createGoogleCalendar } = await import('@/lib/google-calendar')
  const result = await createGoogleCalendar(user.id, name)

  if (!result) throw new Error('Failed to create Google Calendar')
  return result
}

export async function updateGoogleCalendarMetaAction(calendarId: string, summary?: string, backgroundColor?: string) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { updateGoogleCalendarMeta } = await import('@/lib/google-calendar')
  const result = await updateGoogleCalendarMeta(user.id, calendarId, summary, backgroundColor)
  
  if (!result) throw new Error('Failed to update Google Calendar meta')
  return { success: true }
}

export async function deleteGoogleCalendarAction(calendarId: string) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { deleteGoogleCalendar } = await import('@/lib/google-calendar')
  const result = await deleteGoogleCalendar(user.id, calendarId)
  
  if (!result) throw new Error('Failed to delete Google Calendar')
  return { success: true }
}

export async function migrateActivitiesBetweenCalendarsAction(categoryId: string, oldCalendarId: string, newCalendarId: string) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { migrateCategoryActivitiesToCalendar } = await import('@/lib/google-calendar')
  const result = await migrateCategoryActivitiesToCalendar(user.id, categoryId, oldCalendarId, newCalendarId)
  
  if (!result?.success) throw new Error('Failed to migrate activities')
  return result
}

export async function getSyncHistoryAction() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('sync_history')
    .select('*')
    .eq('user_id', user.id)
    .order('synced_at', { ascending: false })
    .limit(500) // 500개 제한

  if (error) throw error
  return data
}

export async function clearSyncHistoryAction(ids?: string[]) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let query = supabase.from('sync_history').delete().eq('user_id', user.id)
  if (ids && ids.length > 0) {
    query = query.in('id', ids)
  }

  const { error } = await query
  if (error) throw error
  return { success: true }
}

export async function cleanupSyncHistoryAction() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180)

  const { error } = await supabase
    .from('sync_history')
    .delete()
    .eq('user_id', user.id)
    .lt('synced_at', sixMonthsAgo.toISOString())

  if (error) throw error
  return { success: true }
}

export async function deleteGoogleEventAction(activityId: string) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { deleteActivityFromGoogle } = await import('@/lib/google-calendar')
  await deleteActivityFromGoogle(user.id, activityId)
  return { success: true }
}

export async function unlinkGoogleEventAction(activityId: string) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('activities')
    .update({ google_event_id: null })
    .eq('id', activityId)
    .eq('user_id', user.id)

  if (error) throw error
  return { success: true }
}

export async function getSyncedActivitiesTreeAction() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Fetch user settings
  const { data: userData } = await supabase
    .from('users')
    .select('google_sync_calendar_id, google_sync_calendar_name, google_sync_settings')
    .eq('id', user.id)
    .single()

  if (!userData) throw new Error('User not found')

  const defaultCalId = userData.google_sync_calendar_id || 'primary'
  const defaultCalName = userData.google_sync_calendar_name || '기본 캘린더'
  const settings = userData.google_sync_settings || {}
  const groupMapping = settings.groupMapping || {}

  // 2. Fetch categories
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, color')
    .eq('user_id', user.id)

  const categoryMap = new Map()
  if (categoriesData) {
    categoriesData.forEach(c => categoryMap.set(c.id, c))
  }

  // 3. Fetch activities with google_event_id NOT NULL and their category mappings
  const { data: activitiesData, error } = await supabase
    .from('activities')
    .select(`
      id, title, start_time, google_event_id,
      activity_category_map ( category_id )
    `)
    .eq('user_id', user.id)
    .not('google_event_id', 'is', null)
    .is('deleted_at', null)

  if (error) throw error

  // 4. Build Tree
  const tree: any = {}

  for (const act of (activitiesData || [])) {
    let catId = 'uncategorized'
    if (act.activity_category_map && act.activity_category_map.length > 0) {
      catId = act.activity_category_map[0].category_id
    }

    const calId = groupMapping[catId] || defaultCalId
    
    if (!tree[calId]) {
      // Find calendar name if possible (we don't have full calendar list here, so we use placeholder or default)
      // Ideally, we'd fetch calendar list, but for now we use default if it's the default cal.
      const calName = calId === defaultCalId ? defaultCalName : (calId.split('@')[0] || calId)
      tree[calId] = {
        calendarName: calName,
        calendarColor: 'bg-emerald-500', // Default color, can be mapped if stored
        categories: {}
      }
    }

    if (!tree[calId].categories[catId]) {
      const catInfo = categoryMap.get(catId)
      tree[calId].categories[catId] = {
        categoryName: catInfo ? catInfo.name : '미분류',
        activities: []
      }
    }

    tree[calId].categories[catId].activities.push({
      id: act.id,
      title: act.title,
      startTime: act.start_time,
      googleEventId: act.google_event_id
    })
  }

  return tree
}

export async function getCleanedSyncTimelineAction() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('sync_history')
    .select('*')
    .eq('user_id', user.id)
    .order('synced_at', { ascending: false })
    .limit(200)

  if (error) throw error

  // 정제 로직
  return (data || []).map(log => {
    let title = log.activity_title || '동기화 이벤트'
    let icon = '🔄'
    let type = 'UPDATE'
    let isError = log.action === 'ERROR' || log.action === 'FAILED'
    let message = log.error_message || ''

    if (log.action === 'BATCH_SYNC') {
      icon = '✨'
      type = 'BATCH'
      title = '일괄 동기화 완료'
      const match = (log.activity_title || '').match(/(\d+)건 생성, (\d+)건 업데이트, (\d+)건 실패/)
      if (match) {
        const [_, created, updated, failed] = match
        message = `총 ${parseInt(created) + parseInt(updated)}건 정상 처리됨`
        if (parseInt(failed) > 0) {
          message += ` (${failed}건 실패)`
          isError = true
        }
      } else {
        message = log.activity_title
      }
    } else if (log.action === 'CREATED') {
      icon = '➕'
      type = 'CREATE'
      title = `새로운 연동: ${log.activity_title}`
    } else if (log.action === 'DELETED') {
      icon = '🗑️'
      type = 'DELETE'
      title = `연동 해제: ${log.activity_title}`
    } else if (isError) {
      icon = '❌'
      title = `연동 실패: ${log.activity_title || '알 수 없는 오류'}`
    }

    return {
      id: log.id,
      syncedAt: log.synced_at,
      icon,
      type,
      title,
      message,
      isError,
      rawAction: log.action
    }
  })
}


// 분류 대기 중인 일정 가져오기
export async function getPendingActivities() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('activities')
    .select(`
      id, title, start_time, end_time, is_all_day, memo, type, google_event_id,
      activity_category_map(category_id)
    `)
    .eq('user_id', userData.user.id)
    .not('google_event_id', 'is', null)
    .is('deleted_at', null)
    .order('start_time', { ascending: true })

  if (error) throw new Error(error.message)

  // 카테고리가 없는 항목만 필터링
  const pending = data.filter((item: any) => !item.activity_category_map || item.activity_category_map.length === 0)
  
  return pending as unknown as Activity[]
}

// 분류 대기 중인 일정에 카테고리 할당하기
export async function assignCategoryToPendingActivity(activityId: string, categoryId: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error: mappingError } = await supabase
    .from('activity_category_map')
    .insert({ activity_id: activityId, category_id: categoryId })

  if (mappingError) throw new Error(mappingError.message)

  return true
}


