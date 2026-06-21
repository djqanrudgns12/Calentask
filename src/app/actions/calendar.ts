/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncActivityToGoogle, deleteActivityFromGoogle } from '@/lib/google-calendar'

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
  
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      activity_category_map(
        categories(*)
      )
    `)
    .or(`and(start_time.lte.${endDate},end_time.gte.${startDate},deleted_at.is.null),and(recurrence_rule.not.is.null,deleted_at.is.null),and(parent_activity_id.not.is.null,deleted_at.is.null)`)

  if (error) throw new Error(error.message)

  // 매핑 테이블 구조를 평탄화 (Flatten)
  const activities: Activity[] = data.map((item: any) => ({
    ...item,
    categories: item.activity_category_map
      .map((mapItem: any) => mapItem.categories)
      .filter(Boolean)
  }))

  return activities
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

  // Google Calendar 동기화 (에러 발생 시에도 메인 흐름 중단 안 함)
  try {
    // 카테고리 객체 배열을 조회하여 전달 (색상/프라이버시/그룹 매핑에 필요)
    let categoryObjects: any[] = []
    if (categoryIds.length > 0) {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, hex_color')
        .in('id', categoryIds)
      categoryObjects = cats || []
    }
    await syncActivityToGoogle(userData.user.id, activity, categoryObjects)
  } catch (e) {
    console.error('Google Sync Error (Create):', e)
  }

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

  // Google Calendar 동기화
  try {
    // 카테고리 객체 배열을 조회하여 전달 (색상/프라이버시/그룹 매핑에 필요)
    let categoryObjects: any[] = []
    if (categoryIds.length > 0) {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, hex_color')
        .in('id', categoryIds)
      categoryObjects = cats || []
    }
    await syncActivityToGoogle(userData.user.id, activity, categoryObjects)
  } catch (e) {
    console.error('Google Sync Error (Update):', e)
  }

  revalidatePath('/')
  return activity
}

// 일정 소프트 삭제 (휴지통)
export async function deleteActivity(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('activities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // 휴지통으로 이동 시 구글 캘린더에서는 완전 삭제 (정책 반영)
  try {
    await deleteActivityFromGoogle(userData.user.id, id)
  } catch (e) {
    console.error('Google Sync Error (Soft Delete):', e)
  }

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

  const { data: activity, error } = await supabase
    .from('activities')
    .update({ deleted_at: null })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 휴지통 복구 시 구글 캘린더에 재생성 (정책 반영)
  try {
    // 해당 일정의 카테고리를 조회하여 전달 (색상/프라이버시/그룹 매핑에 필요)
    const { data: catMaps } = await supabase
      .from('activity_category_map')
      .select('categories(id, name, hex_color)')
      .eq('activity_id', id)
    const categoryObjects = catMaps?.map((m: any) => m.categories).filter(Boolean) || []
    await syncActivityToGoogle(userData.user.id, activity, categoryObjects)
  } catch (e) {
    console.error('Google Sync Error (Restore):', e)
  }

  revalidatePath('/')
  return true
}

// 휴지통 영구 삭제
export async function hardDeleteActivity(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  // 영구 삭제 시 구글 캘린더에서도 삭제 확인 사살
  try {
    await deleteActivityFromGoogle(userData.user.id, id)
  } catch (e) {
    console.error('Google Sync Error (Hard Delete):', e)
  }

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
    // 1. 부모 일정 UNTIL 설정
    const parentRRule = originalActivity.recurrence_rule || ''
    // 간단한 UNTIL 치환 (실제로는 rrule 라이브러리를 통해 하는게 안전하나, 문자열 조작으로 임시 처리)
    const untilDate = new Date(originalStartTime)
    untilDate.setUTCHours(0,0,0,0)
    const untilStr = untilDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    
    let newParentRRule = parentRRule
    if (newParentRRule.includes('UNTIL=')) {
      newParentRRule = newParentRRule.replace(/UNTIL=[^;]+/, `UNTIL=${untilStr}`)
    } else {
      newParentRRule += `;UNTIL=${untilStr}`
    }

    await supabase.from('activities').update({ recurrence_rule: newParentRRule }).eq('id', parentId)
    // 구글 동기화는 여기서 생략 (원래 부모를 업데이트 해야 함)

    // 2. 새로운 부모 일정 생성
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
    // 예외 일정으로 생성 후 삭제 처리 (해당 회차만 삭제했음을 마킹)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, activity_category_map, ...rest } = originalActivity
    await supabase.from('activities').insert({
      ...rest,
      user_id: userData.user.id,
      parent_activity_id: parentId,
      original_start_time: originalStartTime,
      deleted_at: new Date().toISOString()
    })
  } else if (editMode === 'ALL_EVENTS') {
    await deleteActivity(parentId)
  } else if (editMode === 'THIS_AND_FOLLOWING') {
    const parentRRule = originalActivity.recurrence_rule || ''
    const untilDate = new Date(originalStartTime)
    untilDate.setUTCHours(0,0,0,0)
    const untilStr = untilDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    let newParentRRule = parentRRule
    if (newParentRRule.includes('UNTIL=')) {
      newParentRRule = newParentRRule.replace(/UNTIL=[^;]+/, `UNTIL=${untilStr}`)
    } else {
      newParentRRule += `;UNTIL=${untilStr}`
    }
    await supabase.from('activities').update({ recurrence_rule: newParentRRule }).eq('id', parentId)
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

  // 기존 백그라운드 동기화 로직 제거 (클라이언트 청크 동기화로 대체됨)

  revalidatePath('/')
  return { success: true }
}

export async function forceSyncNowAction() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // Pull (구글 변경점 가져오기) 작업만 서버 액션으로 수행
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const { handleGoogleCalendarSync } = await import('@/lib/google-calendar')
    const adminClient = createAdminClient()
    await handleGoogleCalendarSync(userData.user.id, adminClient)
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
    
    return { valid: false, reason: 'api_error' }
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
