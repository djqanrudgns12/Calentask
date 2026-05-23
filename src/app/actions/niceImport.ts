'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type UploadHistory = {
  id: string
  user_id: string
  file_name: string
  record_type: '출장' | '근무상황'
  added_count: number
  duplicate_count: number
  created_at: string
}

export type NicePayload = {
  title: string
  start_time: string
  end_time: string
  memo: string
  is_all_day: boolean
  type: 'EVENT'
  hex_color: string | null
}

export async function processNiceImport(
  payloads: NicePayload[],
  recordType: '출장' | '근무상황',
  fileName: string
) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  if (payloads.length === 0) {
    return { success: true, addedCount: 0, dupCount: 0 }
  }

  // 1. 카테고리 조회 및 생성
  const categoryName = recordType
  const categoryColor = recordType === '출장' ? '#3B82F6' : '#F97316' // 파란색 / 주황색

  let categoryId = ''
  const { data: existingCat, error: catError } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('name', categoryName)
    .single()

  if (existingCat) {
    categoryId = existingCat.id
  } else {
    // 카테고리 생성
    const { data: newCat, error: newCatError } = await supabase
      .from('categories')
      .insert([
        { user_id: userData.user.id, name: categoryName, hex_color: categoryColor }
      ])
      .select()
      .single()
    if (newCatError) throw new Error(`Category error: ${newCatError.message}`)
    categoryId = newCat.id
  }

  // 2. 파싱된 데이터의 가장 빠른/늦은 시간 계산하여 범위 내 기존 Activity 조회
  // 정렬이나 탐색을 위해 Date 활용
  let minTime = new Date(payloads[0].start_time).getTime()
  let maxTime = new Date(payloads[0].end_time).getTime()

  for (const p of payloads) {
    const s = new Date(p.start_time).getTime()
    const e = new Date(p.end_time).getTime()
    if (s < minTime) minTime = s
    if (e > maxTime) maxTime = e
  }

  const minDateStr = new Date(minTime).toISOString()
  const maxDateStr = new Date(maxTime).toISOString()

  // 3. 기존 데이터 패치 (중복 비교용)
  const { data: existingActivities, error: fetchError } = await supabase
    .from('activities')
    .select('title, start_time, end_time')
    .eq('user_id', userData.user.id)
    .gte('start_time', minDateStr)
    .lte('end_time', maxDateStr)
    .is('deleted_at', null)

  if (fetchError) throw new Error(`Fetch existing error: ${fetchError.message}`)

  // 4. Deduplication 로직 적용
  const uniquePayloads: NicePayload[] = []
  let duplicateCount = 0

  for (const p of payloads) {
    // 동일한 일정 확인
    const isDup = existingActivities?.some(existing => 
      existing.title === p.title &&
      new Date(existing.start_time).getTime() === new Date(p.start_time).getTime() &&
      new Date(existing.end_time).getTime() === new Date(p.end_time).getTime()
    )

    if (isDup) {
      duplicateCount++
    } else {
      uniquePayloads.push(p)
    }
  }

  let addedCount = 0

  // 5. Bulk Insert
  if (uniquePayloads.length > 0) {
    // 5-1. Insert Activities
    const activitiesToInsert = uniquePayloads.map(p => ({
      user_id: userData.user!.id,
      ...p
    }))

    const { data: insertedActivities, error: insertError } = await supabase
      .from('activities')
      .insert(activitiesToInsert)
      .select('id')

    if (insertError) throw new Error(`Insert activity error: ${insertError.message}`)

    // 5-2. Map Categories
    const mappings = insertedActivities.map(act => ({
      activity_id: act.id,
      category_id: categoryId
    }))

    const { error: mappingError } = await supabase
      .from('activity_category_map')
      .insert(mappings)

    if (mappingError) throw new Error(`Mapping error: ${mappingError.message}`)

    addedCount = insertedActivities.length
  }

  // 6. 히스토리 기록
  const { error: historyError } = await supabase
    .from('upload_history')
    .insert([{
      user_id: userData.user.id,
      file_name: fileName,
      record_type: recordType,
      added_count: addedCount,
      duplicate_count: duplicateCount
    }])

  if (historyError) {
    console.error(`Failed to write upload history: ${historyError.message}`)
    // 메인 로직은 성공했으므로 에러 스로우 대신 로깅만
  }

  revalidatePath('/')

  return {
    success: true,
    addedCount,
    dupCount: duplicateCount
  }
}

export async function getUploadHistory() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('upload_history')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as UploadHistory[]
}
