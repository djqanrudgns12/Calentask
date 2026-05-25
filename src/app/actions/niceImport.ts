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
  // Phase 2: 미리보기용 추가된 일정 요약 데이터
  added_items: { title: string; start_time: string; end_time: string }[]
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
  const categoryColor = recordType === '출장' ? '#8B5CF6' : '#F97316' // 보라색 / 주황색

  let categoryId = ''
  const { data: existingCat } = await supabase
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

  // 5. 히스토리 레코드를 먼저 생성하여 ID 확보 (activities에 FK로 연결하기 위함)
  const { data: historyRecord, error: historyError } = await supabase
    .from('upload_history')
    .insert([{
      user_id: userData.user.id,
      file_name: fileName,
      record_type: recordType,
      added_count: 0,             // 임시값 — 나중에 실제 값으로 업데이트
      duplicate_count: duplicateCount,
      added_items: []             // 임시값 — 나중에 실제 값으로 업데이트
    }])
    .select('id')
    .single()

  if (historyError) {
    console.error(`Failed to write upload history: ${historyError.message}`)
    // 히스토리 생성 실패 시에도 일정 삽입은 계속 진행 (upload_history_id만 null)
  }

  const historyId = historyRecord?.id || null

  // 6. Bulk Insert (upload_history_id 포함)
  if (uniquePayloads.length > 0) {
    // 6-1. Insert Activities — upload_history_id로 어떤 업로드에서 온 일정인지 추적
    const activitiesToInsert = uniquePayloads.map(p => ({
      user_id: userData.user!.id,
      upload_history_id: historyId,
      ...p
    }))

    const { data: insertedActivities, error: insertError } = await supabase
      .from('activities')
      .insert(activitiesToInsert)
      .select('id')

    if (insertError) throw new Error(`Insert activity error: ${insertError.message}`)

    // 6-2. Map Categories
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

  // 7. 히스토리 레코드 최종 업데이트 (실제 added_count + 미리보기용 added_items)
  if (historyId) {
    // 미리보기에 필요한 최소 정보만 저장 (제목, 시작/종료 시간)
    const addedItems = uniquePayloads.map(p => ({
      title: p.title,
      start_time: p.start_time,
      end_time: p.end_time
    }))

    const { error: updateError } = await supabase
      .from('upload_history')
      .update({
        added_count: addedCount,
        added_items: addedItems
      })
      .eq('id', historyId)

    if (updateError) {
      console.error(`Failed to update upload history: ${updateError.message}`)
    }
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

/**
 * 이력만 삭제: upload_history 레코드만 제거
 * activities.upload_history_id는 ON DELETE SET NULL로 자동 NULL 처리되어
 * 캘린더의 일정은 그대로 유지됨
 */
export async function deleteUploadHistoryOnly(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('upload_history')
    .delete()
    .eq('id', id)
    .eq('user_id', userData.user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  return { success: true }
}

/**
 * 이력 + 해당 일정까지 삭제:
 * 1) 해당 upload_history_id를 가진 activities를 소프트 삭제 (deleted_at 설정 → 휴지통)
 * 2) upload_history 레코드 삭제
 * 
 * 소프트 삭제를 사용하는 이유: 실수로 삭제해도 휴지통에서 복구 가능하게 하여
 * 데이터 유실 리스크를 최소화하기 위함
 */
export async function deleteUploadHistoryWithActivities(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 1. 해당 업로드로 생성된 일정을 소프트 삭제 (휴지통으로 이동)
  const { error: actError } = await supabase
    .from('activities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('upload_history_id', id)
    .eq('user_id', userData.user.id)

  if (actError) throw new Error(`일정 삭제 실패: ${actError.message}`)

  // 2. 이력 레코드 삭제
  const { error } = await supabase
    .from('upload_history')
    .delete()
    .eq('id', id)
    .eq('user_id', userData.user.id)

  if (error) throw new Error(`이력 삭제 실패: ${error.message}`)

  revalidatePath('/')
  return { success: true }
}
