'use server'

import { createClient } from '@/lib/supabase/server'
import type { Bookmark } from '@/store/useLinkLoungeStore'

// Supabase 테이블 구조에 맞춘 타입
export interface DbBookmark {
  id: string
  user_id: string
  url: string
  title: string
  description: string | null
  image: string | null
  category: string
  icon: string | null
  created_at: string
  deleted_at: string | null
}

export interface DbCategory {
  id: string
  user_id: string
  name: string
  order_index: number
}

async function ensureCategoriesExist(supabase: any, userId: string, categories: string[]) {
  const validCategories = categories.filter(c => c && c !== '기타')
  if (validCategories.length === 0) return

  const { data: existing } = await supabase
    .from('link_lounge_categories')
    .select('name, order_index')
    .eq('user_id', userId)
    .order('order_index', { ascending: true })

  const existingNames = existing?.map((c: any) => c.name) || []
  let nextOrder = existing?.length ? existing[existing.length - 1].order_index + 1 : 0

  const newInserts = [...new Set(validCategories)]
    .filter(c => !existingNames.includes(c))
    .map(c => ({
      user_id: userId,
      name: c,
      order_index: nextOrder++
    }))

  if (newInserts.length > 0) {
    await supabase.from('link_lounge_categories').insert(newInserts)
  }
}

// ─── 카테고리 관리 ───

export async function getLinkCategories() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return ['기타']

  const { data, error } = await supabase
    .from('link_lounge_categories')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('Failed to fetch categories:', error)
    return ['기타']
  }

  const categoryNames = data.map((c) => c.name)

  // 동적으로 북마크에서 카테고리 추출 (혹시나 동기화가 누락된 경우를 대비한 안전 장치)
  const { data: bookmarkData } = await supabase
    .from('link_lounge_bookmarks')
    .select('category')
    .eq('user_id', userData.user.id)
    .is('deleted_at', null)

  if (bookmarkData) {
    const bookmarkCategories = [...new Set(bookmarkData.map((b) => b.category))]
    bookmarkCategories.forEach((cat) => {
      if (cat && cat !== '기타' && !categoryNames.includes(cat)) {
        categoryNames.push(cat)
      }
    })
  }

  if (!categoryNames.includes('기타')) {
    return [...categoryNames, '기타']
  }
  return categoryNames
}

export async function updateCategories(categories: string[]) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // 기존 카테고리 모두 삭제 후 재생성 (간단한 구현을 위해)
  await supabase
    .from('link_lounge_categories')
    .delete()
    .eq('user_id', userData.user.id)

  const inserts = categories.map((name, index) => ({
    user_id: userData.user.id,
    name,
    order_index: index,
  }))

  const { error } = await supabase
    .from('link_lounge_categories')
    .insert(inserts)

  if (error) throw new Error(error.message)
  return true
}

export async function deleteCategory(name: string, deleteLinks: boolean) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  if (deleteLinks) {
    // 카테고리에 속한 링크 휴지통으로 이동
    await supabase
      .from('link_lounge_bookmarks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userData.user.id)
      .eq('category', name)
  } else {
    // 링크를 '기타' 카테고리로 이동
    await supabase
      .from('link_lounge_bookmarks')
      .update({ category: '기타' })
      .eq('user_id', userData.user.id)
      .eq('category', name)
  }

  // 카테고리 삭제
  const { error } = await supabase
    .from('link_lounge_categories')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('name', name)

  if (error) throw new Error(error.message)
  return true
}

// ─── 북마크 관리 ───

// 변환 유틸리티 (Db -> UI)
function mapDbBookmarkToUI(dbBookmark: DbBookmark): Bookmark {
  return {
    id: dbBookmark.id,
    url: dbBookmark.url,
    title: dbBookmark.title,
    description: dbBookmark.description || '',
    image: dbBookmark.image || '',
    category: dbBookmark.category,
    icon: dbBookmark.icon || '',
    createdAt: dbBookmark.created_at,
    deletedAt: dbBookmark.deleted_at,
  }
}

export async function getLinkBookmarks() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []

  const { data, error } = await supabase
    .from('link_lounge_bookmarks')
    .select('*')
    .eq('user_id', userData.user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data.map(mapDbBookmarkToUI)
}

export async function createLinkBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'deletedAt'>) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  if (bookmark.category && bookmark.category !== '기타') {
    await ensureCategoriesExist(supabase, userData.user.id, [bookmark.category])
  }

  const { data, error } = await supabase
    .from('link_lounge_bookmarks')
    .insert([{
      user_id: userData.user.id,
      url: bookmark.url,
      title: bookmark.title,
      description: bookmark.description || null,
      image: bookmark.image || null,
      category: bookmark.category || '기타',
      icon: bookmark.icon || null,
    }])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapDbBookmarkToUI(data)
}

export async function updateLinkBookmark(id: string, updates: Partial<Omit<Bookmark, 'id' | 'createdAt' | 'deletedAt'>>) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  if (updates.category && updates.category !== '기타') {
    await ensureCategoriesExist(supabase, userData.user.id, [updates.category])
  }

  const payload: any = {}
  if (updates.url !== undefined) payload.url = updates.url
  if (updates.title !== undefined) payload.title = updates.title
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.image !== undefined) payload.image = updates.image
  if (updates.category !== undefined) payload.category = updates.category
  if (updates.icon !== undefined) payload.icon = updates.icon

  const { data, error } = await supabase
    .from('link_lounge_bookmarks')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapDbBookmarkToUI(data)
}

export async function deleteLinkBookmark(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('link_lounge_bookmarks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userData.user.id)

  if (error) throw new Error(error.message)
  return true
}

export async function getDeletedLinkBookmarks() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []

  const { data, error } = await supabase
    .from('link_lounge_bookmarks')
    .select('*')
    .eq('user_id', userData.user.id)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data.map(mapDbBookmarkToUI)
}

export async function restoreLinkBookmark(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('link_lounge_bookmarks')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('user_id', userData.user.id)

  if (error) throw new Error(error.message)
  return true
}

export async function hardDeleteLinkBookmark(id: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('link_lounge_bookmarks')
    .delete()
    .eq('id', id)
    .eq('user_id', userData.user.id)

  if (error) throw new Error(error.message)
  return true
}

export async function emptyLinkTrash() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('link_lounge_bookmarks')
    .delete()
    .eq('user_id', userData.user.id)
    .not('deleted_at', 'is', null)

  if (error) throw new Error(error.message)
  return true
}

export async function importLinkBookmarks(items: Omit<Bookmark, 'id' | 'createdAt' | 'deletedAt'>[]) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const categoriesToEnsure = items.map(item => item.category).filter(Boolean) as string[]
  if (categoriesToEnsure.length > 0) {
    await ensureCategoriesExist(supabase, userData.user.id, categoriesToEnsure)
  }

  const inserts = items.map((item) => ({
    user_id: userData.user.id,
    url: item.url,
    title: item.title,
    description: item.description || null,
    image: item.image || null,
    category: item.category || '기타',
    icon: item.icon || null,
  }))

  const { error } = await supabase
    .from('link_lounge_bookmarks')
    .insert(inserts)

  if (error) throw new Error(error.message)
  return true
}
