'use server'

import { createClient } from '@/lib/supabase/server'

export type TaskStatus = 'inbox' | 'done' | 'archive' | 'trash'

export interface AgendaSubtask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface AgendaTask {
  id: string
  user_id: string
  title: string
  memo: string | null
  deadline: string | null
  category_id: string | null
  status: TaskStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
  completed_at: string | null
  subtasks: AgendaSubtask[]
  is_calendar_registered: boolean
}

// 할 일 목록 전체 조회 (휴지통 포함)
export async function getAgendaTasks() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('agenda_tasks')
    .select(`
      *,
      subtasks:agenda_subtasks(*)
    `)
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as AgendaTask[]
}

// 할 일 생성
export async function createAgendaTask(payload: { title: string; memo?: string | null; deadline?: string | null; category_id?: string | null; subtasks?: string[] }) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data: taskData, error: taskError } = await supabase
    .from('agenda_tasks')
    .insert([{ 
      user_id: userData.user.id, 
      title: payload.title,
      memo: payload.memo || null,
      deadline: payload.deadline || null,
      category_id: payload.category_id || null,
      status: 'inbox'
    }])
    .select()
    .single()

  if (taskError) throw new Error(taskError.message)

  if (payload.subtasks && payload.subtasks.length > 0) {
    const subtaskInserts = payload.subtasks.map(title => ({
      task_id: taskData.id,
      title
    }))
    
    const { error: subtaskError } = await supabase
      .from('agenda_subtasks')
      .insert(subtaskInserts)
      
    if (subtaskError) {
      console.error('Failed to create subtasks:', subtaskError)
    }
  }

  const { data: finalData, error: finalError } = await supabase
    .from('agenda_tasks')
    .select(`
      *,
      subtasks:agenda_subtasks(*)
    `)
    .eq('id', taskData.id)
    .single()

  if (finalError) throw new Error(finalError.message)
  return finalData as AgendaTask
}

// 할 일 수정 (상태 변경 포함)
export async function updateAgendaTask(id: string, payload: Partial<Omit<AgendaTask, 'id' | 'user_id' | 'created_at' | 'subtasks'>>) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 만약 status가 trash로 변경된다면 deleted_at도 업데이트
  if (payload.status === 'trash') {
    payload.deleted_at = new Date().toISOString()
  } else if (payload.status) {
    payload.deleted_at = null
  }

  // 완료 상태에 따른 completed_at 업데이트
  if (payload.status === 'done') {
    payload.completed_at = new Date().toISOString()
  } else if (payload.status && payload.status !== 'done') {
    payload.completed_at = null
  }

  // subtasks는 조인된 테이블이므로 업데이트 페이로드에서 제거해야 합니다.
  const { subtasks, ...sanitizedPayload } = payload as any;

  const { data, error } = await supabase
    .from('agenda_tasks')
    .update({ ...sanitizedPayload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .select(`
      *,
      subtasks:agenda_subtasks(*)
    `)
    .single()

  if (error) throw new Error(error.message)
  return data as AgendaTask
}

// 할 일 영구 삭제 (하위 체크리스트도 CASCADE로 삭제됨)
export async function hardDeleteAgendaTask(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('agenda_tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userData.user.id)

  if (error) throw new Error(error.message)
  return true
}

// 하위 체크리스트 생성
export async function createAgendaSubtask(taskId: string, title: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('agenda_subtasks')
    .insert([{ task_id: taskId, title }])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as AgendaSubtask
}

// 하위 체크리스트 업데이트
export async function updateAgendaSubtask(id: string, payload: Partial<{ title: string; is_completed: boolean }>) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('agenda_subtasks')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as AgendaSubtask
}

// 하위 체크리스트 삭제
export async function deleteAgendaSubtask(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('agenda_subtasks')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  return true
}
