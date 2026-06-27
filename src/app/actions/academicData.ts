'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  extractSheetIdGid,
  toCsvExportUrl,
  fetchSheetCsv,
  parseAcademicSheet,
  applyExclusions,
  normalizeTitle,
  dedupHash,
  type ParsedEvent,
  type SheetKind,
} from '@/lib/academicParser'
import type { Activity, Category } from '@/app/actions/calendar'

const ACADEMIC_DEFAULT_COLOR = '#0EA5E9' // sky-500

export type AcademicSource = {
  id: string
  user_id: string
  url: string
  gid: string | null
  sheet_kind: SheetKind
  label: string | null
  year: number
  category_id: string | null
  last_parser: string | null
  event_count: number
  last_synced_at: string | null
  enabled: boolean
  created_at: string
  category?: { id: string; name: string; hex_color: string } | null
}

export type AcademicEventRow = {
  id: string
  source_id: string
  event_date: string
  title: string
  created_at: string
  source_label?: string | null
}

export type AnalyzePreview = {
  sheetId: string
  gid: string | null
  kind: SheetKind
  parser: 'rule' | 'llm'
  toAdd: ParsedEvent[]                                  // 신규(중복 아님) — 등록 예정
  crossDuplicates: ParsedEvent[]                        // 다른 소스에 이미 존재
  excluded: { event: ParsedEvent; keyword: string }[]   // 제외 키워드로 걸러짐
}

export type ResyncPreview = {
  added: ParsedEvent[]
  crossDuplicates: ParsedEvent[]
  unchanged: ParsedEvent[]
  removed: AcademicEventRow[]
}

// ── 내부 유틸 ──
async function getAuthed() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')
  return { supabase, userId: userData.user.id }
}

async function getKeywords(supabase: any, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('academic_exclusion_rules')
    .select('keyword')
    .eq('user_id', userId)
  return (data || []).map((r: any) => r.keyword)
}

// 주어진 dedup_hash 목록 중 이미 DB에 존재하는 해시 집합(특정 소스 제외 가능)
async function existingHashSet(
  supabase: any,
  userId: string,
  hashes: string[],
  excludeSourceId?: string
): Promise<Set<string>> {
  if (hashes.length === 0) return new Set()
  let q = supabase
    .from('academic_events')
    .select('dedup_hash, source_id')
    .eq('user_id', userId)
    .in('dedup_hash', hashes)
  if (excludeSourceId) q = q.neq('source_id', excludeSourceId)
  const { data } = await q
  return new Set((data || []).map((r: any) => r.dedup_hash))
}

function csvUrlFromSource(url: string, gid: string | null): string {
  const { sheetId, gid: urlGid } = extractSheetIdGid(url)
  if (!sheetId) throw new Error('유효한 구글 시트 링크가 아닙니다.')
  return toCsvExportUrl(sheetId, gid || urlGid)
}

// ── 1. 분석(미리보기, DB 미저장) ──
export async function analyzeAcademicSheet(
  url: string,
  year: number,
  kindHint?: SheetKind
): Promise<AnalyzePreview> {
  const { supabase, userId } = await getAuthed()
  const { sheetId, gid } = extractSheetIdGid(url)
  if (!sheetId) throw new Error('유효한 구글 시트 링크가 아닙니다. 링크를 다시 확인해 주세요.')

  const csv = await fetchSheetCsv(toCsvExportUrl(sheetId, gid))
  const { events, parser, kind } = await parseAcademicSheet(csv, year, kindHint)
  if (events.length === 0) {
    throw new Error('시트에서 일정을 찾지 못했습니다. 시트 형식 또는 gid를 확인해 주세요.')
  }

  const keywords = await getKeywords(supabase, userId)
  const { kept, excluded } = applyExclusions(events, keywords)

  // 타 소스 중복 판정
  const hashes = kept.map((e) => dedupHash(e.date, normalizeTitle(e.title)))
  const existing = await existingHashSet(supabase, userId, hashes)
  const toAdd: ParsedEvent[] = []
  const crossDuplicates: ParsedEvent[] = []
  kept.forEach((e, i) => (existing.has(hashes[i]) ? crossDuplicates.push(e) : toAdd.push(e)))

  return { sheetId, gid, kind, parser, toAdd, crossDuplicates, excluded }
}

