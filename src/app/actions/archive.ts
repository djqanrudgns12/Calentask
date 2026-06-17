'use server';

import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { revalidatePath } from 'next/cache';

type ArchiveTabRow = Database['public']['Tables']['archive_tabs']['Row'];
type ArchiveTabInsert = Database['public']['Tables']['archive_tabs']['Insert'];
type ArchiveTabUpdate = Database['public']['Tables']['archive_tabs']['Update'];

type NoteRow = Database['public']['Tables']['notes']['Row'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];
type NoteUpdate = Database['public']['Tables']['notes']['Update'];

export async function getArchiveTabs() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('archive_tabs')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('position', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createArchiveTab(tab: Omit<ArchiveTabInsert, 'user_id'>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('archive_tabs')
    .insert({ ...tab, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateArchiveTab(id: string, updates: ArchiveTabUpdate) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('archive_tabs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 소프트 삭제: 탭과 하위 노트를 함께 휴지통으로 이동
export async function deleteArchiveTab(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const now = new Date().toISOString();

  // 하위 노트도 함께 소프트 삭제
  await supabase
    .from('notes')
    .update({ deleted_at: now })
    .eq('tab_id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  // 탭 소프트 삭제
  const { error } = await supabase
    .from('archive_tabs')
    .update({ deleted_at: now })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getArchiveNotes(tabId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('tab_id', tabId)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (error) throw error;
  return data;
}

export async function createArchiveNote(note: Omit<NoteInsert, 'user_id'>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notes')
    .insert({ ...note, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateArchiveNote(id: string, updates: NoteUpdate) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 소프트 삭제: 노트를 휴지통으로 이동
export async function deleteArchiveNote(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ─── 휴지통 관련 함수 ───

// 삭제된 아카이브 탭 조회
export async function getDeletedArchiveTabs() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('archive_tabs')
    .select('*')
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) throw error;
  return data;
}

// 삭제된 아카이브 노트 조회 (탭이 삭제되지 않은 독립 삭제 노트만)
export async function getDeletedArchiveNotes() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notes')
    .select('*, archive_tabs!inner(name, board_type, deleted_at)')
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null);

  if (error) throw error;
  return data;
}

// 아카이브 탭 복구 (하위 노트도 함께 복구)
export async function restoreArchiveTab(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 하위 노트 복구
  await supabase
    .from('notes')
    .update({ deleted_at: null })
    .eq('tab_id', id)
    .eq('user_id', user.id);

  // 탭 복구
  const { error } = await supabase
    .from('archive_tabs')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// 아카이브 노트 복구
export async function restoreArchiveNote(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// 아카이브 탭 영구 삭제 (하위 노트도 CASCADE 또는 수동 삭제)
export async function hardDeleteArchiveTab(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 하위 노트 영구 삭제
  await supabase
    .from('notes')
    .delete()
    .eq('tab_id', id)
    .eq('user_id', user.id);

  // 탭 영구 삭제
  const { error } = await supabase
    .from('archive_tabs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// 아카이브 노트 영구 삭제
export async function hardDeleteArchiveNote(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// 아카이브 휴지통 비우기 (30일 초과 항목 자동 정리용 함수도 겸용)
export async function emptyArchiveTrash(olderThanDays?: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let tabQuery = supabase
    .from('archive_tabs')
    .select('id')
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null);

  if (olderThanDays) {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    tabQuery = tabQuery.lt('deleted_at', cutoffDate);
  }

  const { data: tabsToDelete } = await tabQuery;

  if (tabsToDelete && tabsToDelete.length > 0) {
    const tabIds = tabsToDelete.map(t => t.id);
    
    // 하위 노트 영구 삭제
    await supabase
      .from('notes')
      .delete()
      .in('tab_id', tabIds)
      .eq('user_id', user.id);

    // 탭 영구 삭제
    await supabase
      .from('archive_tabs')
      .delete()
      .in('id', tabIds)
      .eq('user_id', user.id);
  }

  // 독립적으로 삭제된 노트도 정리
  let noteQuery = supabase
    .from('notes')
    .delete()
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null);

  if (olderThanDays) {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    noteQuery = noteQuery.lt('deleted_at', cutoffDate);
  }

  await noteQuery;
}
