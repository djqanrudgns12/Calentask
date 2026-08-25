/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from 'node:crypto'
import { google, calendar_v3 } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/server'
import pLimit from 'p-limit'
import {
  SYNC_TIME_ZONE,
  toZonedIso,
  toZonedYmd,
  toGoogleAllDayRange,
  eventTimesToUtc,
} from '@/lib/google/eventTime'
import {
  toGoogleEventId,
  fromGoogleEventId,
  fingerprintKey,
  readCalentaskTag,
} from '@/lib/google/correlation'

export { toGoogleEventId, fromGoogleEventId }

export type SyncDirection = 'TWO_WAY' | 'EXPORT_ONLY' | 'IMPORT_ONLY'
export type ConflictStrategy = 'LATEST_WINS' | 'CALENTASK_WINS' | 'GOOGLE_WINS'

export interface GoogleSyncSettings {
  direction?: SyncDirection
  conflictStrategy?: ConflictStrategy
  colorMapping?: Record<string, string>
  groupMapping?: Record<string, string>
  privacyMapping?: Record<string, boolean>
  /** 수신(가져오기) 전용으로 추가 구독할 구글 캘린더 ID 목록. */
  importCalendarIds?: string[]
  /**
   * 구글 기본(primary) 캘린더를 수신 대상에 포함할지 여부(기본 true).
   * 외부 앱이 캘린더를 따로 고르지 않으면 대개 기본 캘린더에 일정을 만들기 때문에,
   * 이 값이 false면 그렇게 만들어진 일정이 Calentask에 들어오지 못한다.
   */
  includePrimaryInImport?: boolean
}

/** 우리 push가 되돌아온 웹훅(에코)과 실제 변경을 가르는 허용 오차. */
const ECHO_GRACE_MS = 2000
/** 초기(전체) 동기화가 훑는 기간. 과거 1년 ~ 미래 2년. */
const INITIAL_WINDOW_PAST_YEARS = 1
const INITIAL_WINDOW_FUTURE_YEARS = 2
/** PostgREST `in.()` 필터의 URL 길이 폭발을 막는 청크 크기. */
const IN_FILTER_CHUNK = 200
/** 벌크 upsert 한 번에 보낼 최대 행 수. */
const UPSERT_CHUNK = 400
/** 지문 폴백 매칭 시 스캔할 최대 후보 행 수. */
const FINGERPRINT_SCAN_LIMIT = 2000

/** 델타 반영에 필요한 활동 컬럼. upsert 페이로드와 키 집합을 맞추기 위해 한곳에서 관리한다. */
const ACTIVITY_SYNC_COLUMNS =
  'id, user_id, title, memo, start_time, end_time, is_all_day, reminders, recurrence_rule, updated_at, deleted_at, google_event_id, google_calendar_id, google_ical_uid, google_synced_at'

// ─────────────────────────────────────────────────────────────
// 공용 소도구
// ─────────────────────────────────────────────────────────────

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 범용적인 Google API 에러 판별 유틸리티 */
function isGoogleError(err: any, code: number): boolean {
  if (!err) return false
  const status = err.response?.status ?? err.status ?? Number.parseInt(err.code, 10)
  if (status === code) return true

  const msg = String(err.message || '').toLowerCase()
  if (code === 404 && msg.includes('not found')) return true
  if (code === 409 && msg.includes('conflict')) return true
  if (code === 400 && msg.includes('bad request')) return true
  if (code === 410 && (msg.includes('deleted') || msg.includes('sync token'))) return true

  return false
}

/** 재시도해도 의미가 있는(일시적) 오류인지. */
function isTransientGoogleError(err: any): boolean {
  const status = err?.response?.status ?? err?.status ?? Number.parseInt(err?.code, 10)
  if (status === 403) {
    // 403은 권한 오류일 수도, rateLimitExceeded일 수도 있다. 후자만 재시도한다.
    const reason =
      err?.errors?.[0]?.reason || err?.response?.data?.error?.errors?.[0]?.reason || ''
    return /rate|quota/i.test(String(reason)) || /rate limit|quota/i.test(String(err?.message || ''))
  }
  return status === 429 || (typeof status === 'number' && status >= 500 && status < 600)
}

/**
 * 지수 백오프 재시도. Rate limit(429/403 rateLimitExceeded)과 5xx만 대상으로 하며,
 * 동시 요청이 같은 리듬으로 재시도해 다시 충돌하지 않도록 지터를 섞는다.
 */
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 4): Promise<T> {
  let attempt = 0
  for (;;) {
    try {
      return await operation()
    } catch (error: any) {
      if (attempt >= maxRetries || !isTransientGoogleError(error)) throw error
      attempt++
      await delay(2 ** attempt * 250 + Math.random() * 250)
    }
  }
}

/**
 * Helper to log sync history to the database
 */
export async function logSyncHistory(
  supabase: any,
  params: {
    userId: string
    activityId?: string
    googleEventId?: string
    calendarId: string
    calendarName?: string
    categoryId?: string
    categoryName?: string
    action: 'CREATED' | 'UPDATED' | 'DELETED' | 'MIGRATED' | 'BATCH_SYNC' | 'ERROR'
    status?: 'SUCCESS' | 'FAILED' | 'PENDING'
    activityTitle?: string
    activityStartTime?: string
    errorMessage?: string
    metadata?: any
  }
) {
  try {
    await supabase.from('sync_history').insert({
      user_id: params.userId,
      activity_id: params.activityId || null,
      google_event_id: params.googleEventId || null,
      calendar_id: params.calendarId,
      calendar_name: params.calendarName || null,
      category_id: params.categoryId || null,
      category_name: params.categoryName || null,
      action: params.action,
      status: params.status || 'SUCCESS',
      activity_title: params.activityTitle || null,
      activity_start_time: params.activityStartTime || null,
      error_message: params.errorMessage || null,
      metadata: params.metadata || {},
    })
  } catch (err) {
    console.error('Failed to log sync history:', err)
  }
}

// ─────────────────────────────────────────────────────────────
// 인증
// ─────────────────────────────────────────────────────────────