// ── 2. 등록(소스 생성 + 이벤트 저장) ──
export async function registerAcademicSource(input: {
  url: string
  year: number
  label?: string
  kindHint?: SheetKind
}): Promise<{ sourceId: string; addedCount: number; crossDupCount: number; excludedCount: number }> {
  const { supabase, userId } = await getAuthed()
  const { sheetId, gid } = extractSheetIdGid(input.url)
  if (!sheetId) throw new Error('유효한 구글 시트 링크가 아닙니다.')

  const csv = await fetchSheetCsv(toCsvExportUrl(sheetId, gid))
  const { events, parser, kind } = await parseAcademicSheet(csv, input.year, input.kindHint)
  if (events.length === 0) throw new Error('시트에서 일정을 찾지 못했습니다.')

  const keywords = await getKeywords(supabase, userId)
  const { kept, excluded } = applyExclusions(events, keywords)

  // 소스 레코드 생성
  const { data: source, error: srcErr } = await supabase
    .from('academic_sources')
    .insert([
      {
        user_id: userId,
        url: input.url,
        gid: gid,
        sheet_kind: kind,
        label: input.label?.trim() || null,
        year: input.year,
        last_parser: parser,
        event_count: 0,
        last_synced_at: new Date().toISOString(),
      },
    ])
    .select('id')
    .single()
  if (srcErr) throw new Error(`소스 생성 실패: ${srcErr.message}`)
  const sourceId = source.id

  // 타 소스 중복 제외
  const hashes = kept.map((e) => dedupHash(e.date, normalizeTitle(e.title)))
  const existing = await existingHashSet(supabase, userId, hashes)
  const toInsert = kept.filter((_, i) => !existing.has(hashes[i]))
  const crossDupCount = kept.length - toInsert.length

  let addedCount = 0
  if (toInsert.length > 0) {
    const rows = toInsert.map((e) => {
      const norm = normalizeTitle(e.title)
      return {
        user_id: userId,
        source_id: sourceId,
        event_date: e.date,
        title: e.title,
        norm_title: norm,
        dedup_hash: dedupHash(e.date, norm),
      }
    })
    const { data: inserted, error: insErr } = await supabase
      .from('academic_events')
      .insert(rows)
      .select('id')
    if (insErr) throw new Error(`이벤트 저장 실패: ${insErr.message}`)
    addedCount = inserted?.length || 0
  }

  await supabase.from('academic_sources').update({ event_count: addedCount }).eq('id', sourceId)

  revalidatePath('/')
  return { sourceId, addedCount, crossDupCount, excludedCount: excluded.length }
}

// ── 3. 재동기화 미리보기(DB 미저장) ──
export async function resyncAcademicSource(sourceId: string): Promise<ResyncPreview> {
  const { supabase, userId } = await getAuthed()
  const { data: source, error } = await supabase
    .from('academic_sources')
    .select('*')
    .eq('id', sourceId)
    .eq('user_id', userId)
    .single()
  if (error || !source) throw new Error('소스를 찾을 수 없습니다.')

  const csv = await fetchSheetCsv(csvUrlFromSource(source.url, source.gid))
  const { events } = await parseAcademicSheet(csv, source.year, source.sheet_kind)
  const keywords = await getKeywords(supabase, userId)
  const { kept } = applyExclusions(events, keywords)

  // 기존 이벤트(이 소스)
  const { data: existingRows } = await supabase
    .from('academic_events')
    .select('id, event_date, title, norm_title, dedup_hash, created_at, source_id')
    .eq('user_id', userId)
    .eq('source_id', sourceId)

  const existingByKey = new Map<string, any>()
  for (const r of existingRows || []) existingByKey.set(`${r.event_date}|${r.norm_title}`, r)

  const newKeys = new Set<string>()
  const added: ParsedEvent[] = []
  const unchanged: ParsedEvent[] = []
  const crossDuplicates: ParsedEvent[] = []

  // 타 소스 중복 판정용
  const newHashes = kept.map((e) => dedupHash(e.date, normalizeTitle(e.title)))
  const otherSourceHashes = await existingHashSet(supabase, userId, newHashes, sourceId)

  kept.forEach((e, i) => {
    const key = `${e.date}|${normalizeTitle(e.title)}`
    newKeys.add(key)
    if (existingByKey.has(key)) {
      unchanged.push(e)
    } else if (otherSourceHashes.has(newHashes[i])) {
      crossDuplicates.push(e)
    } else {
      added.push(e)
    }
  })

  const removed: AcademicEventRow[] = (existingRows || [])
    .filter((r: any) => !newKeys.has(`${r.event_date}|${r.norm_title}`))
    .map((r: any) => ({ id: r.id, source_id: r.source_id, event_date: r.event_date, title: r.title, created_at: r.created_at }))

  return { added, crossDuplicates, unchanged, removed }
}

