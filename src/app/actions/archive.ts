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

export async function deleteArchiveTab(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('archive_tabs')
    .delete()
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
    .eq('user_id', user.id);

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

export async function deleteArchiveNote(id: string) {
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
