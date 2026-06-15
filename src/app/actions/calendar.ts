/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
    .lte('start_time', endDate)
    .gte('end_time', startDate)
    .is('deleted_at', null)

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

  revalidatePath('/')
  return activity
}

// 일정 소프트 삭제 (휴지통)
export async function deleteActivity(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('activities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
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
  const { error } = await supabase
    .from('activities')
    .update({ deleted_at: null })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/')
  return true
}

// 휴지통 영구 삭제
export async function hardDeleteActivity(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
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