// ── 4. 재동기화 적용(서버 재계산 후 커밋) ──
export async function applyResyncAcademicSource(
  sourceId: string
): Promise<{ addedCount: number; removedCount: number }> {
  const { supabase, userId } = await getAuthed()
  const preview = await resyncAcademicSource(sourceId)

  // 추가
  let addedCount = 0
  if (preview.added.length > 0) {
    const rows = preview.added.map((e) => {
      const norm = normalizeTitle(e.title)
      return {
        user_id: userId,
        source_id: sourceId,
        event_date: e.date,
        title: e.title,
        norm_title: norm,
        dedup_hash: dedupHash(e.date, norm),
      }
    })
    const { data: inserted, error: insErr } = await supabase
      .from('academic_events')
      .insert(rows)
      .select('id')
    if (insErr) throw new Error(`추가 실패: ${insErr.message}`)
    addedCount = inserted?.length || 0
  }

  // 삭제
  let removedCount = 0
  if (preview.removed.length > 0) {
    const ids = preview.removed.map((r) => r.id)
    const { error: delErr } = await supabase
      .from('academic_events')
      .delete()
      .in('id', ids)
      .eq('user_id', userId)
      .eq('source_id', sourceId)
    if (delErr) throw new Error(`삭제 실패: ${delErr.message}`)
    removedCount = ids.length
  }

  // 카운트/시각 갱신
  const { count } = await supabase
    .from('academic_events')
    .select('id', { count: 'exact', head: true })
    .eq('source_id', sourceId)
  await supabase
    .from('academic_sources')
    .update({ event_count: count || 0, last_synced_at: new Date().toISOString() })
    .eq('id', sourceId)

  revalidatePath('/')
  return { addedCount, removedCount }
}