function buildOAuthClient(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // Redirect URI is not needed for backend API calls with refresh token
    `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

/**
 * Creates an authenticated Google OAuth2 client for the given user.
 * It retrieves the google_refresh_token from the users table.
 */
export async function getGoogleAuthClient(userId: string, customSupabase?: any) {
  const supabase = customSupabase || createAdminClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('google_refresh_token')
    .eq('id', userId)
    .single()

  if (error || !user?.google_refresh_token) {
    console.warn('Google refresh token not found for user', userId)
    return null
  }

  return buildOAuthClient(user.google_refresh_token)
}

// ─────────────────────────────────────────────────────────────
// 캘린더 메타데이터 (TTL 캐시)
//
// getSyncCalendarId는 일정 등록/수정마다 호출되는 뜨거운 경로다.
// 매번 calendars.get으로 왕복하면 저장 버튼 하나에 구글 왕복이 3~4회 붙는다.
// 서버리스 인스턴스 수명 동안만 유효한 짧은 TTL 캐시로 그 왕복을 없앤다.
// ─────────────────────────────────────────────────────────────

const CALENDAR_META_TTL_MS = 60_000
const calendarAliveCache = new Map<string, { at: number; alive: boolean }>()
const primaryCalendarCache = new Map<string, { at: number; id: string | null }>()

function cacheFresh(entry?: { at: number }): boolean {
  return !!entry && Date.now() - entry.at < CALENDAR_META_TTL_MS
}

/**
 * 주어진 캘린더 ID가 Google 측에 실제로 존재하는지 확인한다.
 * 404/410(없음/삭제됨)이면 false, 일시적 오류(403/429/5xx 등)는
 * 불필요한 재생성을 막기 위해 "존재함(true)"으로 간주하며 캐시하지 않는다.
 */
async function calendarExists(
  userId: string,
  calendar: calendar_v3.Calendar,
  calendarId: string
): Promise<boolean> {
  const key = `${userId}:${calendarId}`
  const cached = calendarAliveCache.get(key)
  if (cacheFresh(cached)) return cached!.alive

  try {
    await calendar.calendars.get({ calendarId })
    calendarAliveCache.set(key, { at: Date.now(), alive: true })
    return true
  } catch (err: any) {
    if (isGoogleError(err, 404) || isGoogleError(err, 410)) {
      calendarAliveCache.set(key, { at: Date.now(), alive: false })
      return false
    }
    return true
  }
}

function invalidateCalendarCache(userId: string, calendarId?: string) {
  if (calendarId) calendarAliveCache.delete(`${userId}:${calendarId}`)
  primaryCalendarCache.delete(userId)
}

/**
 * `primary` 별칭을 실제 캘린더 ID(보통 사용자 이메일)로 확정한다.
 *
 * 별칭과 실제 ID가 섞이면 같은 캘린더를 서로 다른 두 항목으로 취급해
 * 각각 별도의 syncToken으로 두 번 훑고, 같은 이벤트를 두 번 반영하게 된다.
 */
async function resolvePrimaryCalendarId(
  userId: string,
  calendar: calendar_v3.Calendar
): Promise<string | null> {
  const cached = primaryCalendarCache.get(userId)
  if (cacheFresh(cached)) return cached!.id

  try {
    const res = await withRetry(() => calendar.calendars.get({ calendarId: 'primary' }))
    const id = res.data.id || null
    primaryCalendarCache.set(userId, { at: Date.now(), id })
    return id
  } catch (err: any) {
    console.warn('Failed to resolve primary calendar id:', err.message)
    return null
  }
}

/**
 * Ensures a dedicated "Calentask" calendar exists or uses the user's custom mapped calendar.
 * Returns the calendar ID.
 */
export async function getSyncCalendarId(
  userId: string,
  auth: any,
  customSupabase?: any,
  categories: any[] = [],
  settings?: GoogleSyncSettings
): Promise<string | null> {
  const supabase = customSupabase || createAdminClient()

  // Check group mapping first
  if (settings?.groupMapping && categories.length > 0) {
    for (const cat of categories) {
      const mapped = settings.groupMapping[cat?.id]
      if (mapped) return mapped
    }
  }

  const { data: user } = await supabase
    .from('users')
    .select('google_sync_calendar_id')
    .eq('id', userId)
    .single()

  const calendar = google.calendar({ version: 'v3', auth })

  if (user?.google_sync_calendar_id) {
    // 저장된 캘린더가 실제로 살아있을 때만 신뢰. 연동 해제 후 잔존한 죽은 ID면
    // stale 값을 비우고 아래 재탐색/생성 경로로 진행한다.
    if (await calendarExists(userId, calendar, user.google_sync_calendar_id)) {
      return user.google_sync_calendar_id
    }
    await supabase
      .from('users')
      .update({ google_sync_calendar_id: null, google_sync_calendar_name: null })
      .eq('id', userId)
  }

  try {
    // Check if Calentask calendar already exists
    const calendarList = await withRetry(() => calendar.calendarList.list({ maxResults: 250 }))
    const existing = calendarList.data.items?.find(
      (item) => item.summary === 'Calentask' && !item.deleted
    )

    if (existing?.id) {
      await supabase
        .from('users')
        .update({ google_sync_calendar_id: existing.id, google_sync_calendar_name: existing.summary })
        .eq('id', userId)
      return existing.id
    }

    // Create a new calendar
    const newCalendar = await withRetry(() =>
      calendar.calendars.insert({
        requestBody: { summary: 'Calentask', description: 'Sync calendar for Calentask app' },
      })
    )

    if (newCalendar.data.id) {
      await supabase
        .from('users')
        .update({ google_sync_calendar_id: newCalendar.data.id, google_sync_calendar_name: 'Calentask' })
        .eq('id', userId)
    }

    return newCalendar.data.id || null
  } catch (error) {
    console.error('Failed to get/create Google calendar:', error)
    return null
  }
}

export interface SyncScope {
  /** Calentask 일정을 기록할 기본 캘린더. */
  writeCalendarId: string
  /** 변경분을 수신(구독/pull)할 캘린더 전체. writeCalendarId를 항상 포함한다. */
  readCalendarIds: string[]
  /**
   * Calentask가 쓰기까지 하는 캘린더.
   * 여기에 없는 캘린더는 "구독만" 하는 대상이므로 어떤 수정도 보내지 않는다.
   * (읽기 전용으로 공유받은 캘린더에 쓰려 하면 매번 403이 난다.)
   */
  writableCalendarIds: Set<string>
  /** 기존 이벤트의 현재 위치를 찾을 때 훑을 캘린더 목록(= 우리가 쓸 수 있는 곳들). */
  searchCalendarIds: string[]
  /** 확정된 기본 캘린더 ID(별칭 정규화용). */
  primaryCalendarId: string | null
}

/**
 * 이번 동기화가 다룰 캘린더 집합을 확정한다.
 *
 * 기존 구현은 쓰기 대상과 그룹 매핑 캘린더만 읽었다. 그래서 네이버 캘린더가
 * 구글 **기본 캘린더**에 일정을 기록하면 Calentask는 그 존재조차 알 수 없었다.
 * 수신 집합에 기본 캘린더와 사용자가 지정한 추가 캘린더를 포함시켜
 * "어느 캘린더를 거쳐 들어오든 잡아낸다"를 보장한다.
 */
async function resolveSyncScope(
  userId: string,
  auth: any,
  supabase: any,
  settings: GoogleSyncSettings,
  categories: any[] = []
): Promise<SyncScope | null> {
  const writeRaw = await getSyncCalendarId(userId, auth, supabase, categories, settings)
  if (!writeRaw) return null

  const calendar = google.calendar({ version: 'v3', auth })
  const primaryCalendarId = await resolvePrimaryCalendarId(userId, calendar)
  const normalize = (id: string) => (id === 'primary' ? primaryCalendarId || 'primary' : id)

  const writeCalendarId = normalize(writeRaw)

  // 쓰기 대상: 기본 쓰기 캘린더 + 카테고리 그룹 매핑 캘린더.
  // 매핑을 해제한 뒤에도 예전 목적지를 남겨 둬야 거기 있던 일정을 **옮겨 올** 수 있다.
  const writableCalendarIds = new Set<string>([writeCalendarId])
  for (const id of Object.values(settings.groupMapping || {})) {
    if (id) writableCalendarIds.add(normalize(id))
  }

  // 수신 대상: 쓰기 대상 전부 + 추가 구독 캘린더 + (기본값) 구글 기본 캘린더
  const readCalendarIds = new Set<string>(writableCalendarIds)
  for (const id of settings.importCalendarIds || []) {
    if (id) readCalendarIds.add(normalize(id))
  }
  // 외부 앱이 캘린더를 고르지 않으면 대개 기본 캘린더에 만들어지므로 기본값으로 포함한다.
  if (settings.includePrimaryInImport !== false && primaryCalendarId) {
    readCalendarIds.add(primaryCalendarId)
  }

  return {
    writeCalendarId,
    readCalendarIds: [...readCalendarIds],
    writableCalendarIds,
    searchCalendarIds: [...writableCalendarIds],
    primaryCalendarId,
  }
}

// ─────────────────────────────────────────────────────────────
// Calentask → Google 매핑
// ─────────────────────────────────────────────────────────────

/**
 * 삭제된 회차(soft-deleted 자식 예외)의 original_start_time(UTC) 목록을
 * Google recurrence 배열에 넣을 EXDATE 라인으로 변환한다.
 * - 시간 일정: EXDATE;TZID=Asia/Seoul:YYYYMMDDTHHMMSS (DTSTART와 동일한 로컬 표현)
 * - 종일 일정: EXDATE;VALUE=DATE:YYYYMMDD
 */
function buildExDateLines(exStartTimesUtc: string[], isAllDay: boolean): string[] {
  if (!exStartTimesUtc.length) return []
  if (isAllDay) {
    const dates = exStartTimesUtc.map((t) => toZonedYmd(t).replace(/-/g, ''))
    return [`EXDATE;VALUE=DATE:${dates.join(',')}`]
  }
  const dts = exStartTimesUtc.map((t) => toZonedIso(t).replace(/[-:]/g, ''))
  return [`EXDATE;TZID=${SYNC_TIME_ZONE}:${dts.join(',')}`]
}

/**
 * Google 이벤트의 recurrence 배열에서 Calentask 형식의 반복 규칙(RRULE 본문)을 추출합니다.
 * - Google: ["RRULE:FREQ=WEEKLY;BYDAY=FR", "EXDATE;...", ...]
 * - Calentask(recurrence_rule): "FREQ=WEEKLY;BYDAY=FR" (RRULE: 접두사 없음, push 시 다시 붙임)
 * 반복 일정이 아니면 null을 반환합니다.
 */
function getRecurrenceRuleFromEvent(event: any): string | null {
  if (!Array.isArray(event?.recurrence)) return null
  const rruleLine = event.recurrence.find(
    (r: string) => typeof r === 'string' && r.toUpperCase().startsWith('RRULE:')
  )
  if (!rruleLine) return null
  return rruleLine.replace(/^RRULE:/i, '').trim() || null
}

/**
 * Maps a Calentask Activity to a Google Event payload
 * @param exDatesUtc 반복 마스터일 때, 제외할 회차(삭제된 자식 예외)의 original_start_time(UTC) 목록
 */
function mapActivityToGoogleEvent(
  activity: any,
  categories: any[],
  settings?: GoogleSyncSettings,
  exDatesUtc: string[] = []
): calendar_v3.Schema$Event {
  let colorId = '9'
  if (settings?.colorMapping && categories.length > 0) {
    for (const cat of categories) {
      if (settings.colorMapping[cat?.id]) {
        colorId = settings.colorMapping[cat.id]
        break
      }
    }
  } else if (activity.hex_color) {
    colorId = '11'
  }

  const isPrivate =
    !!settings?.privacyMapping && categories.some((cat) => settings.privacyMapping?.[cat?.id])

  // 종일 일정은 타임존 달력 날짜로 환산한다.
  // Google의 end.date는 배타적이므로 마지막 점유일 + 1일이 들어간다.
  const allDayRange = activity.is_all_day
    ? toGoogleAllDayRange(activity.start_time, activity.end_time)
    : null

  const start = allDayRange
    ? { date: allDayRange.start }
    : { dateTime: toZonedIso(activity.start_time), timeZone: SYNC_TIME_ZONE }

  const end = allDayRange
    ? { date: allDayRange.end }
    : { dateTime: toZonedIso(activity.end_time), timeZone: SYNC_TIME_ZONE }

  let reminders: calendar_v3.Schema$Event['reminders'] = { useDefault: true }
  if (Array.isArray(activity.reminders) && activity.reminders.length > 0) {
    reminders = {
      useDefault: false,
      overrides: activity.reminders.map((r: any) => ({
        method: r?.method || 'popup',
        minutes: typeof r === 'number' ? r : r?.minutes ?? 30,
      })),
    }
  }

  return {
    summary: isPrivate ? '바쁨' : activity.title,
    description: isPrivate ? '' : activity.memo || '',
    visibility: isPrivate ? 'private' : 'default',
    // 외부 서비스(네이버 등)의 미러링은 confirmed 이벤트만 안정적으로 노출하므로 명시
    status: 'confirmed',
    start,
    end,
    colorId,
    reminders,
    ...(activity.recurrence_rule
      ? {
          recurrence: [
            `RRULE:${activity.recurrence_rule}`,
            ...buildExDateLines(exDatesUtc, activity.is_all_day),
          ],
        }
      : {}),
    extendedProperties: {
      private: {
        calentask_id: activity.id,
        type: activity.type,
        hex_color: activity.hex_color || '',
      },
    },
  }
}

/** 키를 정렬해 안정적으로 직렬화한다(같은 내용 → 항상 같은 문자열). */
function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
}

/**
 * "이번에 구글로 보낼 내용"의 지문.
 *
 * 마지막으로 보낸 지문과 같으면 보낼 이유가 없다. 시각 비교(updated_at vs google_synced_at)와
 * 달리 Postgres 시계와 Google 시계를 넘나들지 않으므로 여유값에 기댈 필요가 없고,
 * "바뀐 게 없다"를 확정적으로 말할 수 있다.
 * 목적지 캘린더도 포함해야 캘린더 이동이 건너뛰기로 삼켜지지 않는다.
 */
function eventPayloadHash(eventBody: calendar_v3.Schema$Event, calendarId: string): string {
  return createHash('sha256')
    .update(stableStringify({ calendarId, body: eventBody }))
    .digest('hex')
}

/** 카테고리 → 그룹 매핑 캘린더를 O(1)로 찾는다. */
function mappedCalendarFor(categories: any[], settings: GoogleSyncSettings): string | null {
  if (!settings.groupMapping) return null
  for (const cat of categories) {
    const mapped = settings.groupMapping[cat?.id]
    if (mapped) return mapped
  }
  return null
}

/**
 * 이 일정이 **있어야 할** 캘린더.
 *
 * 전적으로 사용자 설정(그룹 및 라우팅 → 기본 쓰기 캘린더)만으로 결정한다.
 * 예전 구현은 `activity.google_calendar_id`(현재 위치)를 1순위로 삼았는데,
 * 그러면 한 번 어딘가에 들어간 일정은 고급 설정을 아무리 바꿔도 그 자리에 못박혀
 * "그룹 및 라우팅이 전혀 먹지 않는" 증상이 된다. 현재 위치는 '어디서 찾을지'에만 쓴다.
 */
function desiredCalendarFor(
  categories: any[],
  settings: GoogleSyncSettings,
  scope: SyncScope
): string {
  return mappedCalendarFor(categories, settings) || scope.writeCalendarId
}

/**
 * 이벤트가 지금 어느 캘린더에 있는지 찾는다.
 *
 * 저장된 위치를 먼저 짚어 보고(대부분 1회 왕복으로 끝난다), 빗나가면 후보 캘린더를 훑는다.
 * 한 번도 연결된 적 없는 일정은 탐색 자체를 건너뛴다(신규 생성이 확실하므로).
 */
async function findEventLocation(
  calendar: calendar_v3.Calendar,
  activity: {
    id: string
    google_event_id?: string | null
    google_calendar_id?: string | null
    google_ical_uid?: string | null
  },
  candidateCalendarIds: string[]
): Promise<{ calendarId: string; eventId: string } | null> {
  const eventIds = [activity.google_event_id, toGoogleEventId(activity.id)].filter(
    (id, i, arr): id is string => !!id && arr.indexOf(id) === i
  )

  const stored = activity.google_calendar_id
  const ordered = stored
    ? [stored, ...candidateCalendarIds.filter((id) => id !== stored)]
    : candidateCalendarIds

  for (const calId of ordered) {
    for (const eventId of eventIds) {
      try {
        const res = await withRetry(() => calendar.events.get({ calendarId: calId, eventId }))
        // 삭제된(tombstone) 이벤트는 "없는 것"으로 본다. 되살리는 건 insert 복구 경로가 맡는다.
        if (res.data.status !== 'cancelled') {
          return { calendarId: calId, eventId: res.data.id || eventId }
        }
      } catch (err: any) {
        if (!isGoogleError(err, 404) && !isGoogleError(err, 410)) throw err
      }
    }

    // ID가 통하지 않으면 태그/iCalUID로 실물을 찾는다(서드파티가 ID를 바꾼 경우).
    try {
      const located = await locateExistingEvent(calendar, calId, activity)
      if (located.event?.id) return { calendarId: calId, eventId: located.event.id }
    } catch {
      // 이 캘린더에서의 탐색 실패는 다음 후보로 넘어간다.
    }
  }

  return null
}

/**
 * 이 일정의 구글 이벤트가 **원하는 캘린더에 정확히 하나만** 존재하도록 만든다.
 *
 * 핵심은 목적지가 바뀌었을 때 `events.move`로 **옮기는** 것이다.
 * 새로 insert 하면 원래 캘린더의 사본이 그대로 남아 중복이 된다.
 * (즉시 동기화 후 일정이 두 개씩 보이던 원인이 정확히 이것이다.)
 */
async function placeEvent(
  calendar: calendar_v3.Calendar,
  params: {
    activity: any
    eventBody: any
    desiredCalendarId: string
    candidateCalendarIds: string[]
    /** 우리가 쓰기까지 하는 캘린더. 여기 없는 캘린더의 이벤트는 옮기지 않는다. */
    writableCalendarIds: Set<string>
  }
): Promise<{ event: calendar_v3.Schema$Event | null; calendarId: string; note?: string }> {
  const { activity, eventBody, desiredCalendarId, candidateCalendarIds, writableCalendarIds } = params
  const canonicalEventId = toGoogleEventId(activity.id)

  // 한 번도 구글과 연결된 적 없으면 탐색은 낭비다.
  const everLinked = !!(activity.google_event_id || activity.google_calendar_id)
  const found = everLinked
    ? await findEventLocation(calendar, activity, candidateCalendarIds)
    : null

  if (!found) {
    const inserted = await insertWithRecovery(calendar, desiredCalendarId, eventBody, canonicalEventId)
    return { event: inserted.event, calendarId: desiredCalendarId, note: inserted.note }
  }

  let { calendarId, eventId } = found
  let note: string | undefined

  // 우리가 구독만 하는 캘린더(사용자의 기본 캘린더 등)에 있는 일정은 옮기지 않는다.
  // 사용자가 직접 그곳에 만든 일정을 앱 캘린더로 끌어가는 셈이 되기 때문이다.
  const mayRelocate = writableCalendarIds.has(calendarId)

  if (calendarId !== desiredCalendarId && mayRelocate) {
    try {
      const moved = await withRetry(() =>
        calendar.events.move({ calendarId, eventId, destination: desiredCalendarId })
      )
      eventId = moved.data.id || eventId
      calendarId = desiredCalendarId
    } catch (moveErr: any) {
      // 이동 불가(반복 인스턴스, 권한 없는 캘린더 등)면 제자리에서 갱신한다.
      // 여기서 insert로 도망가면 중복이 생기므로 절대 그렇게 하지 않는다.
      note = `목적지 캘린더로 옮기지 못해 기존 캘린더에서 갱신했습니다: ${moveErr.message}`
      console.warn(`[placeEvent] move failed (${calendarId} → ${desiredCalendarId}):`, moveErr.message)
    }
  }

  try {
    const res = await withRetry(() =>
      calendar.events.update({ calendarId, eventId, requestBody: eventBody })
    )
    return { event: res.data, calendarId, note }
  } catch (updateErr: any) {
    if (!isGoogleError(updateErr, 400)) throw updateErr
    // 색상/리마인더 등 부가 속성 유효성 문제 → 제거하고 한 번 더
    delete eventBody.colorId
    delete eventBody.reminders
    const res = await withRetry(() =>
      calendar.events.update({ calendarId, eventId, requestBody: eventBody })
    )
    return {
      event: res.data,
      calendarId,
      note: note || '일부 속성(색상 등)을 제외하고 동기화되었습니다.',
    }
  }
}

/**
 * push 결과를 활동 행에 반영한다.
 *
 * google_synced_at에는 **Google이 응답한 updated 시각**을 그대로 저장한다.
 * 이 값이 있어야 우리 push 때문에 되돌아온 웹훅을 "이미 아는 변경"으로 걸러낼 수 있다.
 * (activities.updated_at은 BEFORE UPDATE 트리거가 항상 now()로 덮어써서 기준이 될 수 없다.)
 */
async function persistPushResult(
  supabase: any,
  userId: string,
  activityId: string,
  calendarId: string,
  event: calendar_v3.Schema$Event | null | undefined,
  fallbackEventId: string,
  contentHash?: string
) {
  const payload: Record<string, any> = {
    google_event_id: event?.id || fallbackEventId,
    google_calendar_id: calendarId,
    google_synced_at: event?.updated || new Date().toISOString(),
    // 다음 배치에서 "이미 최신"을 판정하는 근거
    google_content_hash: contentHash ?? null,
  }
  if (event?.iCalUID) payload.google_ical_uid = event.iCalUID

  const { error } = await supabase
    .from('activities')
    .update(payload)
    .eq('id', activityId)
    .eq('user_id', userId)
  if (error) console.error('Failed to persist google link for activity:', activityId, error.message)
}

// ─────────────────────────────────────────────────────────────
// Calentask → Google (단건 push)
// ─────────────────────────────────────────────────────────────

/**
 * Creates or updates an event in Google Calendar.
 *
 * 이전 구현은 항상 `toGoogleEventId(activity.id)`로만 update를 시도했다.
 * 그래서 Google/네이버 쪽에서 만들어져 들어온 일정(= 구글이 부여한 ID를 가진 일정)을
 * Calentask에서 수정하면 update가 404 → insert 로 빠져 **구글에 중복 이벤트**가 생겼다.
 * 저장된 google_event_id를 1순위로 사용해 이 경로를 막는다.
 */
export async function syncActivityToGoogle(userId: string, activity: any, categories: any[] = []) {
  const supabase = createAdminClient()
  try {
    const { data: user } = await supabase
      .from('users')
      .select('google_sync_settings, google_refresh_token')
      .eq('id', userId)
      .single()

    if (!user?.google_refresh_token) return
    const settings: GoogleSyncSettings = user.google_sync_settings || {}
    if (settings.direction === 'IMPORT_ONLY') return

    const auth = buildOAuthClient(user.google_refresh_token)
    const calendar = google.calendar({ version: 'v3', auth })

    // 목적지는 설정만으로 정한다. categories를 scope 계산에 넘기지 않아야
    // scope.writeCalendarId가 '사용자의 기본 쓰기 캘린더'로 남는다.
    const scope = await resolveSyncScope(userId, auth, supabase, settings)
    if (!scope) return

    const desiredCalendarId = desiredCalendarFor(categories, settings, scope)

    // 반복 마스터를 push할 때, 삭제된 회차(soft-deleted 자식 예외)를 EXDATE로 제외시킨다.
    let exDatesUtc: string[] = []
    if (activity.recurrence_rule) {
      const { data: exChildren } = await supabase
        .from('activities')
        .select('original_start_time')
        .eq('user_id', userId)
        .eq('parent_activity_id', activity.id)
        .not('deleted_at', 'is', null)
        .not('original_start_time', 'is', null)
      exDatesUtc = (exChildren || []).map((c: any) => c.original_start_time).filter(Boolean)
    }

    const eventBody = mapActivityToGoogleEvent(activity, categories, settings, exDatesUtc) as any

    if (activity.parent_activity_id) {
      await attachRecurringParent(calendar, desiredCalendarId, activity, eventBody)
    }

    let placed
    try {
      placed = await placeEvent(calendar, {
        activity,
        eventBody,
        desiredCalendarId,
        candidateCalendarIds: scope.searchCalendarIds,
        writableCalendarIds: scope.writableCalendarIds,
      })
    } catch (placeErr: any) {
      // 목적지 캘린더가 구글에서 삭제됐을 수 있다 → 설정을 정리하고 살아있는 캘린더로 재시도.
      if (!isGoogleError(placeErr, 404) && !isGoogleError(placeErr, 410)) throw placeErr
      invalidateCalendarCache(userId, desiredCalendarId)
      const revived = await recoverDeadCalendar(
        userId, supabase, auth, settings, desiredCalendarId, categories
      )
      if (!revived) throw placeErr
      placed = await placeEvent(calendar, {
        activity,
        eventBody,
        desiredCalendarId: revived,
        candidateCalendarIds: scope.searchCalendarIds,
        writableCalendarIds: scope.writableCalendarIds,
      })
    }

    const finalEventId = placed.event?.id || toGoogleEventId(activity.id)
    await logSyncHistory(supabase, {
      userId,
      activityId: activity.id,
      googleEventId: finalEventId,
      calendarId: placed.calendarId,
      action: 'UPDATED',
      activityTitle: activity.title,
      activityStartTime: activity.start_time,
      errorMessage: placed.note,
    })

    // 실제로 전송된 최종 페이로드 기준으로 지문을 남긴다(복구 과정에서 속성이 빠졌을 수 있음).
    await persistPushResult(
      supabase,
      userId,
      activity.id,
      placed.calendarId,
      placed.event,
      finalEventId,
      eventPayloadHash(eventBody, placed.calendarId)
    )
  } catch (error: any) {
    console.error('Failed to sync activity to Google Calendar:', error)
    await logSyncHistory(supabase, {
      userId,
      activityId: activity.id,
      calendarId: 'unknown',
      action: 'ERROR',
      status: 'FAILED',
      errorMessage: error.message,
      activityTitle: activity.title,
      activityStartTime: activity.start_time,
    })
  }
}

/** 반복 예외(자식) 일정을 Google의 부모 시리즈에 연결한다. */
async function attachRecurringParent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  activity: any,
  eventBody: any
) {
  const setOriginalStart = (parentEventId: string) => {
    eventBody.recurringEventId = parentEventId
    if (!activity.original_start_time) return
    eventBody.originalStartTime = activity.is_all_day
      ? { date: toZonedYmd(activity.original_start_time) }
      : { dateTime: toZonedIso(activity.original_start_time), timeZone: SYNC_TIME_ZONE }
  }

  const parentEventId = toGoogleEventId(activity.parent_activity_id)
  try {
    await withRetry(() => calendar.events.get({ calendarId, eventId: parentEventId }))
    setOriginalStart(parentEventId)
    return
  } catch (parentErr: any) {
    if (!isGoogleError(parentErr, 404)) return
  }

  // Fallback: Custom ID로 부모를 못 찾으면 기존 extendedProperty 검색
  try {
    const res = await withRetry(() =>
      calendar.events.list({
        calendarId,
        privateExtendedProperty: [`calentask_id=${activity.parent_activity_id}`],
        maxResults: 1,
      })
    )
    const found = res.data.items?.[0]
    if (found?.id) setOriginalStart(found.id)
  } catch {
    // 부모를 못 찾으면 독립 일정으로 남는다(insertWithRecovery가 처리).
  }
}

/**
 * 캘린더 안에서 이 활동에 해당하는 기존 이벤트를 찾는다.
 * calentask_id 태그 → iCalUID 순으로 시도하며, 캘린더 자체가 죽었으면 그 사실을 알린다.
 */
async function locateExistingEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  activity: { id: string; google_ical_uid?: string | null }
): Promise<{ event: calendar_v3.Schema$Event | null; calendarDead: boolean }> {
  try {
    const byTag = await withRetry(() =>
      calendar.events.list({
        calendarId,
        privateExtendedProperty: [`calentask_id=${activity.id}`],
        showDeleted: false,
        maxResults: 1,
      })
    )
    if (byTag.data.items?.[0]) return { event: byTag.data.items[0], calendarDead: false }
  } catch (err: any) {
    if (isGoogleError(err, 404) || isGoogleError(err, 410)) return { event: null, calendarDead: true }
    throw err
  }

  // 서드파티가 확장 속성을 지웠어도 iCalUID는 대개 살아남는다.
  if (activity.google_ical_uid) {
    try {
      const byUid = await withRetry(() =>
        calendar.events.list({
          calendarId,
          iCalUID: activity.google_ical_uid as string,
          showDeleted: false,
          maxResults: 1,
        })
      )
      if (byUid.data.items?.[0]) return { event: byUid.data.items[0], calendarDead: false }
    } catch {
      /* 무시하고 신규 생성으로 진행 */
    }
  }

  return { event: null, calendarDead: false }
}

/**
 * 죽은 캘린더를 감지했을 때 설정을 정리하고 살아있는 대체 캘린더를 확보한다.
 */
async function recoverDeadCalendar(
  userId: string,
  supabase: any,
  auth: any,
  settings: GoogleSyncSettings,
  deadCalendarId: string,
  categories: any[]
): Promise<string | null> {
  const nextSettings: GoogleSyncSettings = { ...settings }
  let settingsChanged = false

  if (settings.groupMapping) {
    const mapping = { ...settings.groupMapping }
    for (const [catId, calId] of Object.entries(mapping)) {
      if (calId === deadCalendarId) {
        delete mapping[catId]
        settingsChanged = true
      }
    }
    if (settingsChanged) nextSettings.groupMapping = mapping
  }
  if (settings.importCalendarIds?.includes(deadCalendarId)) {
    nextSettings.importCalendarIds = settings.importCalendarIds.filter((id) => id !== deadCalendarId)
    settingsChanged = true
  }
  if (settingsChanged) {
    await supabase.from('users').update({ google_sync_settings: nextSettings }).eq('id', userId)
  }

  const { data: u } = await supabase
    .from('users')
    .select('google_sync_calendar_id')
    .eq('id', userId)
    .single()
  if (u?.google_sync_calendar_id === deadCalendarId) {
    await supabase
      .from('users')
      .update({ google_sync_calendar_id: null, google_sync_calendar_name: null })
      .eq('id', userId)
  }

  return getSyncCalendarId(userId, auth, supabase, categories, nextSettings)
}

/**
 * 정규 커스텀 ID로 신규 생성하되, 부모 의존성(404)/tombstone(409)/속성 유효성(400)을
 * 단계적으로 복구하고, 최후에는 Google 자동 할당 ID로라도 안전하게 이송한다.
 */
async function insertWithRecovery(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventBody: any,
  customEventId: string
): Promise<{ event: calendar_v3.Schema$Event | null; note?: string }> {
  try {
    const res = await withRetry(() =>
      calendar.events.insert({ calendarId, requestBody: { ...eventBody, id: customEventId } })
    )
    return { event: res.data }
  } catch (insertErr: any) {
    // 404 + 부모(반복 일정) 의존성 → 독립 일정으로 강등 후 재시도
    if (isGoogleError(insertErr, 404) && eventBody.recurringEventId) {
      delete eventBody.recurringEventId
      delete eventBody.originalStartTime
      try {
        const res = await withRetry(() =>
          calendar.events.insert({ calendarId, requestBody: { ...eventBody, id: customEventId } })
        )
        return { event: res.data, note: '부모 일정을 찾을 수 없어 독립된 일정으로 복구되었습니다.' }
      } catch {
        /* 다음 단계 */
      }
    }

    // 409: 삭제된(tombstone) ID와 충돌 → update로 부활
    if (isGoogleError(insertErr, 409)) {
      try {
        const res = await withRetry(() =>
          calendar.events.update({
            calendarId,
            eventId: customEventId,
            requestBody: { ...eventBody, status: 'confirmed' },
          })
        )
        return { event: res.data, note: '삭제된(Tombstone) 일정 아이디 충돌을 극복하고 복구되었습니다.' }
      } catch {
        /* 다음 단계 */
      }
    }

    // 400: 색상/리마인더 등 속성 유효성 → 부가 속성 제거 후 재시도
    if (isGoogleError(insertErr, 400)) {
      delete eventBody.colorId
      delete eventBody.reminders
      try {
        const res = await withRetry(() =>
          calendar.events.insert({ calendarId, requestBody: { ...eventBody, id: customEventId } })
        )
        return { event: res.data, note: '속성 유효성 오류(400)로 일부 데이터 제외 후 복구되었습니다.' }
      } catch {
        /* 다음 단계 */
      }
    }

    // 최후의 수단: 커스텀 ID를 버리고 Google 자동 할당 ID로 생성
    delete eventBody.recurringEventId
    delete eventBody.originalStartTime
    delete eventBody.colorId
    delete eventBody.reminders
    const res = await withRetry(() => calendar.events.insert({ calendarId, requestBody: eventBody }))
    return { event: res.data, note: '모든 복구 실패 후 Google 자동 할당 ID로 신규 생성되었습니다.' }
  }
}

// ─────────────────────────────────────────────────────────────
// Calentask → Google (삭제)
// ─────────────────────────────────────────────────────────────

export interface GoogleEventHint {
  googleEventId?: string | null
  googleCalendarId?: string | null
  googleICalUid?: string | null
}

/**
 * Deletes an event from Google Calendar.
 *
 * 이전 구현은 `toGoogleEventId(activityId)`만 시도했기 때문에, 구글/네이버에서
 * 만들어져 들어온 일정(구글이 부여한 ID)은 삭제가 먹지 않았다. 그러면 다음 pull에서
 * 그 이벤트가 "구글에만 있는 새 일정"으로 재수입되어 **삭제한 일정이 되살아났다**.
 * 저장된 google_event_id / google_calendar_id / iCalUID를 모두 활용해 확실히 지운다.
 *
 * @param hint 이미 행을 지운 뒤(hard delete) 호출할 때 필요한 연결 정보
 */
export async function deleteActivityFromGoogle(
  userId: string,
  activityId: string,
  hint?: GoogleEventHint
) {
  try {
    const supabase = createAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('google_sync_settings, google_sync_calendar_id, google_refresh_token')
      .eq('id', userId)
      .single()

    if (!user?.google_refresh_token) return
    const settings: GoogleSyncSettings = user.google_sync_settings || {}

    // IMPORT_ONLY 방향이면 구글에서 삭제하지 않음
    if (settings.direction === 'IMPORT_ONLY') return

    const { data: activity } = await supabase
      .from('activities')
      .select('google_event_id, google_calendar_id, google_ical_uid')
      .eq('id', activityId)
      .eq('user_id', userId)
      .maybeSingle()

    const storedEventId = hint?.googleEventId ?? activity?.google_event_id ?? null
    const storedCalendarId = hint?.googleCalendarId ?? activity?.google_calendar_id ?? null
    const storedICalUid = hint?.googleICalUid ?? activity?.google_ical_uid ?? null

    const auth = buildOAuthClient(user.google_refresh_token)
    const calendar = google.calendar({ version: 'v3', auth })

    // 알고 있는 위치부터 좁혀 나간다: 저장된 캘린더 → 기본 → 그룹 매핑 → 추가 수신
    const calendarIds: string[] = []
    const pushCalendar = (id?: string | null) => {
      if (id && !calendarIds.includes(id)) calendarIds.push(id)
    }
    pushCalendar(storedCalendarId)
    pushCalendar(user.google_sync_calendar_id)
    Object.values(settings.groupMapping || {}).forEach(pushCalendar)
    ;(settings.importCalendarIds || []).forEach(pushCalendar)
    if (calendarIds.length === 0) {
      pushCalendar(await getSyncCalendarId(userId, auth, supabase))
    }

    const eventIds = [storedEventId, toGoogleEventId(activityId)].filter(
      (id, i, arr): id is string => !!id && arr.indexOf(id) === i
    )

    for (const calId of calendarIds) {
      for (const eventId of eventIds) {
        try {
          await withRetry(() => calendar.events.delete({ calendarId: calId, eventId }))
          await logSyncHistory(supabase, {
            userId,
            activityId,
            googleEventId: eventId,
            calendarId: calId,
            action: 'DELETED',
          })
          await clearGoogleLink(supabase, userId, activityId)
          return
        } catch (err: any) {
          if (!isGoogleError(err, 404) && !isGoogleError(err, 410)) {
            console.warn(`Failed to delete ${eventId} from calendar ${calId}:`, err.message)
          }
        }
      }

      // ID로 못 지웠으면 태그/UID로 실물을 찾아본다.
      let found: { event: calendar_v3.Schema$Event | null; calendarDead: boolean }
      try {
        found = await locateExistingEvent(calendar, calId, {
          id: activityId,
          google_ical_uid: storedICalUid,
        })
      } catch {
        continue
      }

      if (found.event?.id) {
        try {
          await withRetry(() =>
            calendar.events.delete({ calendarId: calId, eventId: found.event!.id as string })
          )
          await logSyncHistory(supabase, {
            userId,
            activityId,
            googleEventId: found.event.id as string,
            calendarId: calId,
            action: 'DELETED',
          })
          await clearGoogleLink(supabase, userId, activityId)
          return
        } catch (err: any) {
          if (!isGoogleError(err, 404) && !isGoogleError(err, 410)) {
            console.warn(`Fallback delete failed for calendar ${calId}:`, err.message)
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to delete activity from Google Calendar:', error)
  }
}

/** 활동 행이 아직 남아 있다면 구글 연결 정보를 끊는다(재수입 방지). */
async function clearGoogleLink(supabase: any, userId: string, activityId: string) {
  await supabase
    .from('activities')
    .update({
      google_event_id: null,
      google_calendar_id: null,
      google_ical_uid: null,
      google_synced_at: null,
    })
    .eq('id', activityId)
    .eq('user_id', userId)
}

// ─────────────────────────────────────────────────────────────
// 동기화 초기화
// ─────────────────────────────────────────────────────────────

interface WatchChannel {
  channelId: string
  resourceId: string
  expiration: string | null // ISO string
}

/**
 * 구글 캘린더에 동기화된 Calentask 이벤트를 일괄 삭제합니다.
 * Calentask 앱의 원본 일정은 절대 영향받지 않습니다.
 *
 * ★ 5단계 안전장치 (Calentask 원본 일정 보호) ★
 * ─────────────────────────────────────────────
 * 구글에서 이벤트를 삭제하면 웹훅이 "삭제됨"을 알려 오고, 양방향 로직이
 * 원본까지 연쇄 삭제할 위험이 있다. 그래서 삭제 **전에** 역류 경로를 모두 끊는다.
 *
 * [1단계] DB google_channel_id NULL  → 웹훅 핸들러가 유저를 못 찾게 하여 즉시 차단
 * [2단계] Google channels.stop       → 구글이 더 이상 알림을 보내지 않도록 구독 해제
 * [3단계] 나머지 동기화 설정 초기화   → syncToken/calendarId를 비워 이중 방어
 * [4단계] activities 연결 정보 NULL   → Calentask ↔ Google 연결 고리 절단
 * [5단계] 구글 캘린더 이벤트 삭제     → 모든 역류 경로가 막힌 상태에서 안전 삭제
 */
export async function clearSyncedActivitiesFromGoogle(userId: string) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return { success: false, reason: 'no_auth' }

    // 삭제 대상 캘린더 ID 목록을 먼저 수집 (설정 초기화 전에 읽어야 함)
    const { data: user } = await supabase
      .from('users')
      .select(
        'google_sync_settings, google_sync_calendar_id, google_channel_id, google_resource_id, google_channels'
      )
      .eq('id', userId)
      .single()
    const settings: GoogleSyncSettings = user?.google_sync_settings || {}

    const calendarIdsToClear = new Set<string>()
    if (user?.google_sync_calendar_id) calendarIdsToClear.add(user.google_sync_calendar_id)
    Object.values(settings.groupMapping || {}).forEach((id) => id && calendarIdsToClear.add(id))

    const calendar = google.calendar({ version: 'v3', auth })

    // [1단계] 웹훅 핸들러 즉시 차단
    await supabase
      .from('users')
      .update({ google_channel_id: null, google_resource_id: null })
      .eq('id', userId)

    // [2단계] 모든 watch 채널 구독 해제
    const channelsToStop: Array<{ id: string; resourceId: string }> = []
    const channelsMap: Record<string, WatchChannel> =
      user?.google_channels && typeof user.google_channels === 'object' ? user.google_channels : {}
    for (const ch of Object.values(channelsMap)) {
      if (ch?.channelId && ch?.resourceId) channelsToStop.push({ id: ch.channelId, resourceId: ch.resourceId })
    }
    if (
      user?.google_channel_id &&
      user?.google_resource_id &&
      !channelsToStop.some((c) => c.id === user.google_channel_id)
    ) {
      channelsToStop.push({ id: user.google_channel_id, resourceId: user.google_resource_id })
    }
    await Promise.allSettled(
      channelsToStop.map((ch) =>
        calendar.channels.stop({ requestBody: { id: ch.id, resourceId: ch.resourceId } }).catch((e: any) => {
          console.warn('Failed to stop google calendar watch channel during clear:', e.message)
        })
      )
    )

    // [3단계] 나머지 동기화 설정 전체 초기화 (google_refresh_token은 보존 → OAuth 연동 유지)
    await supabase
      .from('users')
      .update({
        google_sync_calendar_id: null,
        google_sync_calendar_name: null,
        google_sync_settings: {},
        google_sync_token: null,
        google_channel_expiration: null,
        google_channels: {},
      })
      .eq('id', userId)

    // [4단계] Calentask ↔ Google 연결 고리 절단 (원본 일정은 100% 보존)
    await supabase
      .from('activities')
      .update({
        google_event_id: null,
        google_calendar_id: null,
        google_ical_uid: null,
        google_synced_at: null,
      })
      .eq('user_id', userId)
      .not('google_event_id', 'is', null)

    // [5단계] 구글 캘린더 이벤트 안전 삭제
    let deletedCount = 0
    const limit = pLimit(5)

    for (const calId of calendarIdsToClear) {
      try {
        const calMeta = await calendar.calendars.get({ calendarId: calId })
        const isCalentaskCalendar =
          calMeta.data.summary === 'Calentask' ||
          calMeta.data.description?.includes('Created by Calentask') ||
          calMeta.data.description?.includes('Sync calendar for Calentask')

        if (isCalentaskCalendar) {
          // 전용 캘린더: 통째로 삭제 (모든 이벤트 즉시 소멸)
          await calendar.calendars.delete({ calendarId: calId })
          deletedCount += 999 // 정확한 수를 알 수 없으므로 표시용
          continue
        }

        // 개인 캘린더: calentask_id 태그가 있는 이벤트만 선별 삭제.
        // Google의 privateExtendedProperty는 `key=value` 형태만 받는다("존재 여부" 필터가 없다).
        // 값을 특정할 수 없으므로 전체를 받아 클라이언트에서 걸러야 한다.
        let pageToken: string | null | undefined
        do {
          const res: any = await calendar.events.list({
            calendarId: calId,
            maxResults: 250,
            singleEvents: false,
            showDeleted: false,
            pageToken: pageToken || undefined,
          })

          const calentaskEvents = (res.data.items || []).filter(
            (event: any) => event.extendedProperties?.private?.calentask_id
          )

          const deleteResults = await Promise.allSettled(
            calentaskEvents.map((event: any) =>
              limit(async () => {
                await calendar.events.delete({ calendarId: calId, eventId: event.id as string })
                deletedCount++
              })
            )
          )

          deleteResults.forEach((result, i) => {
            if (result.status === 'rejected') {
              const err: any = result.reason
              if (!isGoogleError(err, 404) && !isGoogleError(err, 410)) {
                console.warn(`Failed to delete event ${calentaskEvents[i]?.id}:`, err?.message)
              }
            }
          })

          pageToken = res.data.nextPageToken
        } while (pageToken)
      } catch (err: any) {
        console.warn(`Failed to clear calendar ${calId}:`, err.message)
      }
    }

    calendarAliveCache.clear()
    primaryCalendarCache.delete(userId)

    if (deletedCount > 0) {
      await logSyncHistory(supabase, {
        userId,
        calendarId: 'ALL',
        action: 'DELETED',
        activityTitle: `배치 삭제 (${deletedCount}건)`,
      })
    }

    return { success: true, deletedCount }
  } catch (error: any) {
    console.error('Failed to clear synced activities from Google:', error)
    await logSyncHistory(createAdminClient(), {
      userId,
      calendarId: 'unknown',
      action: 'ERROR',
      errorMessage: `일괄 삭제 실패: ${error.message}`,
    })
    return { success: false, error: error.message }
  }
}

// ─────────────────────────────────────────────────────────────
// Watch (실시간 수신 구독)
// ─────────────────────────────────────────────────────────────

/**
 * Subscribes to Google Calendar Webhooks (Watch API).
 * 수신 대상 캘린더 **전체**(기본 캘린더 포함)를 구독하므로,
 * 네이버 등 외부 서비스가 어느 캘린더에 기록하든 실시간으로 잡아낸다.
 */
export async function watchGoogleCalendar(userId: string, options?: { force?: boolean }) {
  try {
    const force = options?.force === true
    const supabase = createAdminClient()

    const { data: userData } = await supabase
      .from('users')
      .select('google_sync_settings, google_channel_id, google_resource_id, google_channel_expiration, google_channels, google_refresh_token')
      .eq('id', userId)
      .single()

    if (!userData?.google_refresh_token) return
    const auth = buildOAuthClient(userData.google_refresh_token)
    const settings: GoogleSyncSettings = userData.google_sync_settings || {}

    // 기존 채널 맵 로드 (다중 캘린더 추적)
    const channels: Record<string, WatchChannel> =
      userData.google_channels && typeof userData.google_channels === 'object'
        ? { ...userData.google_channels }
        : {}

    const scope = await resolveSyncScope(userId, auth, supabase, settings)
    if (!scope) return
    const calendarIdsToWatch = new Set(scope.readCalendarIds)

    const calendar = google.calendar({ version: 'v3', auth })
    const RENEW_THRESHOLD = 60 * 60 * 1000 // 만료 1시간 이내면 갱신
    const isChannelValid = (ch?: WatchChannel) =>
      !!ch && !!ch.expiration && new Date(ch.expiration).getTime() > Date.now() + RENEW_THRESHOLD

    // 더 이상 필요 없는 캘린더(매핑 해제됨)의 채널은 정리
    let channelsChanged = false
    for (const [calId, ch] of Object.entries(channels)) {
      if (!calendarIdsToWatch.has(calId)) {
        try {
          await calendar.channels.stop({ requestBody: { id: ch.channelId, resourceId: ch.resourceId } })
        } catch {
          // 이미 만료/존재하지 않으면 무시
        }
        delete channels[calId]
        channelsChanged = true
      }
    }

    const needsWork = force || [...calendarIdsToWatch].some((calId) => !isChannelValid(channels[calId]))
    if (!needsWork) {
      if (channelsChanged) {
        await supabase.from('users').update({ google_channels: channels }).eq('id', userId)
      }
      await handleGoogleCalendarSync(userId, supabase)
      return { alreadyActive: true }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://calentask-orcin.vercel.app'
    const webhookUrl = `${siteUrl}/api/webhooks/google`

    // 캘린더별 watch 등록은 서로 독립적이므로 병렬로 처리한다(캘린더 수 × 왕복 시간 절약).
    const watchLimit = pLimit(4)
    await Promise.all(
      [...calendarIdsToWatch].map((calId) =>
        watchLimit(async () => {
          const existing = channels[calId]
          if (!force && isChannelValid(existing)) return

          if (existing) {
            try {
              await calendar.channels.stop({
                requestBody: { id: existing.channelId, resourceId: existing.resourceId },
              })
            } catch {
              // 이미 만료된 채널 정리 실패는 무시
            }
          }

          const channelId = `sync-${crypto.randomUUID()}`
          try {
            const response = await withRetry(() =>
              calendar.events.watch({
                calendarId: calId,
                requestBody: { id: channelId, type: 'web_hook', address: webhookUrl, token: userId },
              })
            )
            channels[calId] = {
              channelId,
              resourceId: response.data.resourceId as string,
              expiration: response.data.expiration
                ? new Date(Number.parseInt(response.data.expiration, 10)).toISOString()
                : null,
            }
          } catch (watchErr: any) {
            console.warn(`Failed to watch calendar ${calId}:`, watchErr.message)
            delete channels[calId]
          }
        })
      )
    )

    // 기본 캘린더 채널을 primary 컬럼에도 기록 (웹훅 안전장치/하위호환)
    const primaryCh = channels[scope.writeCalendarId] || Object.values(channels)[0]

    await supabase
      .from('users')
      .update({
        google_channels: channels,
        google_channel_id: primaryCh?.channelId || null,
        google_resource_id: primaryCh?.resourceId || null,
        google_channel_expiration: primaryCh?.expiration || null,
      })
      .eq('id', userId)

    // 초기 동기화 수행
    await handleGoogleCalendarSync(userId, supabase)

    return { channels }
  } catch (error) {
    console.error('Failed to watch Google Calendar:', error)
  }
}

// ─────────────────────────────────────────────────────────────
// Google → Calentask (pull)
// ─────────────────────────────────────────────────────────────

/** 캘린더별 동기화 커서. 실패 횟수를 함께 들고 다닌다. */
interface CalendarCursor {
  token?: string
  /** 델타 반영이 연속 실패한 횟수. 임계치를 넘으면 커서를 전진시켜 무한 재시도를 끊는다. */
  failures?: number
}

const MAX_CURSOR_FAILURES = 3

/**
 * google_sync_token 컬럼을 파싱한다.
 * 세 가지 과거 포맷을 모두 받아들인다:
 *   1) 단일 토큰 문자열 (최초 구현)
 *   2) { [calendarId]: "token" }
 *   3) { [calendarId]: { token, failures } }  ← 현재
 */
function parseCursorStore(raw: string | null, fallbackCalendarId: string): Record<string, CalendarCursor> {
  if (!raw) return {}
  if (!raw.startsWith('{')) return { [fallbackCalendarId]: { token: raw } }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const store: Record<string, CalendarCursor> = {}
    for (const [calId, value] of Object.entries(parsed)) {
      if (typeof value === 'string') store[calId] = { token: value }
      else if (value && typeof value === 'object') store[calId] = value as CalendarCursor
    }
    return store
  } catch {
    return {}
  }
}

function windowStart(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - INITIAL_WINDOW_PAST_YEARS)
  return d.toISOString()
}

function windowEnd(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + INITIAL_WINDOW_FUTURE_YEARS)
  return d.toISOString()
}

/**
 * 한 캘린더의 변경분을 모두 읽어 온다.
 * syncToken이 만료(410)되면 자동으로 전체 동기화로 강등한다.
 */
async function fetchCalendarDelta(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  syncToken?: string
): Promise<{ items: calendar_v3.Schema$Event[]; nextSyncToken?: string; fullSync: boolean }> {
  const run = async (token?: string) => {
    const items: calendar_v3.Schema$Event[] = []
    let pageToken: string | undefined
    let nextSyncToken: string | undefined

    do {
      const params: calendar_v3.Params$Resource$Events$List = token
        ? // 증분 동기화: 삭제(cancelled)도 반드시 받아야 하므로 showDeleted를 켠다.
          { calendarId, syncToken: token, pageToken, maxResults: 250, showDeleted: true }
        : // 전체 동기화: 기간을 한정하고 tombstone은 받지 않는다.
          {
            calendarId,
            pageToken,
            maxResults: 250,
            singleEvents: false,
            showDeleted: false,
            timeMin: windowStart(),
            timeMax: windowEnd(),
          }

      const res = await withRetry(() => calendar.events.list(params))
      if (res.data.items?.length) items.push(...res.data.items)
      pageToken = res.data.nextPageToken ?? undefined
      if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken
    } while (pageToken)

    return { items, nextSyncToken }
  }

  if (syncToken) {
    try {
      return { ...(await run(syncToken)), fullSync: false }
    } catch (err: any) {
      if (!isGoogleError(err, 410)) throw err
      console.warn(`Sync token expired for ${calendarId}; falling back to full sync.`)
    }
  }

  return { ...(await run(undefined)), fullSync: true }
}

/**
 * 동일 유저의 pull 동기화 동시 실행을 막는 coalescing lock 래퍼.
 * push마다 webhook이 pull을 트리거하므로, 버스트 시 google_sync_token을
 * read-modify-write로 경쟁하는 문제를 직렬화로 해결한다.
 *  - 잠금 보유 중 들어온 요청은 sync_rerun_requested로 표시되어 후행 1회로 합쳐진다.
 *  - 잠금은 2분 후 스스로 만료되어 교착을 방지한다(크래시/타임아웃 안전).
 */
export async function handleGoogleCalendarSync(userId: string, customSupabase?: any) {
  const supabase = customSupabase || createAdminClient()
  const STALE_MS = 2 * 60 * 1000
  /** 후행 재실행이 무한히 이어지지 않도록 상한을 둔다. */
  const MAX_RERUNS = 5

  // 원자적 잠금 획득: 잠금이 비었거나 만료됐을 때만 sync_lock_at을 현재로 설정.
  // Postgres READ COMMITTED에서 UPDATE ... WHERE는 행 잠금으로 직렬화되어,
  // 동시 요청 중 정확히 하나만 행을 갱신(=잠금 획득)한다.
  const staleThreshold = new Date(Date.now() - STALE_MS).toISOString()
  const { data: lockRow } = await supabase
    .from('users')
    .update({ sync_lock_at: new Date().toISOString() })
    .eq('id', userId)
    .or(`sync_lock_at.is.null,sync_lock_at.lt.${staleThreshold}`)
    .select('id')
    .maybeSingle()

  if (!lockRow) {
    // 다른 동기화가 진행 중 → 후행 1회만 요청하고 종료
    await supabase.from('users').update({ sync_rerun_requested: true }).eq('id', userId)
    return
  }

  try {
    for (let pass = 0; pass < MAX_RERUNS; pass++) {
      // 실행 직전에 플래그를 내려, 실행 도중 들어온 요청만 다음 루프로 합친다(trailing).
      await supabase.from('users').update({ sync_rerun_requested: false }).eq('id', userId)
      await runGoogleCalendarSync(userId, supabase)

      const { data: flag } = await supabase
        .from('users')
        .select('sync_rerun_requested')
        .eq('id', userId)
        .single()
      if (!flag?.sync_rerun_requested) break
    }
  } finally {
    // 예외/정상 모두 잠금 해제
    await supabase.from('users').update({ sync_lock_at: null }).eq('id', userId)
  }
}

async function runGoogleCalendarSync(userId: string, supabase: any) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select(
        'google_channel_id, google_sync_calendar_id, google_sync_token, google_sync_settings, google_refresh_token'
      )
      .eq('id', userId)
      .single()

    if (!user?.google_refresh_token) return

    // ★ 안전장치: 초기화 진행 중이면 조기 종료 ★
    // clearSyncedActivitiesFromGoogle이 1단계(channel_id NULL)를 마친 상태에서
    // getSyncCalendarId가 캘린더를 재발견/재생성해 초기화를 무효화하는 것을 막는다.
    if (!user.google_channel_id && !user.google_sync_calendar_id) return

    const settings: GoogleSyncSettings = user.google_sync_settings || {}
    // EXPORT_ONLY면 아예 읽지 않는다. (기존 구현은 읽지 않으면서 커서만 전진시켜
    //  양방향으로 되돌렸을 때 그 사이 변경분이 통째로 사라졌다.)
    if (settings.direction === 'EXPORT_ONLY') return

    const strategy: ConflictStrategy = settings.conflictStrategy || 'LATEST_WINS'
    if (strategy === 'CALENTASK_WINS') return

    const auth = buildOAuthClient(user.google_refresh_token)
    const calendar = google.calendar({ version: 'v3', auth })

    const scope = await resolveSyncScope(userId, auth, supabase, settings)
    if (!scope) return

    const cursors = parseCursorStore(user.google_sync_token, scope.writeCalendarId)

    // 스마트 라우팅에 쓸 카테고리는 한 번만 조회한다.
    let userCategories: Array<{ id: string; name: string }> = []
    if (settings.groupMapping && Object.keys(settings.groupMapping).length > 0) {
      const { data: cats } = await supabase.from('categories').select('id, name').eq('user_id', userId)
      userCategories = cats || []
    }

    const ctx: DeltaContext = { userId, supabase, calendar, settings, strategy, userCategories }

    // 1) 네트워크 왕복은 캘린더별로 병렬화한다(가장 느린 구간).
    const fetchLimit = pLimit(3)
    const fetched = await Promise.all(
      scope.readCalendarIds.map((calId) =>
        fetchLimit(async () => {
          try {
            const result = await fetchCalendarDelta(calendar, calId, cursors[calId]?.token)
            return { calId, ...result, error: null as any }
          } catch (error: any) {
            console.warn(`Failed to fetch calendar ${calId}:`, error.message)
            return {
              calId,
              items: [] as calendar_v3.Schema$Event[],
              nextSyncToken: undefined as string | undefined,
              fullSync: false,
              error,
            }
          }
        })
      )
    )

    // 2) DB 반영은 캘린더 간 쓰기 경합을 피하기 위해 순차 처리한다.
    const nextCursors: Record<string, CalendarCursor> = {}
    const pushBackIds = new Set<string>()
    const upsertedIds = new Set<string>()
    const deleteCandidateIds = new Set<string>()
    const outcomes: Array<{ calId: string; applied: DeltaOutcome; nextSyncToken?: string }> = []

    for (const result of fetched) {
      const previous = cursors[result.calId] || {}

      if (result.error) {
        // 조회 자체가 실패 → 커서를 그대로 두고 다음 기회에 다시 시도한다.
        nextCursors[result.calId] = previous
        continue
      }

      const applied = await applyDelta(ctx, result.calId, result.items, {
        writable: scope.writableCalendarIds.has(result.calId),
      })
      applied.pushBackIds.forEach((id) => pushBackIds.add(id))
      applied.upsertedIds.forEach((id) => upsertedIds.add(id))
      applied.deleteCandidateIds.forEach((id) => deleteCandidateIds.add(id))
      outcomes.push({ calId: result.calId, applied, nextSyncToken: result.nextSyncToken })
    }

    // ★ 삭제는 모든 캘린더를 훑은 뒤에 확정한다 ★
    // events.move로 A→B로 옮긴 일정은 A의 델타에서 cancelled로 보인다.
    // 캘린더별로 즉시 지우면 처리 순서에 따라 방금 옮긴 일정이 사라진다.
    const confirmedDeletes = [...deleteCandidateIds].filter((id) => !upsertedIds.has(id))
    let deleteOk = true
    if (confirmedDeletes.length > 0) {
      try {
        await softDeleteActivities(supabase, userId, confirmedDeletes)
      } catch (deleteErr) {
        deleteOk = false
        console.error('[sync] Failed to apply deletions:', deleteErr)
      }
    }

    // 3) 커서 커밋
    for (const { calId, applied, nextSyncToken } of outcomes) {
      const previous = cursors[calId] || {}
      const result = { calId, nextSyncToken }
      const succeeded = applied.ok && (deleteOk || applied.deleteCandidateIds.length === 0)

      if (succeeded) {
        // ★ 커서는 반영이 끝난 뒤에만 전진시킨다 ★
        // 기존 구현은 아이템을 반영하기 전에 토큰을 저장해서, 처리 도중 타임아웃이 나면
        // 그 델타가 영구히 유실됐다("일부 항목만 반영됨"의 주범).
        nextCursors[result.calId] = { token: result.nextSyncToken || previous.token }
      } else {
        const failures = (previous.failures || 0) + 1
        if (failures >= MAX_CURSOR_FAILURES) {
          // 영구 실패(잘못된 데이터 등)로 같은 델타를 무한 재시도하지 않도록 전진시키되,
          // 사용자에게 보이도록 히스토리에 기록한다.
          console.error(`[sync] Advancing cursor for ${result.calId} after ${failures} failed attempts.`)
          await logSyncHistory(supabase, {
            userId,
            calendarId: result.calId,
            action: 'ERROR',
            status: 'FAILED',
            errorMessage: `변경분 반영이 ${failures}회 연속 실패하여 일부 항목을 건너뛰었습니다. '즉시 동기화'로 전체 재동기화를 권장합니다.`,
          })
          nextCursors[result.calId] = { token: result.nextSyncToken || previous.token }
        } else {
          // 커서를 전진시키지 않는다 → 다음 실행이 같은 델타를 다시 받아 재시도한다.
          // 반영 로직은 상관 키 기반 upsert라 멱등하므로 중복이 생기지 않는다.
          nextCursors[result.calId] = { token: previous.token, failures }
        }
      }
    }

    await supabase
      .from('users')
      .update({
        google_sync_token: Object.keys(nextCursors).length ? JSON.stringify(nextCursors) : null,
      })
      .eq('id', userId)

    // 3) 로컬이 더 최신이라 구글 변경을 물리친 일정은 반대로 밀어 올려 수렴시킨다.
    if (pushBackIds.size > 0 && settings.direction !== 'IMPORT_ONLY') {
      await pushBackToGoogle(userId, supabase, [...pushBackIds].slice(0, 25))
    }
  } catch (error) {
    console.error('Error in handleGoogleCalendarSync:', error)
  }
}

interface DeltaOutcome {
  ok: boolean
  applied: number
  pushBackIds: string[]
  /** 이번 캘린더에서 살아있다고 확인된 활동 id. 삭제 후보를 무효화하는 근거가 된다. */
  upsertedIds: string[]
  /** 이 캘린더에서 cancelled로 관측된 활동 id. 실행 전체가 끝나야 확정된다. */
  deleteCandidateIds: string[]
}

const EMPTY_DELTA_OUTCOME: DeltaOutcome = {
  ok: true,
  applied: 0,
  pushBackIds: [],
  upsertedIds: [],
  deleteCandidateIds: [],
}

interface DeltaContext {
  userId: string
  supabase: any
  calendar: calendar_v3.Calendar
  settings: GoogleSyncSettings
  strategy: ConflictStrategy
  userCategories: Array<{ id: string; name: string }>
}

/** `.in()` 필터를 청크로 나눠 안전하게 조회한다. */
async function selectActivitiesIn(
  supabase: any,
  userId: string,
  column: string,
  values: string[]
): Promise<any[]> {
  const unique = [...new Set(values.filter(Boolean))]
  if (unique.length === 0) return []

  const rows: any[] = []
  for (const part of chunk(unique, IN_FILTER_CHUNK)) {
    const { data, error } = await supabase
      .from('activities')
      .select(ACTIVITY_SYNC_COLUMNS)
      .eq('user_id', userId)
      .in(column, part)
    if (error) throw new Error(`activities lookup by ${column} failed: ${error.message}`)
    if (data) rows.push(...data)
  }
  return rows
}

/**
 * 한 캘린더의 변경분을 Calentask DB에 반영한다.
 *
 * 기존 구현은 이벤트마다 개별 update/insert + Google patch를 만들어
 * `Promise.allSettled`로 **동시성 제한 없이** 쏟아부었다. 초기 동기화처럼 수백 건이면
 * 구글이 429/403으로 대부분을 거절했고, 그 실패는 allSettled에 삼켜졌다.
 * 여기서는 상관 키를 벌크로 한 번에 조회하고, 쓰기도 벌크 upsert로 끝낸다.
 *
 * @returns ok=false면 호출자가 커서를 전진시키지 않아 다음 실행에서 재시도된다.
 */
async function applyDelta(
  ctx: DeltaContext,
  calendarId: string,
  events: calendar_v3.Schema$Event[],
  options: { writable: boolean }
): Promise<DeltaOutcome> {
  const { userId, supabase, calendar, strategy } = ctx
  if (events.length === 0) return EMPTY_DELTA_OUTCOME

  try {
    // ── 1. 반복 예외 인스턴스와 일반 이벤트 분리 ──
    // Google UI에서 한 회차를 삭제/수정하면 EXDATE가 아니라 예외 인스턴스로 나타난다.
    const instances: calendar_v3.Schema$Event[] = []
    const primaries: calendar_v3.Schema$Event[] = []
    for (const event of events) {
      if (event.recurringEventId) instances.push(event)
      else primaries.push(event)
    }

    // ── 2. 상관 키 수집 ──
    const idKeys: string[] = []
    const eventIdKeys: string[] = []
    const uidKeys: string[] = []

    for (const event of primaries) {
      const tag = readCalentaskTag(event)
      if (tag) idKeys.push(tag)
      const decoded = fromGoogleEventId(event.id)
      if (decoded) idKeys.push(decoded)
      if (event.id) eventIdKeys.push(event.id)
      if (event.iCalUID) uidKeys.push(event.iCalUID)
    }

    // ── 3. 벌크 역조회 (전부 user_id 스코프) ──
    const [byIdRows, byEventRows, byUidRows] = await Promise.all([
      selectActivitiesIn(supabase, userId, 'id', idKeys),
      selectActivitiesIn(supabase, userId, 'google_event_id', eventIdKeys),
      selectActivitiesIn(supabase, userId, 'google_ical_uid', uidKeys),
    ])

    const byId = new Map<string, any>()
    const byEventId = new Map<string, any>()
    const byICalUid = new Map<string, any>()
    for (const row of [...byIdRows, ...byEventRows, ...byUidRows]) {
      byId.set(row.id, row)
      if (row.google_event_id) byEventId.set(row.google_event_id, row)
      if (row.google_ical_uid) byICalUid.set(row.google_ical_uid, row)
    }

    const matchByKeys = (event: calendar_v3.Schema$Event): any | null => {
      const tag = readCalentaskTag(event)
      if (tag && byId.has(tag)) return byId.get(tag)
      if (event.id && byEventId.has(event.id)) return byEventId.get(event.id)
      const decoded = fromGoogleEventId(event.id)
      if (decoded && byId.has(decoded)) return byId.get(decoded)
      if (event.iCalUID && byICalUid.has(event.iCalUID)) return byICalUid.get(event.iCalUID)
      return null
    }

    // ── 4. 지문(제목 + 시작시각) 폴백 인덱스 ──
    // 서드파티가 이벤트를 새 ID로 재생성하면 위 키가 전부 끊긴다.
    // "아직 구글과 연결되지 않은 활성 일정"만 후보로 삼아 중복 생성을 막는다.
    const fingerprintIndex = await buildFingerprintIndex(
      supabase,
      userId,
      primaries.filter((e) => e.status !== 'cancelled' && !matchByKeys(e))
    )

    // ── 5. 작업 분류 ──
    const softDeleteIds: string[] = []
    const upsertRows: any[] = []
    const rowByEventId = new Map<string, any>()
    const categoryLinks: Array<{ activity_id: string; category_id: string }> = []
    const tagPatches: Array<{ eventId: string; activityId: string }> = []
    const pushBackIds: string[] = []
    const claimed = new Set<string>()

    // 두 이벤트가 같은 활동으로 해석되면(예: Calentask 태그를 가진 이벤트와
    // 같은 iCalUID를 가진 네이버 사본) 같은 id로 upsert 행이 두 개 생겨
    // Postgres가 "ON CONFLICT DO UPDATE cannot affect row a second time"로 거절한다.
    // 등록 시점에 최신(googleMtime) 것만 남겨 그 상황 자체를 만들지 않는다.
    const rowIndexById = new Map<string, number>()

    /** @returns 이 행이 채택됐으면 true (더 오래된 중복이면 false) */
    const stageRow = (row: any, eventId: string, googleMtime: number): boolean => {
      const existingIndex = rowIndexById.get(row.id)
      if (existingIndex === undefined) {
        rowIndexById.set(row.id, upsertRows.length)
        upsertRows.push(row)
        rowByEventId.set(eventId, row)
        return true
      }

      const existingMtime = Date.parse(upsertRows[existingIndex].google_synced_at || '') || 0
      if (googleMtime <= existingMtime) return false

      upsertRows[existingIndex] = row
      rowByEventId.set(eventId, row)
      return true
    }

    for (const event of primaries) {
      if (!event.id) continue
      const isCancelled = event.status === 'cancelled'
      const match =
        matchByKeys(event) || (isCancelled ? null : lookupFingerprint(fingerprintIndex, event, claimed))

      if (isCancelled) {
        // ★ tombstone은 '활동의 현재 연결'을 가리킬 때만 삭제로 인정한다 ★
        //
        // 중복 정리(reconcile)나 캘린더 이동(events.move)으로 사라진 **옛 사본**도
        // 같은 calentask_id 태그를 달고 있어서 matchByKeys에 그대로 걸린다.
        // 그 tombstone을 그대로 믿으면, 다른 이벤트로 멀쩡히 살아 있는 활동을 지워버린다.
        // (같은 실행 안에서는 upsert 목록으로 걸러지지만, 웹훅이 나중 실행으로 도착하면
        //  걸러낼 근거가 없어 실제로 일정이 사라졌다.)
        if (match && !match.deleted_at && isCurrentGoogleLink(match, event, calendarId)) {
          softDeleteIds.push(match.id)
        }
        continue
      }

      const times = eventTimesToUtc(event)
      if (!times) continue // 시각 정보가 없는 이벤트는 반영할 수 없다.

      const googleMtime = event.updated ? Date.parse(event.updated) : Date.now()

      if (match) {
        const lastSeen = match.google_synced_at ? Date.parse(match.google_synced_at) : 0

        // 우리 push가 되돌아온 웹훅(에코)이면 조용히 무시한다.
        // 이 한 줄이 push → webhook → pull → update → ... 의 되먹임 고리를 끊는다.
        if (googleMtime <= lastSeen) {
          if (needsLinkRepair(match, event, calendarId)) {
            stageRow(buildLinkRepairRow(match, event, calendarId), event.id, googleMtime)
          }
          continue
        }

        if (strategy === 'LATEST_WINS') {
          const localMtime = Date.parse(match.updated_at)
          if (Number.isFinite(localMtime) && googleMtime + ECHO_GRACE_MS < localMtime) {
            // 로컬이 확실히 더 최신 → 구글 변경을 물리치고, 대신 우리 버전을 밀어 올린다.
            pushBackIds.push(match.id)
            continue
          }
        }

        if (stageRow(buildActivityRow(match.id, userId, event, times, calendarId, googleMtime), event.id, googleMtime)) {
          if (!readCalentaskTag(event)) tagPatches.push({ eventId: event.id, activityId: match.id })
        }
      } else {
        // 신규 수입. ID를 우리가 만들어 두면 카테고리 매핑·태그 패치를 같은 배치에서 처리할 수 있다.
        const newId = crypto.randomUUID()
        stageRow(buildActivityRow(newId, userId, event, times, calendarId, googleMtime), event.id, googleMtime)

        const categoryId = routeCategory(ctx, event, calendarId)
        if (categoryId) categoryLinks.push({ activity_id: newId, category_id: categoryId })
        tagPatches.push({ eventId: event.id, activityId: newId })
      }
    }

    // 삭제 후보는 여기서 실행하지 않는다.
    // events.move로 캘린더를 옮기면 **출발 캘린더의 델타에는 cancelled로** 나타나고
    // 도착 캘린더의 델타에는 살아있는 이벤트로 나타난다. 캘린더별로 따로 처리하면
    // 처리 순서에 따라 방금 옮긴 일정을 삭제해 버린다.
    // 그래서 실행 전체가 끝난 뒤, 어느 캘린더에서든 살아있다고 확인된 것을 제외하고 지운다.
    const upsertedIds = upsertRows.map((row) => row.id as string)
    const deleteCandidateIds = [...new Set(softDeleteIds)]

    // ── 6. Google 쪽 태그 복구를 upsert보다 먼저 수행 ──
    // 패치는 event.updated를 갱신시키므로, 그 결과 시각을 google_synced_at에 반영해야
    // 바로 뒤따라오는 웹훅이 또 한 바퀴 돌지 않는다.
    //
    // 구독만 하는 캘린더에는 손대지 않는다. 읽기 전용으로 공유받은 캘린더면 매번 403이고,
    // 쓸 수 있더라도 남의 일정 수백 건의 updated를 건드려 외부 서비스에 변경 폭풍을 만든다.
    // 연결 정보는 이미 activities.google_event_id / google_ical_uid가 들고 있으므로
    // 태그는 어디까지나 보조 키다.
    if (options.writable && tagPatches.length > 0) {
      const patchLimit = pLimit(5)
      await Promise.all(
        tagPatches.map(({ eventId, activityId }) =>
          patchLimit(async () => {
            try {
              const res = await withRetry(() =>
                calendar.events.patch({
                  calendarId,
                  eventId,
                  requestBody: { extendedProperties: { private: { calentask_id: activityId } } },
                })
              )
              const row = rowByEventId.get(eventId)
              if (row && res.data.updated) row.google_synced_at = res.data.updated
              if (row && res.data.iCalUID) row.google_ical_uid = res.data.iCalUID
            } catch (patchErr: any) {
              // 태그 복구는 최선 노력. 연결 정보는 이미 우리 DB(google_event_id)에 있으므로
              // 실패해도 다음 동기화에서 매칭이 끊기지 않는다.
              console.warn(`Failed to tag google event ${eventId}:`, patchErr.message)
            }
          })
        )
      )
    }

    // ── 7. 벌크 쓰기 ──
    if (upsertRows.length > 0) {
      for (const part of chunk(upsertRows, UPSERT_CHUNK)) {
        const { error } = await supabase.from('activities').upsert(part, { onConflict: 'id' })
        if (error) throw new Error(`activities upsert failed: ${error.message}`)
      }
    }

    if (categoryLinks.length > 0) {
      const { error } = await supabase
        .from('activity_category_map')
        .upsert(categoryLinks, { onConflict: 'activity_id,category_id', ignoreDuplicates: true })
      if (error) console.warn('Failed to link imported activities to categories:', error.message)
    }

    // ── 8. 반복 예외 인스턴스 ──
    if (instances.length > 0) {
      const instanceLimit = pLimit(4)
      await Promise.all(
        instances.map((event) =>
          instanceLimit(() => handleRecurringExceptionInstance(supabase, userId, event))
        )
      )
    }

    return {
      ok: true,
      applied: upsertRows.length + deleteCandidateIds.length,
      pushBackIds,
      upsertedIds,
      deleteCandidateIds,
    }
  } catch (error: any) {
    console.error(`[applyDelta] Failed for calendar ${calendarId}:`, error.message)
    return { ...EMPTY_DELTA_OUTCOME, ok: false }
  }
}

/** 실행 전체가 끝난 뒤 한 번에 수행하는 soft-delete. */
async function softDeleteActivities(supabase: any, userId: string, ids: string[]) {
  if (ids.length === 0) return
  const deletedAt = new Date().toISOString()
  for (const part of chunk(ids, IN_FILTER_CHUNK)) {
    // ★ 구글 연결 정보(google_event_id / calendar_id / ical_uid)는 지우지 않는다 ★
    //
    // 예전에는 함께 null로 비웠는데, 그러면 사용자가 휴지통에서 복구했을 때
    // 앱이 "구글에 존재한 적 없는 일정"으로 판단해 **새 이벤트를 만들어** 중복이 생긴다.
    // 링크를 남겨 두면 복구 시 기존 이벤트를 그대로 갱신하고,
    // 구글 쪽이 실제로 사라졌다면 404/409 복구 경로가 알아서 다시 만든다.
    const { error } = await supabase
      .from('activities')
      .update({ deleted_at: deletedAt })
      .eq('user_id', userId)
      .in('id', part)
    if (error) throw new Error(`activities soft-delete failed: ${error.message}`)
  }
}

/** upsert 페이로드. 모든 행이 동일한 키 집합을 가져야 PostgREST 벌크 upsert가 성립한다. */
function buildActivityRow(
  id: string,
  userId: string,
  event: calendar_v3.Schema$Event,
  times: { startTime: string; endTime: string; isAllDay: boolean },
  calendarId: string,
  googleMtime: number
) {
  return {
    id,
    user_id: userId,
    title: event.summary || '제목 없음',
    memo: event.description || '',
    start_time: times.startTime,
    end_time: times.endTime,
    is_all_day: times.isAllDay,
    reminders:
      event.reminders?.useDefault === false && event.reminders.overrides
        ? event.reminders.overrides.map((r) => ({ method: r.method, minutes: r.minutes }))
        : [],
    recurrence_rule: getRecurrenceRuleFromEvent(event),
    google_event_id: event.id as string,
    google_calendar_id: calendarId,
    google_ical_uid: event.iCalUID || null,
    google_synced_at: new Date(googleMtime).toISOString(),
  }
}

/** 내용은 그대로 두고 끊어진 연결 정보만 다시 이어 붙이는 행. */
function buildLinkRepairRow(match: any, event: calendar_v3.Schema$Event, calendarId: string) {
  return {
    id: match.id,
    user_id: match.user_id,
    title: match.title,
    memo: match.memo,
    start_time: match.start_time,
    end_time: match.end_time,
    is_all_day: match.is_all_day,
    reminders: match.reminders ?? [],
    recurrence_rule: match.recurrence_rule,
    google_event_id: event.id as string,
    google_calendar_id: calendarId,
    google_ical_uid: event.iCalUID || match.google_ical_uid || null,
    google_synced_at: match.google_synced_at,
  }
}

/**
 * 이 취소 이벤트가 활동이 **지금 연결하고 있는** 바로 그 이벤트인지.
 *
 * 아니라면 이미 대체된 옛 사본의 흔적이므로 삭제 근거가 되지 못한다.
 * 판단이 서지 않을 때는 지우지 않는 쪽을 택한다 —
 * 놓친 삭제는 사용자가 다시 지우면 되지만, 잘못된 삭제는 일정을 잃는 일이다.
 */
function isCurrentGoogleLink(
  match: any,
  event: calendar_v3.Schema$Event,
  calendarId: string
): boolean {
  // 연결이 없는 활동은 구글 이벤트의 생사와 무관하다.
  if (!match.google_event_id) return false
  // 다른 이벤트 id의 tombstone → 옛 사본
  if (match.google_event_id !== event.id) return false
  // 이미 다른 캘린더로 옮겨간 뒤 출발지에서 온 tombstone
  if (match.google_calendar_id && match.google_calendar_id !== calendarId) return false
  return true
}

function needsLinkRepair(match: any, event: calendar_v3.Schema$Event, calendarId: string): boolean {
  if (match.google_event_id !== event.id) return true
  if (match.google_calendar_id !== calendarId) return true
  if (event.iCalUID && match.google_ical_uid !== event.iCalUID) return true
  return false
}

/**
 * 지문 폴백 인덱스를 만든다.
 * 대상 이벤트들의 시작시각 범위 안에서, 아직 구글과 연결되지 않은 활성 일정만 훑는다.
 */
async function buildFingerprintIndex(
  supabase: any,
  userId: string,
  candidates: calendar_v3.Schema$Event[]
): Promise<Map<string, any>> {
  const index = new Map<string, any>()
  if (candidates.length === 0) return index

  const starts: number[] = []
  for (const event of candidates) {
    const times = eventTimesToUtc(event)
    if (times) starts.push(Date.parse(times.startTime))
  }
  if (starts.length === 0) return index

  const min = new Date(Math.min(...starts)).toISOString()
  const max = new Date(Math.max(...starts)).toISOString()

  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_SYNC_COLUMNS)
    .eq('user_id', userId)
    .is('google_event_id', null)
    .is('deleted_at', null)
    .gte('start_time', min)
    .lte('start_time', max)
    .limit(FINGERPRINT_SCAN_LIMIT)

  if (error || !data) return index

  for (const row of data) {
    const key = fingerprintKey(row.title, row.start_time)
    // 같은 지문이 여럿이면 모호하므로 후보에서 제외한다(엉뚱한 일정에 붙는 것보다 안전).
    if (index.has(key)) index.set(key, null)
    else index.set(key, row)
  }
  return index
}

function lookupFingerprint(
  index: Map<string, any>,
  event: calendar_v3.Schema$Event,
  claimed: Set<string>
): any | null {
  if (index.size === 0) return null
  const times = eventTimesToUtc(event)
  if (!times) return null

  const row = index.get(fingerprintKey(event.summary, times.startTime))
  if (!row || claimed.has(row.id)) return null

  claimed.add(row.id)
  return row
}

/**
 * 수입된 이벤트를 카테고리에 배정한다(스마트 라우팅).
 * 1:1 매핑이면 즉시 배정하고, N:1이면 제목/메모에 카테고리 이름이 있는지 본다.
 * 판단이 안 되면 배정하지 않아 "분류 대기" 상태로 남는다.
 */
function routeCategory(
  ctx: DeltaContext,
  event: calendar_v3.Schema$Event,
  calendarId: string
): string | null {
  const mapping = ctx.settings.groupMapping
  if (!mapping) return null

  const mappedCategoryIds = Object.entries(mapping)
    .filter(([, calId]) => calId === calendarId)
    .map(([catId]) => catId)

  if (mappedCategoryIds.length === 0) return null
  if (mappedCategoryIds.length === 1) return mappedCategoryIds[0]

  const haystack = `${event.summary || ''} ${event.description || ''}`.toLowerCase()
  for (const catId of mappedCategoryIds) {
    const cat = ctx.userCategories.find((c) => c.id === catId)
    if (cat && haystack.includes(cat.name.toLowerCase())) return catId
  }
  return null
}

/**
 * Google이 보낸 반복 예외 인스턴스(recurringEventId 보유)를 Calentask의 자식 예외 행으로 반영한다.
 * - 취소(status=cancelled) 회차 → soft-deleted 자식 예외 (해당 회차만 삭제)
 * - 수정(confirmed) 회차 → 자식 예외 생성/갱신 (해당 회차만 변경)
 */
async function handleRecurringExceptionInstance(supabase: any, userId: string, event: any) {
  try {
    const recurringEventId: string = event.recurringEventId
    const isCancelled = event.status === 'cancelled'

    // 마스터 activity 찾기: Custom ID 역변환 → 실패 시 google_event_id 조회
    let masterId: string | null = null
    const candidate = fromGoogleEventId(recurringEventId)
    if (candidate) {
      const { data } = await supabase
        .from('activities')
        .select('id')
        .eq('user_id', userId)
        .eq('id', candidate)
        .maybeSingle()
      if (data) masterId = data.id
    }
    if (!masterId) {
      const { data } = await supabase
        .from('activities')
        .select('id')
        .eq('user_id', userId)
        .eq('google_event_id', recurringEventId)
        .maybeSingle()
      if (data) masterId = data.id
    }
    if (!masterId) return // Calentask 시리즈가 아님 → 무시

    const origStart = event.originalStartTime?.dateTime || event.originalStartTime?.date
    if (!origStart) return
    const origStartUtc = new Date(origStart).toISOString()

    const { data: existingChild } = await supabase
      .from('activities')
      .select('id, deleted_at')
      .eq('user_id', userId)
      .eq('parent_activity_id', masterId)
      .eq('original_start_time', origStartUtc)
      .maybeSingle()

    if (isCancelled) {
      if (existingChild) {
        if (!existingChild.deleted_at) {
          await supabase
            .from('activities')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', existingChild.id)
            .eq('user_id', userId)
        }
      } else {
        await supabase.from('activities').insert({
          user_id: userId,
          title: event.summary || '제목 없음',
          start_time: origStartUtc,
          end_time: origStartUtc,
          is_all_day: !!event.originalStartTime?.date,
          type: 'EVENT',
          parent_activity_id: masterId,
          original_start_time: origStartUtc,
          deleted_at: new Date().toISOString(),
        })
      }
      return
    }

    const times = eventTimesToUtc(event)
    if (!times) return

    const payload: any = {
      title: event.summary || '제목 없음',
      memo: event.description || '',
      start_time: times.startTime,
      end_time: times.endTime,
      is_all_day: times.isAllDay,
      reminders:
        event.reminders?.useDefault === false && event.reminders?.overrides
          ? event.reminders.overrides.map((r: any) => ({ method: r.method, minutes: r.minutes }))
          : [],
      parent_activity_id: masterId,
      original_start_time: origStartUtc,
      google_event_id: event.id,
      google_ical_uid: event.iCalUID || null,
      google_synced_at: event.updated || new Date().toISOString(),
      deleted_at: null,
    }

    if (existingChild) {
      await supabase.from('activities').update(payload).eq('id', existingChild.id).eq('user_id', userId)
    } else {
      await supabase.from('activities').insert({ user_id: userId, type: 'EVENT', ...payload })
    }
  } catch (e) {
    console.error('[handleRecurringExceptionInstance] error:', e)
  }
}

/** 로컬이 더 최신이라 구글 변경을 물리친 일정을 구글로 밀어 올려 양쪽을 수렴시킨다. */
async function pushBackToGoogle(userId: string, supabase: any, activityIds: string[]) {
  try {
    const { data: activities } = await supabase
      .from('activities')
      .select('*, activity_category_map(categories(id, name, hex_color))')
      .eq('user_id', userId)
      .in('id', activityIds)
      .is('deleted_at', null)

    if (!activities?.length) return

    const limit = pLimit(3)
    await Promise.allSettled(
      activities.map((activity: any) =>
        limit(() => {
          const categories = (activity.activity_category_map || [])
            .map((m: any) => m.categories)
            .filter(Boolean)
          return syncActivityToGoogle(userId, activity, categories)
        })
      )
    )
  } catch (error) {
    console.error('[pushBackToGoogle] failed:', error)
  }
}

// ─────────────────────────────────────────────────────────────
// 캘린더 관리
// ─────────────────────────────────────────────────────────────

export async function fetchGoogleCalendars(userId: string) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return []

    const calendar = google.calendar({ version: 'v3', auth })
    const calendarList = await withRetry(() => calendar.calendarList.list({ maxResults: 250 }))

    return (
      calendarList.data.items
        ?.filter((item) => !item.deleted)
        .map((item) => ({
          id: item.id,
          summary: item.summary,
          description: item.description,
          primary: item.primary,
          accessRole: item.accessRole,
          backgroundColor: item.backgroundColor,
        })) || []
    )
  } catch (error) {
    console.error('Failed to fetch Google calendars:', error)
    return []
  }
}

/**
 * Creates a new Google Calendar with the given name.
 * Returns { id, summary }.
 */
export async function createGoogleCalendar(userId: string, name: string) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return null

    const calendar = google.calendar({ version: 'v3', auth })
    const newCalendar = await withRetry(() =>
      calendar.calendars.insert({
        requestBody: { summary: name, description: 'Created by Calentask for group mapping' },
      })
    )

    if (newCalendar.data.id) {
      return { id: newCalendar.data.id, summary: newCalendar.data.summary || name }
    }
    return null
  } catch (error) {
    console.error('Failed to create Google Calendar:', error)
    return null
  }
}

export async function updateGoogleCalendarMeta(
  userId: string,
  calendarId: string,
  summary?: string,
  backgroundColor?: string
) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return null

    const calendar = google.calendar({ version: 'v3', auth })

    if (summary) {
      await calendar.calendars.patch({ calendarId, requestBody: { summary } })
    }
    if (backgroundColor) {
      await calendar.calendarList.patch({
        calendarId,
        colorRgbFormat: true,
        requestBody: { backgroundColor },
      })
    }

    return true
  } catch (error) {
    console.error('Failed to update Google Calendar meta:', error)
    throw error
  }
}

export async function deleteGoogleCalendar(userId: string, calendarId: string) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return false

    const calendar = google.calendar({ version: 'v3', auth })
    await calendar.calendars.delete({ calendarId })
    invalidateCalendarCache(userId, calendarId)
    return true
  } catch (error) {
    console.error('Failed to delete Google Calendar:', error)
    throw error
  }
}

/**
 * Migrates events from one calendar to another.
 */
export async function migrateCategoryActivitiesToCalendar(
  userId: string,
  categoryId: string,
  oldCalendarId: string,
  newCalendarId: string
) {
  try {
    const supabase = createAdminClient()

    const { data: activityMaps } = await supabase
      .from('activity_category_map')
      .select('activity_id')
      .eq('category_id', categoryId)

    if (!activityMaps || activityMaps.length === 0) return { success: true, movedCount: 0 }

    const calentaskIdSet = new Set(activityMaps.map((m: any) => m.activity_id))

    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return { success: false, reason: 'no_auth' }

    const calendar = google.calendar({ version: 'v3', auth })
    let movedCount = 0
    const movedActivityIds: string[] = []
    const limit = pLimit(5)

    let pageToken: string | null | undefined
    do {
      const res: any = await withRetry(() =>
        // privateExtendedProperty는 `key=value`만 지원하므로 전체를 받아 클라이언트에서 거른다.
        calendar.events.list({
          calendarId: oldCalendarId,
          maxResults: 250,
          singleEvents: false,
          showDeleted: false,
          pageToken: pageToken || undefined,
        })
      )

      const eventsToMove = (res.data.items || []).filter((event: any) => {
        const calentaskId = event.extendedProperties?.private?.calentask_id
        return calentaskId && calentaskIdSet.has(calentaskId)
      })

      const moveResults = await Promise.allSettled(
        eventsToMove.map((event: any) =>
          limit(async () => {
            await withRetry(() =>
              calendar.events.move({
                calendarId: oldCalendarId,
                eventId: event.id as string,
                destination: newCalendarId,
              })
            )
            movedCount++
            movedActivityIds.push(event.extendedProperties.private.calentask_id)
          })
        )
      )

      moveResults.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.warn(`Failed to move event ${eventsToMove[i]?.id}:`, (result.reason as any)?.message)
        }
      })

      pageToken = res.data.nextPageToken
    } while (pageToken)

    // 이동한 일정의 위치 정보를 갱신해야 이후 push가 올바른 캘린더를 찾는다.
    for (const part of chunk(movedActivityIds, IN_FILTER_CHUNK)) {
      await supabase
        .from('activities')
        .update({ google_calendar_id: newCalendarId })
        .eq('user_id', userId)
        .in('id', part)
    }

    if (movedCount > 0) {
      await logSyncHistory(supabase, {
        userId,
        calendarId: newCalendarId,
        action: 'MIGRATED',
        categoryId,
        activityTitle: `카테고리 캘린더 이동 (${movedCount}건)`,
        metadata: { from: oldCalendarId, to: newCalendarId },
      })
    }

    return { success: true, movedCount }
  } catch (error: any) {
    console.error('Failed to migrate activities:', error)
    await logSyncHistory(createAdminClient(), {
      userId,
      calendarId: newCalendarId,
      action: 'ERROR',
      errorMessage: `캘린더 이동 실패: ${error.message}`,
      categoryId,
    })
    throw error
  }
}

// ─────────────────────────────────────────────────────────────
// 중복 정리
// ─────────────────────────────────────────────────────────────

/**
 * 같은 Calentask 일정이 여러 캘린더에 사본으로 흩어져 있으면 하나만 남기고 정리한다.
 *
 * 목적지가 바뀌었을 때 `events.move` 대신 신규 insert를 하던 시절에 만들어진 중복을
 * 실제로 걷어낸다. 활동마다 캘린더를 뒤지면 왕복이 (일정 수 × 캘린더 수)로 폭발하므로,
 * 캘린더별로 **한 번씩만** 훑어 태그 목록을 모은 뒤 메모리에서 대조한다.
 */
export async function reconcileGoogleDuplicates(
  userId: string
): Promise<{ removed: number; relinked: number }> {
  const supabase = createAdminClient()

  const { data: user } = await supabase
    .from('users')
    .select('google_sync_settings, google_refresh_token')
    .eq('id', userId)
    .single()

  if (!user?.google_refresh_token) return { removed: 0, relinked: 0 }
  const settings: GoogleSyncSettings = user.google_sync_settings || {}

  const auth = buildOAuthClient(user.google_refresh_token)
  const calendar = google.calendar({ version: 'v3', auth })
  const scope = await resolveSyncScope(userId, auth, supabase, settings)
  if (!scope) return { removed: 0, relinked: 0 }

  // 1) 우리가 쓰는 캘린더들을 한 번씩 훑어 calentask_id 태그가 붙은 사본을 모은다.
  type Copy = { calendarId: string; eventId: string; updatedMs: number }
  const copiesByActivity = new Map<string, Copy[]>()

  for (const calId of scope.searchCalendarIds) {
    let pageToken: string | undefined
    try {
      do {
        const res = await withRetry(() =>
          calendar.events.list({
            calendarId: calId,
            maxResults: 250,
            singleEvents: false,
            showDeleted: false,
            pageToken,
          })
        )
        for (const event of res.data.items || []) {
          const tag = event.extendedProperties?.private?.calentask_id
          // 반복 예외 인스턴스는 마스터에 종속되므로 중복 판단 대상이 아니다.
          if (!tag || !event.id || event.recurringEventId) continue
          const list = copiesByActivity.get(tag) || []
          list.push({
            calendarId: calId,
            eventId: event.id,
            updatedMs: event.updated ? Date.parse(event.updated) : 0,
          })
          copiesByActivity.set(tag, list)
        }
        pageToken = res.data.nextPageToken ?? undefined
      } while (pageToken)
    } catch (err: any) {
      console.warn(`[reconcile] Failed to scan calendar ${calId}:`, err.message)
    }
  }

  if (copiesByActivity.size === 0) return { removed: 0, relinked: 0 }

  // 2) 태그가 가리키는 활동들의 현재 링크와 목적지를 한 번에 읽는다.
  const activityIds = [...copiesByActivity.keys()]
  const desiredById = new Map<string, string>()
  const currentLinkById = new Map<string, { eventId: string | null; calendarId: string | null }>()

  for (const part of chunk(activityIds, IN_FILTER_CHUNK)) {
    const { data } = await supabase
      .from('activities')
      .select('id, google_event_id, google_calendar_id, activity_category_map(categories(id))')
      .eq('user_id', userId)
      .in('id', part)
    for (const row of data || []) {
      const categories = (row.activity_category_map || [])
        .map((m: any) => m.categories)
        .filter(Boolean)
      desiredById.set(row.id, desiredCalendarFor(categories, settings, scope))
      currentLinkById.set(row.id, {
        eventId: row.google_event_id,
        calendarId: row.google_calendar_id,
      })
    }
  }

  // 3) 구글의 실물을 기준으로 DB 링크를 맞추고(끊겼으면 복구), 여분 사본을 삭제한다.
  const limit = pLimit(5)
  let removed = 0
  let relinked = 0

  for (const [activityId, list] of copiesByActivity.entries()) {
    // 태그가 가리키는 활동이 DB에 없으면(영구 삭제됨) 손대지 않는다.
    if (!currentLinkById.has(activityId)) continue
    const desired = desiredById.get(activityId) || scope.writeCalendarId
    const keep =
      list.find((c) => c.calendarId === desired) ||
      [...list].sort((a, b) => b.updatedMs - a.updatedMs)[0]

    // ★ 순서가 중요하다 ★
    // DB 링크를 **먼저** 남길 사본으로 옮겨 놓아야, 곧이어 도착할 삭제 웹훅이
    // "이미 대체된 옛 사본의 tombstone"으로 올바르게 판정되어 무시된다.
    // 삭제를 먼저 하면 그 사이 도착한 웹훅이 활동을 지워버릴 수 있다.
    //
    // 링크가 끊긴 활동(google_event_id가 비어 있음)도 여기서 되살아난다.
    // 구글에 실물이 있는데 DB가 그걸 모르면, push가 새 이벤트를 만들어 중복이 되기 때문이다.
    const current = currentLinkById.get(activityId)
    const linkChanged =
      current?.eventId !== keep.eventId || current?.calendarId !== keep.calendarId

    if (linkChanged) {
      await supabase
        .from('activities')
        .update({
          google_event_id: keep.eventId,
          google_calendar_id: keep.calendarId,
          google_content_hash: null,
        })
        .eq('id', activityId)
        .eq('user_id', userId)
      relinked++
    }

    const strays = list.filter((c) => c !== keep)
    if (strays.length === 0) continue
    await Promise.allSettled(
      strays.map((copy) =>
        limit(async () => {
          try {
            await withRetry(() =>
              calendar.events.delete({ calendarId: copy.calendarId, eventId: copy.eventId })
            )
            removed++
          } catch (err: any) {
            if (!isGoogleError(err, 404) && !isGoogleError(err, 410)) {
              console.warn(`[reconcile] Failed to remove duplicate ${copy.eventId}:`, err.message)
            }
          }
        })
      )
    )
  }

  if (removed > 0 || relinked > 0) {
    await logSyncHistory(supabase, {
      userId,
      calendarId: 'ALL',
      action: 'DELETED',
      activityTitle: `구글 연결 정리 (중복 ${removed}건 제거, 링크 ${relinked}건 복구)`,
    })
  }

  return { removed, relinked }
}

// ─────────────────────────────────────────────────────────────
// 배치 push
// ─────────────────────────────────────────────────────────────

export interface SyncProgressEvent {
  id?: string
  title: string
  /**
   * synced       내보내기 완료(생성 또는 갱신)
   * skipped      마지막 전송 이후 바뀐 게 없어 건너뜀
   * task_skipped 할 일(TASK)이라 캘린더 대상이 아님
   * failed       실패
   */
  status: 'synced' | 'skipped' | 'failed' | 'task_skipped'
  current: number
  error?: string
}

export interface BatchSyncResult {
  synced: number
  skipped: number
  taskSkipped: number
  failed: number
  failedItems: Array<{ id: string; title: string; error: string }>
}

/**
 * Batch syncs activities to Google Calendar.
 *
 * 기존 구현은 항목마다 `sync_history`를 조회해 목적지 캘린더를 역추적하고(DB 왕복 N회),
 * 안전을 위해 `pLimit(1)` + 고정 500ms 지연을 걸어 초당 2건까지 떨어져 있었다.
 * 이제 위치는 activities.google_calendar_id가 직접 들고 있으므로 역추적이 사라졌고,
 * 지수 백오프 재시도를 믿고 동시성을 올렸다.
 */
export async function syncBatchActivitiesToGoogle(
  userId: string,
  activities: any[],
  onProgress?: (event: SyncProgressEvent) => void
): Promise<BatchSyncResult> {
  const result: BatchSyncResult = { synced: 0, skipped: 0, taskSkipped: 0, failed: 0, failedItems: [] }
  if (!activities || activities.length === 0) return result

  try {
    const supabase = createAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('google_sync_settings, google_refresh_token')
      .eq('id', userId)
      .single()

    if (!user?.google_refresh_token) throw new Error('No auth client')
    const settings: GoogleSyncSettings = user.google_sync_settings || {}
    if (settings.direction === 'IMPORT_ONLY') return result

    const auth = buildOAuthClient(user.google_refresh_token)
    const calendar = google.calendar({ version: 'v3', auth })

    const scope = await resolveSyncScope(userId, auth, supabase, settings)
    if (!scope) throw new Error('No calendar ID')

    // 예전에는 여기서 캘린더 목록을 받아 "저장된 위치가 아직 살아있는지" 검증했다.
    // 이제 목적지는 저장된 위치가 아니라 설정이 정하고, 실존 여부는 placeEvent가
    // 실제 조회로 확인하므로 이 왕복은 필요 없다.

    let processedCount = 0
    const limit = pLimit(3)

    const tasks = activities.map((activity) =>
      limit(async () => {
        try {
          if (activity.type === 'TASK') {
            result.taskSkipped++
            processedCount++
            onProgress?.({
              id: activity.id,
              title: activity.title || '(할 일)',
              status: 'task_skipped',
              current: processedCount,
            })
            return
          }

          const categories = Array.isArray(activity.activity_category_map)
            ? activity.activity_category_map.map((acm: any) => acm.categories).filter(Boolean)
            : []

          // 목적지는 오직 설정(그룹 및 라우팅 → 기본 쓰기 캘린더)이 정한다.
          // 현재 위치(google_calendar_id)를 우선하면 고급 설정을 바꿔도 반영되지 않는다.
          const desiredCalendarId = desiredCalendarFor(categories, settings, scope)

          const eventBody = mapActivityToGoogleEvent(activity, categories, settings) as any

          // 이미 최신이면 구글 왕복 자체를 건너뛴다.
          // 해시에 목적지가 포함되어 있어 라우팅이 바뀌면 반드시 다시 계산된다.
          const contentHash = eventPayloadHash(eventBody, desiredCalendarId)
          if (
            activity.google_event_id &&
            activity.google_calendar_id === desiredCalendarId &&
            activity.google_content_hash === contentHash
          ) {
            result.skipped++
            processedCount++
            onProgress?.({
              id: activity.id,
              title: activity.title,
              status: 'skipped',
              current: processedCount,
            })
            return
          }

          if (activity.parent_activity_id) {
            await attachRecurringParent(calendar, desiredCalendarId, activity, eventBody)
          }

          // 이동이 필요하면 events.move로 **옮긴다**. 새로 만들면 원본이 남아 중복이 된다.
          const placed = await placeEvent(calendar, {
            activity,
            eventBody,
            desiredCalendarId,
            candidateCalendarIds: scope.searchCalendarIds,
            writableCalendarIds: scope.writableCalendarIds,
          })

          const finalEventId = placed.event?.id || toGoogleEventId(activity.id)
          await persistPushResult(
            supabase,
            userId,
            activity.id,
            placed.calendarId,
            placed.event,
            finalEventId,
            eventPayloadHash(eventBody, placed.calendarId)
          )

          result.synced++
          processedCount++
          onProgress?.({ id: activity.id, title: activity.title, status: 'synced', current: processedCount })
        } catch (err: any) {
          console.error(`Failed to sync activity ${activity.id}:`, err)
          result.failed++
          result.failedItems.push({ id: activity.id, title: activity.title, error: err.message })
          processedCount++
          onProgress?.({
            id: activity.id,
            title: activity.title,
            status: 'failed',
            current: processedCount,
            error: err.message,
          })
        }
      })
    )

    await Promise.allSettled(tasks)

    // 배치 하나하나가 아니라 작업 단위로 남기고 싶으므로, 실제로 구글에 쓴 게 있을 때만 기록한다.
    if (result.synced > 0 || result.failed > 0) {
      await logSyncHistory(supabase, {
        userId,
        calendarId: 'ALL',
        action: 'BATCH_SYNC',
        status: result.failed > 0 ? 'FAILED' : 'SUCCESS',
        activityTitle: `배치 동기화: ${result.synced}건 반영, ${result.skipped}건 건너뜀, ${result.failed}건 실패`,
      })
    }
  } catch (error: any) {
    console.error('Failed to process batch sync:', error)
    await logSyncHistory(createAdminClient(), {
      userId,
      calendarId: 'unknown',
      action: 'ERROR',
      errorMessage: `배치 동기화 실패: ${error.message}`,
    })
    throw error
  }

  return result
}
