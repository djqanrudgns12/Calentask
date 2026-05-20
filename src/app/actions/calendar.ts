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
  deleted_at: string | null
  categories: Category[]
}

export type Category = {
  id: string
  user_id: string
  name: string
  hex_color: string
  is_default: boolean
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
    .gte('start_time', startDate)
    .lte('end_time', endDate)
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

// ������ ���� (�ϰ� ���� ����)
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