// ── 소스 목록 ──
export async function getAcademicSources(): Promise<AcademicSource[]> {
  const { supabase, userId } = await getAuthed()
  const { data, error } = await supabase
    .from('academic_sources')
    .select('*, categories:category_id(id, name, hex_color)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map((r: any) => ({ ...r, category: r.categories || null }))
}

// ── 소스 수정(별칭/연도/메인 노출 카테고리) ──
export async function updateAcademicSource(
  sourceId: string,
  patch: { label?: string | null; category_id?: string | null; year?: number }
): Promise<{ success: true }> {
  const { supabase, userId } = await getAuthed()
  const { error } = await supabase
    .from('academic_sources')
    .update(patch)
    .eq('id', sourceId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  return { success: true }
}

// ── 소스 연결 해제(이벤트 cascade 삭제) ──
export async function deleteAcademicSource(sourceId: string): Promise<{ success: true }> {
  const { supabase, userId } = await getAuthed()
  const { error } = await supabase
    .from('academic_sources')
    .delete()
    .eq('id', sourceId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  return { success: true }
}

// ── 달력용 이벤트 조회 (Activity 호환) ──
export async function getAcademicEvents(fromYmd: string, toYmd: string): Promise<Activity[]> {
  const { supabase, userId } = await getAuthed()
  const { data, error } = await supabase
    .from('academic_events')
    .select('id, event_date, title, source_id, academic_sources!inner(label, category_id, categories:category_id(name, hex_color))')
    .eq('user_id', userId)
    .gte('event_date', fromYmd)
    .lte('event_date', toYmd)
    .order('event_date', { ascending: true })
  if (error) throw new Error(error.message)

  return (data || []).map((r: any) => {
    const cat = r.academic_sources?.categories
    const color = cat?.hex_color || ACADEMIC_DEFAULT_COLOR
    const categoryName = cat?.name || '학사일정'
    const category: Category = {
      id: `academic_src_${r.source_id}`,
      user_id: userId,
      name: categoryName,
      hex_color: color,
      is_default: false,
    }
    return {
      id: `academic:${r.id}`,
      user_id: userId,
      title: r.title,
      start_time: `${r.event_date}T00:00:00`,
      end_time: `${r.event_date}T23:59:59`,
      is_all_day: true,
      memo: null,
      type: 'EVENT',
      hex_color: color,
      template_id: null,
      deleted_at: null,
      categories: [category],
      attachments: [],
      reminders: null,
      recurrence_rule: null,
      parent_activity_id: null,
      original_start_time: null,
      google_event_id: 'ACADEMIC_SHEET',
    } as Activity
  })
}

// ── 데이터 센터: 검색/필터 ──
export async function searchAcademicEvents(params: {
  query?: string
  sourceId?: string
  from?: string
  to?: string
}): Promise<AcademicEventRow[]> {
  const { supabase, userId } = await getAuthed()
  let q = supabase
    .from('academic_events')
    .select('id, source_id, event_date, title, created_at, academic_sources:source_id(label)')
    .eq('user_id', userId)
    .order('event_date', { ascending: true })
    .limit(1000)

  if (params.query && params.query.trim()) q = q.ilike('title', `%${params.query.trim()}%`)
  if (params.sourceId) q = q.eq('source_id', params.sourceId)
  if (params.from) q = q.gte('event_date', params.from)
  if (params.to) q = q.lte('event_date', params.to)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data || []).map((r: any) => ({
    id: r.id,
    source_id: r.source_id,
    event_date: r.event_date,
    title: r.title,
    created_at: r.created_at,
    source_label: r.academic_sources?.label || null,
  }))
}

// ── 이벤트 수정 ──
export async function updateAcademicEvent(
  id: string,
  patch: { date?: string; title?: string }
): Promise<{ success: true }> {
  const { supabase, userId } = await getAuthed()
  const { data: row, error: fErr } = await supabase
    .from('academic_events')
    .select('event_date, title')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (fErr || !row) throw new Error('이벤트를 찾을 수 없습니다.')

  const newDate = patch.date || row.event_date
  const newTitle = (patch.title ?? row.title).trim()
  if (!newTitle) throw new Error('제목은 비울 수 없습니다.')
  const norm = normalizeTitle(newTitle)

  const { error } = await supabase
    .from('academic_events')
    .update({
      event_date: newDate,
      title: newTitle,
      norm_title: norm,
      dedup_hash: dedupHash(newDate, norm),
    })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) {
    if (error.code === '23505') throw new Error('같은 소스에 동일한 날짜·제목의 일정이 이미 있습니다.')
    throw new Error(error.message)
  }
  revalidatePath('/')
  return { success: true }
}

// ── 이벤트 삭제(단건/다건) ──
export async function deleteAcademicEvents(ids: string[]): Promise<{ success: true }> {
  const { supabase, userId } = await getAuthed()
  if (ids.length === 0) return { success: true }
  const { error } = await supabase
    .from('academic_events')
    .delete()
    .in('id', ids)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  return { success: true }
}

// ── 제외 키워드 규칙 ──
export async function getExclusionRules(): Promise<{ id: string; keyword: string }[]> {
  const { supabase, userId } = await getAuthed()
  const { data, error } = await supabase
    .from('academic_exclusion_rules')
    .select('id, keyword')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function addExclusionRule(keyword: string): Promise<{ success: true }> {
  const { supabase, userId } = await getAuthed()
  const k = keyword.trim()
  if (!k) throw new Error('키워드를 입력해 주세요.')
  const { error } = await supabase
    .from('academic_exclusion_rules')
    .insert([{ user_id: userId, keyword: k }])
  if (error) {
    if (error.code === '23505') throw new Error('이미 등록된 키워드입니다.')
    throw new Error(error.message)
  }
  return { success: true }
}

export async function deleteExclusionRule(id: string): Promise<{ success: true }> {
  const { supabase, userId } = await getAuthed()
  const { error } = await supabase
    .from('academic_exclusion_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return { success: true }
}
