import { google } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/server'
import pLimit from 'p-limit'

export interface GoogleSyncSettings {
  direction?: 'TWO_WAY' | 'EXPORT_ONLY' | 'IMPORT_ONLY'
  conflictStrategy?: 'LATEST_WINS' | 'CALENTASK_WINS' | 'GOOGLE_WINS'
  colorMapping?: Record<string, string>
  groupMapping?: Record<string, string>
  privacyMapping?: Record<string, boolean>
}

/**
 * UUID → Google Calendar Event ID 변환.
 * Google Calendar의 커스텀 Event ID는 base32hex(a-v, 0-9)만 허용.
 * UUID의 hex(0-9, a-f)는 모두 이 범위 안이므로 하이픈만 제거하면 됨.
 */
export function toGoogleEventId(uuid: string): string {
  return uuid.replace(/-/g, '')
}

/**
 * Google Calendar Event ID → Calentask Activity UUID 역변환.
 * toGoogleEventId의 역함수. 하이픈 없는 hex 32자리를
 * 8-4-4-4-12 형식의 UUID로 복원합니다.
 * 유효한 UUID 형식이 아니면 null을 반환합니다.
 */
export function fromGoogleEventId(googleEventId: string): string | null {
  if (!/^[0-9a-f]{32}$/.test(googleEventId)) return null
  return `${googleEventId.slice(0,8)}-${googleEventId.slice(8,12)}-${googleEventId.slice(12,16)}-${googleEventId.slice(16,20)}-${googleEventId.slice(20)}`
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
      metadata: params.metadata || {}
    })
  } catch (err) {
    console.error('Failed to log sync history:', err)
  }
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

  const oauth2Client = new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // Redirect URI is not needed for backend API calls with refresh token
    `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
  )

  oauth2Client.setCredentials({
    refresh_token: user.google_refresh_token,
  })

  return oauth2Client
}

/**
 * Ensures a dedicated "Calentask" calendar exists or uses the user's custom mapped calendar.
 * Returns the calendar ID.
 */
export async function getSyncCalendarId(userId: string, auth: any, customSupabase?: any, categories: any[] = [], settings?: GoogleSyncSettings): Promise<string | null> {
  const supabase = customSupabase || createAdminClient()
  
  // Check group mapping first
  let targetCalendarId: string | null = null
  if (settings?.groupMapping && categories.length > 0) {
    for (const cat of categories) {
      if (settings.groupMapping[cat.id]) {
        targetCalendarId = settings.groupMapping[cat.id]
        break
      }
    }
  }

  if (targetCalendarId) {
    return targetCalendarId
  }

  const { data: user } = await supabase.from('users').select('google_sync_calendar_id').eq('id', userId).single()

  if (user?.google_sync_calendar_id) {
    return user.google_sync_calendar_id
  }

  const calendar = google.calendar({ version: 'v3', auth })
  
  try {
    // Check if Calentask calendar already exists
    const calendarList = await calendar.calendarList.list()
    const existing = calendarList.data.items?.find(
      (item) => item.summary === 'Calentask' && !item.deleted
    )

    if (existing && existing.id) {
      await supabase.from('users').update({ google_sync_calendar_id: existing.id, google_sync_calendar_name: existing.summary }).eq('id', userId)
      return existing.id
    }

    // Create a new calendar
    const newCalendar = await calendar.calendars.insert({
      requestBody: {
        summary: 'Calentask',
        description: 'Sync calendar for Calentask app',
      },
    })

    if (newCalendar.data.id) {
      await supabase.from('users').update({ google_sync_calendar_id: newCalendar.data.id, google_sync_calendar_name: 'Calentask' }).eq('id', userId)
    }

    return newCalendar.data.id || null
  } catch (error) {
    console.error('Failed to get/create Google calendar:', error)
    return null
  }
}

/**
 * Converts a UTC ISO string to an offset-less local ISO string for a specific timezone
 * This prevents Google Calendar from treating the event's native timezone as UTC.
 */
function getLocalIsoString(utcString: string, timeZone: string = 'Asia/Seoul') {
  const d = new Date(utcString)
  if (isNaN(d.getTime())) return utcString
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  })
  const parts = formatter.formatToParts(d)
  const map: Record<string, string> = {}
  parts.forEach(p => { map[p.type] = p.value })
  // Handles 24:00:00 edge case from some implementations
  const hour = map.hour === '24' ? '00' : map.hour
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}:${map.second}`
}

/**
 * Maps a Calentask Activity to a Google Event payload
 */
function mapActivityToGoogleEvent(activity: any, categories: any[], settings?: GoogleSyncSettings) {
  let colorId = '9'
  if (settings?.colorMapping && categories.length > 0) {
    for (const cat of categories) {
      if (settings.colorMapping[cat.id]) {
        colorId = settings.colorMapping[cat.id]
        break
      }
    }
  } else if (activity.hex_color) {
    colorId = '11'
  }

  let isPrivate = false
  if (settings?.privacyMapping && categories.length > 0) {
    for (const cat of categories) {
      if (settings.privacyMapping[cat.id]) {
        isPrivate = true
        break
      }
    }
  }

  const start = activity.is_all_day 
    ? { date: activity.start_time.split('T')[0] }
    : { dateTime: getLocalIsoString(activity.start_time), timeZone: 'Asia/Seoul' }
  
  const end = activity.is_all_day
    ? { date: activity.end_time.split('T')[0] }
    : { dateTime: getLocalIsoString(activity.end_time), timeZone: 'Asia/Seoul' }

  let reminders: any = { useDefault: true }
  if (activity.reminders && Array.isArray(activity.reminders) && activity.reminders.length > 0) {
    const overrides = activity.reminders.map((r: any) => {
       const minutes = typeof r === 'number' ? r : (r.minutes || 30)
       const method = r.method || 'popup'
       return { method, minutes }
    })
    reminders = {
      useDefault: false,
      overrides
    }
  }

  return {
    summary: isPrivate ? '바쁨' : activity.title,
    description: isPrivate ? '' : (activity.memo || ''),
    visibility: isPrivate ? 'private' : 'default',
    start,
    end,
    colorId,
    reminders,
    ...(activity.recurrence_rule ? { recurrence: [`RRULE:${activity.recurrence_rule}`] } : {}),
    extendedProperties: {
      private: {
        calentask_id: activity.id,
        type: activity.type,
        hex_color: activity.hex_color || '',
      }
    }
  }
}

/**
 * 범용적인 Google API 에러 판별 유틸리티
 */
function isGoogleError(err: any, code: number): boolean {
  if (!err) return false;
  const status = err.response?.status || err.status || parseInt(err.code);
  if (status === code) return true;
  
  const msg = err.message?.toLowerCase() || '';
  if (code === 404 && msg.includes('not found')) return true;
  if (code === 409 && msg.includes('conflict')) return true;
  if (code === 400 && msg.includes('bad request')) return true;
  if (code === 410 && msg.includes('deleted')) return true;
  
  return false;
}

/**
 * Creates or updates an event in Google Calendar.
 * Uses Custom Event ID for O(1) lookup instead of list API search.
 */
export async function syncActivityToGoogle(userId: string, activity: any, categories: any[] = []) {
  try {
    const supabase = createAdminClient()
    const { data: user } = await supabase.from('users').select('google_sync_settings').eq('id', userId).single()
    const settings: GoogleSyncSettings = user?.google_sync_settings || {}

    if (settings.direction === 'IMPORT_ONLY') return

    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return

    let calendarId = await getSyncCalendarId(userId, auth, supabase, categories, settings)
    if (!calendarId) return

    const calendar = google.calendar({ version: 'v3', auth })
    const eventBody = mapActivityToGoogleEvent(activity, categories, settings)

    if (activity.parent_activity_id) {
      const parentEventId = toGoogleEventId(activity.parent_activity_id)
      try {
        await calendar.events.get({ calendarId, eventId: parentEventId })
        ;(eventBody as any).recurringEventId = parentEventId
        if (activity.original_start_time) {
          const originalStart = activity.is_all_day 
            ? { date: activity.original_start_time.split('T')[0] }
            : { dateTime: activity.original_start_time, timeZone: 'Asia/Seoul' }
          ;(eventBody as any).originalStartTime = originalStart
        }
      } catch (parentErr: any) {
        // Fallback: Custom ID로 부모를 못 찾으면 기존 extendedProperty 검색
        if (isGoogleError(parentErr, 404)) {
          try {
            const parentSearchResult = await calendar.events.list({
              calendarId,
              privateExtendedProperty: [`calentask_id=${activity.parent_activity_id}`],
            })
            const existingParentEvent = parentSearchResult.data.items?.[0]
            if (existingParentEvent?.id) {
              (eventBody as any).recurringEventId = existingParentEvent.id
              if (activity.original_start_time) {
                const originalStart = activity.is_all_day 
                  ? { date: activity.original_start_time.split('T')[0] }
                  : { dateTime: activity.original_start_time, timeZone: 'Asia/Seoul' }
                ;(eventBody as any).originalStartTime = originalStart
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }

    const googleEventId = toGoogleEventId(activity.id)
    let finalGoogleEventId = googleEventId

    // 1차 시도: Update (Custom ID 기준)
    try {
      await calendar.events.update({
        calendarId,
        eventId: googleEventId,
        requestBody: eventBody,
      })
      await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId, calendarId, action: 'UPDATED', activityTitle: activity.title, activityStartTime: activity.start_time })
    } catch (updateErr: any) {
      if (isGoogleError(updateErr, 400)) {
        // 색상 매핑 등의 문제로 400 발생 시, 부가 속성 제거하고 재시도
        delete (eventBody as any).colorId
        if ((eventBody as any).reminders) delete (eventBody as any).reminders
        try {
          await calendar.events.update({
            calendarId,
            eventId: googleEventId,
            requestBody: eventBody,
          })
          await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId, calendarId, action: 'UPDATED', activityTitle: activity.title, activityStartTime: activity.start_time, errorMessage: '기본 속성 오류로 인해 일부 속성(색상 등)을 제외하고 동기화되었습니다.' })
          return
        } catch (e) {
          // 그래도 실패하면 아래 로직으로 진행 (updateErr를 그대로 유지)
        }
      }

      if (!isGoogleError(updateErr, 404)) {
        await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId, calendarId, action: 'ERROR', status: 'FAILED', errorMessage: updateErr.message, activityTitle: activity.title, activityStartTime: activity.start_time })
        throw updateErr
      }

      // 404 Not Found 발생 시 (이벤트 없음 OR 캘린더 없음) -> List로 확인
      let searchResult
      try {
        searchResult = await calendar.events.list({
          calendarId,
          privateExtendedProperty: [`calentask_id=${activity.id}`],
        })
      } catch (listErr: any) {
        if (isGoogleError(listErr, 404)) {
          // 캘린더 자체가 없음이 확실함 -> 그룹 매핑 및 설정 초기화 후 새 캘린더 생성
          let updatedSettings = { ...settings }
          let needsSettingsUpdate = false
          
          if (settings.groupMapping) {
            const newMapping = { ...settings.groupMapping }
            for (const [catId, mappedCalId] of Object.entries(newMapping)) {
              if (mappedCalId === calendarId) {
                delete newMapping[catId]
                needsSettingsUpdate = true
              }
            }
            if (needsSettingsUpdate) {
              updatedSettings.groupMapping = newMapping
              await supabase.from('users').update({ google_sync_settings: updatedSettings }).eq('id', userId)
            }
          }
          
          const { data: u } = await supabase.from('users').select('google_sync_calendar_id').eq('id', userId).single()
          if (u?.google_sync_calendar_id === calendarId) {
            await supabase.from('users').update({ google_sync_calendar_id: null, google_sync_calendar_name: null }).eq('id', userId)
          }
          
          const newCalendarId = await getSyncCalendarId(userId, auth, supabase, categories, updatedSettings)
          if (!newCalendarId) {
            throw new Error('Failed to create a new sync calendar.')
          }
          calendarId = newCalendarId // 새 캘린더 아이디로 업데이트

          // 새 캘린더이므로 검색 결과는 무조건 없음
          searchResult = { data: { items: [] } }
        } else {
          throw listErr
        }
      }

      const existingEvent = searchResult.data.items?.[0]
      if (existingEvent?.id) {
        try {
          await calendar.events.update({
            calendarId,
            eventId: existingEvent.id,
            requestBody: eventBody,
          })
          finalGoogleEventId = existingEvent.id
          await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'UPDATED', activityTitle: activity.title, activityStartTime: activity.start_time })
        } catch (fallbackUpdateErr: any) {
          await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'ERROR', status: 'FAILED', errorMessage: fallbackUpdateErr.message, activityTitle: activity.title, activityStartTime: activity.start_time })
          throw fallbackUpdateErr
        }
      } else {
        // 2차 시도: Insert (Custom ID 포함)
        try {
          const inserted = await calendar.events.insert({
            calendarId,
            requestBody: { ...eventBody, id: googleEventId },
          })
          finalGoogleEventId = inserted.data.id || googleEventId
          await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'CREATED', activityTitle: activity.title, activityStartTime: activity.start_time })
        } catch (insertErr: any) {
          let isRecovered = false;

          // 조건 A: 404 & 부모 일정 의존성 오류
          if (isGoogleError(insertErr, 404) && (eventBody as any).recurringEventId) {
            delete (eventBody as any).recurringEventId
            try {
              const retryInsert = await calendar.events.insert({
                calendarId,
                requestBody: { ...eventBody, id: googleEventId }
              })
              finalGoogleEventId = retryInsert.data.id || googleEventId
              await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'CREATED', activityTitle: activity.title, activityStartTime: activity.start_time, errorMessage: '부모 일정을 찾을 수 없어 독립된 일정으로 복구되었습니다.' })
              isRecovered = true;
            } catch (e) {
              insertErr = e // 다음 조건문들 혹은 최후의 수단을 타도록 덮어씀
            }
          }

          // 조건 B: 409 Conflict (삭제된 이벤트의 ID와 충돌)
          if (!isRecovered && isGoogleError(insertErr, 409)) {
            try {
              (eventBody as any).status = 'confirmed'
              const revived = await calendar.events.update({
                calendarId,
                eventId: googleEventId,
                requestBody: eventBody,
              })
              finalGoogleEventId = revived.data.id || googleEventId
              await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'UPDATED', activityTitle: activity.title, activityStartTime: activity.start_time, errorMessage: '삭제된(Tombstone) 일정 아이디 충돌을 극복하고 복구되었습니다.' })
              isRecovered = true;
            } catch (e) {
              insertErr = e
            }
          }

          // 조건 C: 400 Bad Request (colorId 등 유효성)
          if (!isRecovered && isGoogleError(insertErr, 400)) {
            delete (eventBody as any).colorId
            if ((eventBody as any).reminders) delete (eventBody as any).reminders
            try {
              const retryInsert = await calendar.events.insert({
                calendarId,
                requestBody: { ...eventBody, id: googleEventId }
              })
              finalGoogleEventId = retryInsert.data.id || googleEventId
              await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'CREATED', activityTitle: activity.title, activityStartTime: activity.start_time, errorMessage: '속성 유효성 오류(400)로 일부 데이터 제외 후 복구되었습니다.' })
              isRecovered = true;
            } catch (e) {
              insertErr = e
            }
          }

          // 최후의 수단: Custom ID를 버리고 순수 데이터만 Insert
          if (!isRecovered) {
            try {
              delete (eventBody as any).recurringEventId
              delete (eventBody as any).colorId
              if ((eventBody as any).reminders) delete (eventBody as any).reminders

              const fallbackInserted = await calendar.events.insert({
                calendarId,
                requestBody: eventBody,
              })
              finalGoogleEventId = fallbackInserted.data.id || googleEventId
              await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId: finalGoogleEventId, calendarId, action: 'CREATED', activityTitle: activity.title, activityStartTime: activity.start_time, errorMessage: '모든 복구 실패 후 Google 자동 할당 ID로 신규 생성되었습니다.' })
            } catch (finalErr: any) {
              await logSyncHistory(supabase, { userId, activityId: activity.id, googleEventId, calendarId, action: 'ERROR', status: 'FAILED', errorMessage: finalErr.message, activityTitle: activity.title, activityStartTime: activity.start_time })
              throw finalErr
            }
          }
        }
      }
    }

    // activities 테이블에 google_event_id 저장 (히스토리 센터 연동용)
    try {
      await supabase.from('activities').update({ google_event_id: finalGoogleEventId }).eq('id', activity.id)
    } catch (dbErr) {
      console.error('Failed to save google_event_id:', dbErr)
    }
  } catch (error: any) {
    console.error('Failed to sync activity to Google Calendar:', error)
    await logSyncHistory(createAdminClient(), { userId, activityId: activity.id, calendarId: 'unknown', action: 'ERROR', status: 'FAILED', errorMessage: error.message, activityTitle: activity.title, activityStartTime: activity.start_time })
  }
}


/**
 * Deletes an event from Google Calendar.
 * Uses Custom Event ID for direct deletion without search.
 */
export async function deleteActivityFromGoogle(userId: string, activityId: string) {
  try {
    const supabase = createAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('google_sync_settings, google_sync_calendar_id')
      .eq('id', userId)
      .single()
    const settings: GoogleSyncSettings = user?.google_sync_settings || {}

    // IMPORT_ONLY 방향이면 구글에서 삭제하지 않음
    if (settings.direction === 'IMPORT_ONLY') return

    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return

    const calendar = google.calendar({ version: 'v3', auth })
    const googleEventId = toGoogleEventId(activityId)

    // 그룹 매핑된 캘린더를 포함한 모든 캘린더에서 시도
    const calendarIdsToSearch = new Set<string>()
    if (user?.google_sync_calendar_id) calendarIdsToSearch.add(user.google_sync_calendar_id)
    if (settings.groupMapping) {
      Object.values(settings.groupMapping).forEach(id => calendarIdsToSearch.add(id))
    }

    // 기본 캘린더가 없으면 getSyncCalendarId로 찾기
    if (calendarIdsToSearch.size === 0) {
      const defaultCalId = await getSyncCalendarId(userId, auth, supabase)
      if (defaultCalId) calendarIdsToSearch.add(defaultCalId)
    }

    for (const calId of calendarIdsToSearch) {
      try {
        // Custom ID로 직접 삭제 시도 (검색 불필요)
        await calendar.events.delete({
          calendarId: calId,
          eventId: googleEventId,
        })
        await logSyncHistory(supabase, { userId, activityId, googleEventId, calendarId: calId, action: 'DELETED' })
        return // 삭제 성공하면 더 이상 검색하지 않음
      } catch (err: any) {
        if (err.code === 404 || err.code === 410) {
          // Custom ID로 없으면 기존 extendedProperty Fallback 검색
          try {
            const searchResult = await calendar.events.list({
              calendarId: calId,
              privateExtendedProperty: [`calentask_id=${activityId}`],
            })
            const existingEvent = searchResult.data.items?.[0]
            if (existingEvent?.id) {
              await calendar.events.delete({
                calendarId: calId,
                eventId: existingEvent.id,
              })
              await logSyncHistory(supabase, { userId, activityId, googleEventId: existingEvent.id, calendarId: calId, action: 'DELETED' })
              return // 삭제 성공
            }
          } catch (fallbackErr: any) {
            if (fallbackErr.code !== 404 && fallbackErr.code !== 410) {
              console.warn(`Fallback search/delete failed for calendar ${calId}:`, fallbackErr.message)
            }
          }
        } else {
          console.warn(`Failed to delete from calendar ${calId}:`, err.message)
        }
      }
    }
  } catch (error) {
    console.error('Failed to delete activity from Google Calendar:', error)
  }
}

/**
 * 구글 캘린더에 동기화된 Calentask 이벤트를 일괄 삭제합니다.
 * Calentask 앱의 원본 일정은 절대 영향받지 않습니다.
 * 
 * ★ 5단계 안전장치 (Calentask 원본 일정 보호) ★
 * ─────────────────────────────────────────────
 * 구글 캘린더에서 이벤트를 삭제하면, 구글이 실시간 웹훅을 통해
 * "이벤트가 삭제됐다"고 Calentask 서버에 알림을 보냅니다.
 * 이때 양방향 동기화 로직(handleGoogleCalendarSync)이
 * "구글에서 삭제됐으니 Calentask 원본도 삭제해야지"라고 판단하여
 * 원본 일정을 연쇄 삭제(soft-delete)하는 치명적 리스크가 존재합니다.
 * 
 * 이를 방지하기 위해, 구글에 삭제 명령을 보내기 **전에**
 * 아래 5단계의 안전장치를 순서대로 실행합니다:
 * 
 * [1단계] DB google_channel_id NULL 처리
 *    → 웹훅 핸들러(route.ts)가 유저를 찾지 못하게 하여 즉시 차단
 * [2단계] Google channels.stop API 호출
 *    → 구글 측에서 더 이상 웹훅 알림을 보내지 않도록 구독 해제
 * [3단계] 나머지 동기화 설정 전체 초기화
 *    → syncToken, calendarId 등을 비워 혹시 모를 동기화 로직 실행 방지
 * [4단계] activities.google_event_id 일괄 NULL 처리
 *    → Calentask ↔ Google 이벤트 간의 연결 고리를 완전히 절단
 * [5단계] 구글 캘린더 이벤트 삭제 실행
 *    → 이 시점에서 모든 역류(backflow) 경로가 차단된 상태로 안전 삭제
 * 
 * 추후 다시 동기화하고 싶으면 사용자가 동기화를 재시작하면
 * 모든 Calentask 일정이 구글 캘린더에 새로 내보내집니다.
 */
export async function clearSyncedActivitiesFromGoogle(userId: string) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return { success: false, reason: 'no_auth' }

    // 삭제 대상 캘린더 ID 목록을 먼저 수집 (설정 초기화 전에 읽어야 함)
    const { data: user } = await supabase.from('users').select('google_sync_settings, google_sync_calendar_id, google_channel_id, google_resource_id').eq('id', userId).single()
    const settings: GoogleSyncSettings = user?.google_sync_settings || {}
    
    const calendarIdsToClear = new Set<string>()
    if (user?.google_sync_calendar_id) calendarIdsToClear.add(user.google_sync_calendar_id)
    if (settings.groupMapping) {
      Object.values(settings.groupMapping).forEach(id => calendarIdsToClear.add(id))
    }

    const calendar = google.calendar({ version: 'v3', auth })

    // ═══════════════════════════════════════════════════
    // [1단계] DB google_channel_id NULL → 웹훅 핸들러 즉시 차단
    // ═══════════════════════════════════════════════════
    // 웹훅 라우트(route.ts)는 google_channel_id로 유저를 찾습니다.
    // 이 값을 가장 먼저 null로 만들면, 이후 도착하는 모든 웹훅은
    // 유저를 찾지 못해 handleGoogleCalendarSync가 호출되지 않습니다.
    // 이것이 가장 중요한 1차 방어선입니다.
    await supabase.from('users').update({
      google_channel_id: null,
      google_resource_id: null,
    }).eq('id', userId)

    // ═══════════════════════════════════════════════════
    // [2단계] Google channels.stop → 웹훅 구독 해제
    // ═══════════════════════════════════════════════════
    // 구글 측에 "더 이상 알림 보내지 마" 요청을 보냅니다.
    // 1단계에서 이미 DB를 차단했으므로, 이 호출이 실패해도 안전합니다.
    if (user?.google_channel_id && user?.google_resource_id) {
      try {
        await calendar.channels.stop({
          requestBody: {
            id: user.google_channel_id,
            resourceId: user.google_resource_id
          }
        })
      } catch (e: any) {
        // 채널이 이미 만료되었거나 존재하지 않을 수 있음 → 무시해도 안전
        console.warn('Failed to stop google calendar watch channel during clear:', e.message)
      }
    }

    // ═══════════════════════════════════════════════════
    // [3단계] 나머지 동기화 설정 전체 초기화
    // ═══════════════════════════════════════════════════
    // syncToken, calendarId, settings를 비워서 혹시 모를 
    // 동기화 로직(handleGoogleCalendarSync)이 실행되더라도
    // calendarId를 찾지 못해 조기 종료하도록 합니다.
    // ※ google_refresh_token은 보존 → OAuth 연동은 유지됨
    await supabase.from('users').update({
      google_sync_calendar_id: null,
      google_sync_calendar_name: null,
      google_sync_settings: {},
      google_sync_token: null,
      google_channel_expiration: null,
    }).eq('id', userId)

    // ═══════════════════════════════════════════════════
    // [4단계] activities.google_event_id 일괄 NULL
    // ═══════════════════════════════════════════════════
    // Calentask 일정 ↔ 구글 이벤트 간의 연결 고리를 완전히 절단합니다.
    // 이렇게 하면:
    // - Calentask 원본 일정 데이터는 100% 보존됨 (삭제 아님!)
    // - 추후 동기화를 다시 시작하면 모든 일정이 새로 내보내짐
    await supabase
      .from('activities')
      .update({ google_event_id: null })
      .eq('user_id', userId)
      .not('google_event_id', 'is', null)

    // ═══════════════════════════════════════════════════
    // [5단계] 구글 캘린더 이벤트 안전 삭제
    // ═══════════════════════════════════════════════════
    // 이 시점에서는 모든 역류(backflow) 경로가 차단되었으므로,
    // 구글 측 이벤트를 삭제해도 Calentask 원본에 영향이 없습니다.
    let deletedCount = 0
    const limit = pLimit(5)

    for (const calId of calendarIdsToClear) {
      try {
        // Calentask 전용 캘린더인지 확인
        const calMeta = await calendar.calendars.get({ calendarId: calId })
        const isCalentaskCalendar = calMeta.data.summary === 'Calentask' || calMeta.data.description?.includes('Created by Calentask') || calMeta.data.description?.includes('Sync calendar for Calentask')

        if (isCalentaskCalendar) {
          // 전용 캘린더: 통째로 삭제 (모든 이벤트 즉시 소멸)
          await calendar.calendars.delete({ calendarId: calId })
          deletedCount += 999 // 정확한 수를 알 수 없으므로 표시용
          continue
        }

        // 개인 캘린더: calentask_id 태그가 있는 이벤트만 선별 삭제
        let pageToken: string | null | undefined = undefined
        do {
          const res: any = await calendar.events.list({
            calendarId: calId,
            maxResults: 250,
            singleEvents: false,
            showDeleted: false,
            pageToken: pageToken || undefined,
          })
          
          if (res.data.items) {
            const calentaskEvents = res.data.items.filter(
              (event: any) => event.extendedProperties?.private?.calentask_id
            )
            
            const deleteResults = await Promise.allSettled(
              calentaskEvents.map((event: any) =>
                limit(async () => {
                  await calendar.events.delete({
                    calendarId: calId,
                    eventId: event.id as string,
                  })
                  deletedCount++
                })
              )
            )
            
            deleteResults.forEach((result, i) => {
              if (result.status === 'rejected') {
                const err = result.reason
                if (err?.code !== 404 && err?.code !== 410) {
                  console.warn(`Failed to delete event ${calentaskEvents[i]?.id}:`, err?.message)
                }
              }
            })
          }
          pageToken = res.data.nextPageToken
        } while (pageToken)

      } catch (err: any) {
        console.warn(`Failed to clear calendar ${calId}:`, err.message)
      }
    }

    if (deletedCount > 0) {
      await logSyncHistory(supabase, { userId, calendarId: 'ALL', action: 'DELETED', activityTitle: `배치 삭제 (${deletedCount}건)` })
    }

    return { success: true, deletedCount }
  } catch (error: any) {
    console.error('Failed to clear synced activities from Google:', error)
    await logSyncHistory(createAdminClient(), { userId, calendarId: 'unknown', action: 'ERROR', errorMessage: `일괄 삭제 실패: ${error.message}` })
    return { success: false, error: error.message }
  }
}

/**
 * Subscribes to Google Calendar Webhooks (Watch API)

 */
export async function watchGoogleCalendar(userId: string) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return

    const { data: userData } = await supabase
      .from('users')
      .select('google_sync_settings, google_channel_id, google_resource_id, google_channel_expiration')
      .eq('id', userId)
      .single()

    const settings: GoogleSyncSettings = userData?.google_sync_settings || {}

    // 기존 채널이 아직 유효하면 재등록 불필요
    if (userData?.google_channel_id && userData?.google_channel_expiration) {
      const expiration = new Date(userData.google_channel_expiration)
      if (expiration.getTime() > Date.now() + 60 * 60 * 1000) { // 만료 1시간 이상 남음
        return { channelId: userData.google_channel_id, alreadyActive: true }
      }
      // 만료 임박 또는 만료됨 → 기존 채널 정리 시도
      try {
        const calendar = google.calendar({ version: 'v3', auth })
        await calendar.channels.stop({
          requestBody: {
            id: userData.google_channel_id,
            resourceId: userData.google_resource_id,
          }
        })
      } catch {
        // 이미 만료된 채널 정리 실패는 무시
      }
    }

    // Watch할 캘린더 목록 수집 (기본 캘린더 + 그룹 매핑 캘린더)
    const calendarIdsToWatch = new Set<string>()
    const defaultCalId = await getSyncCalendarId(userId, auth, supabase, [], settings)
    if (defaultCalId) calendarIdsToWatch.add(defaultCalId)
    if (settings.groupMapping) {
      Object.values(settings.groupMapping).forEach(id => calendarIdsToWatch.add(id))
    }

    if (calendarIdsToWatch.size === 0) return

    const calendar = google.calendar({ version: 'v3', auth })
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://calentask-orcin.vercel.app'
    const webhookUrl = `${siteUrl}/api/webhooks/google`

    // 첫 번째(기본) 캘린더의 채널 정보를 DB에 저장
    let primaryChannelId = ''
    let primaryResponse: any = null

    for (const calId of calendarIdsToWatch) {
      const channelId = `sync-${crypto.randomUUID()}`
      try {
        const response = await calendar.events.watch({
          calendarId: calId,
          requestBody: {
            id: channelId,
            type: 'web_hook',
            address: webhookUrl,
            token: userId,
          }
        })

        if (!primaryChannelId) {
          primaryChannelId = channelId
          primaryResponse = response
        }
      } catch (watchErr: any) {
        console.warn(`Failed to watch calendar ${calId}:`, watchErr.message)
      }
    }

    if (primaryChannelId && primaryResponse) {
      await supabase
        .from('users')
        .update({
          google_channel_id: primaryChannelId,
          google_resource_id: primaryResponse.data.resourceId,
          google_channel_expiration: primaryResponse.data.expiration ? new Date(parseInt(primaryResponse.data.expiration)).toISOString() : null,
        })
        .eq('id', userId)
    }

    // 초기 동기화 수행
    await handleGoogleCalendarSync(userId, supabase)

    return primaryResponse?.data
  } catch (error) {
    console.error('Failed to watch Google Calendar:', error)
  }
}

/**
 * Handles delta sync with Google Calendar using syncToken.
 * 최적화: Bulk SELECT + Map 조회 + 병렬 업데이트로 N+1 문제 해결.
 */
export async function handleGoogleCalendarSync(userId: string, customSupabase?: any) {
  try {
    const supabase = customSupabase || createAdminClient()

    // ★ 안전장치: 초기화 진행 중(google_channel_id가 null)이면 조기 종료 ★
    // 이 함수가 웹훅에 의해 호출될 때, clearSyncedActivitiesFromGoogle이
    // 이미 1단계(channel_id NULL)를 실행한 상태라면 동기화를 수행해서는 안 됩니다.
    // getSyncCalendarId가 캘린더를 자동으로 재발견/재생성하여
    // 초기화 작업을 무효화하는 위험을 차단합니다.
    const { data: channelCheck } = await supabase
      .from('users')
      .select('google_channel_id')
      .eq('id', userId)
      .single()
    
    if (!channelCheck?.google_channel_id) {
      // 웹훅 채널이 비활성 상태 → 초기화 중이거나 동기화 미설정
      // 단, watchGoogleCalendar 내부의 초기 동기화 호출은 정상 진행되어야 하므로,
      // 이 시점에서 google_sync_calendar_id도 없으면 완전히 미설정 상태로 판단
      const { data: syncCheck } = await supabase
        .from('users')
        .select('google_sync_calendar_id')
        .eq('id', userId)
        .single()
      
      if (!syncCheck?.google_sync_calendar_id) {
        return // 동기화 미설정 또는 초기화 진행 중 → 안전하게 종료
      }
    }

    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return

    const calendarId = await getSyncCalendarId(userId, auth, supabase)
    if (!calendarId) return

    const calendar = google.calendar({ version: 'v3', auth })
    
    const { data: user } = await supabase
      .from('users')
      .select('google_sync_token, google_sync_settings')
      .eq('id', userId)
      .single()
      
    const settings: GoogleSyncSettings = user?.google_sync_settings || {}
    let rawSyncToken = user?.google_sync_token

    // 다중 캘린더 목록 수집
    const calendarIdsToSync = new Set<string>()
    calendarIdsToSync.add(calendarId)
    if (settings.groupMapping) {
      Object.values(settings.groupMapping).forEach(id => calendarIdsToSync.add(id))
    }

    // JSON 토큰 파싱
    let syncTokensMap: Record<string, string> = {}
    if (rawSyncToken) {
      if (rawSyncToken.startsWith('{')) {
        try {
          syncTokensMap = JSON.parse(rawSyncToken)
        } catch {
          syncTokensMap = {}
        }
      } else {
        // 기존 단일 토큰 마이그레이션
        syncTokensMap[calendarId] = rawSyncToken
      }
    }

    let items: any[] = []
    let has410Error = false

    for (const calId of calendarIdsToSync) {
      let requestParams: any = { calendarId: calId }
      let currentSyncToken = syncTokensMap[calId]

      if (currentSyncToken) {
        requestParams.syncToken = currentSyncToken
      } else {
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        requestParams.timeMin = oneYearAgo.toISOString()
      }

      let pageToken = undefined

      try {
        do {
          requestParams.pageToken = pageToken
          const response = await calendar.events.list(requestParams)
          
          if (response.data.items) {
            // 어느 캘린더에서 왔는지 추적하기 위해 __calendarId 추가
            items = items.concat(response.data.items.map(item => ({ ...item, __calendarId: calId })))
          }
          
          pageToken = response.data.nextPageToken
          if (response.data.nextSyncToken) {
            currentSyncToken = response.data.nextSyncToken
          }
        } while (pageToken)
        
        syncTokensMap[calId] = currentSyncToken
      } catch (err: any) {
        if (err.code === 410) {
          console.warn(`Sync token invalid for ${calId}, will retry on next sync`)
          delete syncTokensMap[calId]
          has410Error = true
        } else {
          console.warn(`Failed to sync calendar ${calId}:`, err.message, err.response?.data || err.errors)
        }
      }
    }

    // 변경된 토큰 상태 저장
    const newRawSyncToken = Object.keys(syncTokensMap).length > 0 ? JSON.stringify(syncTokensMap) : null
    await supabase.from('users').update({ google_sync_token: newRawSyncToken }).eq('id', userId)

    if (has410Error) {
      return handleGoogleCalendarSync(userId, supabase)
    }

    if (settings.direction !== 'EXPORT_ONLY') {
      const conflictStrategy = settings.conflictStrategy || 'LATEST_WINS'

      // Bulk SELECT: 모든 calentask_id를 수집하여 1회 쿼리로 조회
      const calentaskIds = items
        .map(event => event.extendedProperties?.private?.calentask_id)
        .filter(Boolean) as string[]

      let activityMap = new Map<string, any>()
      if (calentaskIds.length > 0) {
        const { data: existingActivities } = await supabase
          .from('activities')
          .select('id, updated_at, deleted_at')
          .in('id', calentaskIds)
        
        if (existingActivities) {
          activityMap = new Map(existingActivities.map((a: any) => [a.id, a]))
        }
      }

      // [강화] calentask_id가 없는 모든 이벤트를 위한 Bulk 조회 (역매핑용)
      // 네이버 캘린더 등 서드파티 앱이 extendedProperties를 제거했을 때 대비
      const orphanEvents = items.filter(
        event => !event.extendedProperties?.private?.calentask_id
      )
      
      let orphanActivityMap = new Map<string, any>()
      if (orphanEvents.length > 0) {
        const candidateActivityIds = orphanEvents.map(e => fromGoogleEventId(e.id as string)).filter(Boolean) as string[]
        const candidateGoogleIds = orphanEvents.map(e => e.id as string)

        if (candidateActivityIds.length > 0) {
          const { data: acts1 } = await supabase.from('activities').select('id, title, start_time, google_event_id, deleted_at, updated_at').eq('user_id', userId).in('id', candidateActivityIds)
          acts1?.forEach((a: any) => orphanActivityMap.set(a.id, a))
        }
        if (candidateGoogleIds.length > 0) {
          const { data: acts2 } = await supabase.from('activities').select('id, title, start_time, google_event_id, deleted_at, updated_at').eq('user_id', userId).in('google_event_id', candidateGoogleIds)
          acts2?.forEach((a: any) => orphanActivityMap.set(a.google_event_id, a))
        }
      }

      // 사용자 카테고리 정보 사전 조회 (스마트 라우팅 용도)
      let userCategories: any[] = []
      if (settings.groupMapping) {
        const { data: cats } = await supabase.from('categories').select('id, name').eq('user_id', userId)
        if (cats) userCategories = cats
      }

      // 업데이트/삽입 작업을 수집하여 병렬 처리
      const updateTasks: Promise<any>[] = []
      const insertTasks: Promise<any>[] = []

      for (const event of items) {
        const isCancelled = event.status === 'cancelled'
        const calentaskId = event.extendedProperties?.private?.calentask_id

        if (calentaskId) {
          const activity = activityMap.get(calentaskId)

          if (activity) {
            const eventUpdated = new Date(event.updated as string).getTime()
            const activityUpdated = new Date(activity.updated_at).getTime()
            
            let shouldUpdate = false
            if (conflictStrategy === 'LATEST_WINS') {
                shouldUpdate = eventUpdated > activityUpdated + 2000
            } else if (conflictStrategy === 'GOOGLE_WINS') {
                shouldUpdate = true
            } else if (conflictStrategy === 'CALENTASK_WINS') {
                shouldUpdate = false
            }

            if (isCancelled && !activity.deleted_at) {
              updateTasks.push(
                (async () => {
                  await supabase
                    .from('activities')
                    .update({ deleted_at: new Date().toISOString(), google_event_id: null })
                    .eq('id', calentaskId)
                  await logSyncHistory(supabase, { userId, activityId: calentaskId, googleEventId: event.id as string, calendarId: event.__calendarId || calendarId, action: 'DELETED', activityTitle: event.summary || '제목 없음' })
                })()
              )
            } else if (!isCancelled && shouldUpdate) {
              const start = event.start?.dateTime || event.start?.date
              const end = event.end?.dateTime || event.end?.date
              const isAllDay = !!event.start?.date
              const reminders = (event.reminders?.useDefault === false && event.reminders?.overrides)
                ? event.reminders.overrides.map((r: any) => ({ method: r.method, minutes: r.minutes }))
                : []
                
                updateTasks.push(
                  (async () => {
                    await supabase
                      .from('activities')
                      .update({
                        title: event.summary || '제목 없음',
                        memo: event.description || '',
                        start_time: start,
                        end_time: end,
                        is_all_day: isAllDay,
                        reminders,
                        google_event_id: event.id as string,
                        updated_at: new Date(event.updated as string).toISOString()
                      })
                      .eq('id', calentaskId)
                    await logSyncHistory(supabase, { userId, activityId: calentaskId, googleEventId: event.id as string, calendarId: event.__calendarId || calendarId, action: 'UPDATED', activityTitle: event.summary || '제목 없음', activityStartTime: start })
                  })()
                )
              }
            }
        } else {
          // ★ 먼저 역매핑으로 기존 activity를 찾아봄 (서드파티가 extendedProperties를 지운 경우 대비) ★
          const possibleActivityId = fromGoogleEventId(event.id as string)
          let matchedActivity = null

          if (possibleActivityId && orphanActivityMap.has(possibleActivityId)) {
            matchedActivity = orphanActivityMap.get(possibleActivityId)
          } else if (orphanActivityMap.has(event.id as string)) {
            matchedActivity = orphanActivityMap.get(event.id as string)
          }

          if (matchedActivity && !matchedActivity.deleted_at) {
            const eventUpdated = new Date(event.updated as string).getTime()
            const activityUpdated = new Date(matchedActivity.updated_at).getTime()
            
            let shouldUpdate = false
            if (conflictStrategy === 'LATEST_WINS') {
                shouldUpdate = eventUpdated > activityUpdated + 2000
            } else if (conflictStrategy === 'GOOGLE_WINS') {
                shouldUpdate = true
            } else if (conflictStrategy === 'CALENTASK_WINS') {
                shouldUpdate = false
            }

            if (isCancelled) {
              updateTasks.push(
                (async () => {
                  const { error } = await supabase
                    .from('activities')
                    .update({ deleted_at: new Date().toISOString(), google_event_id: null })
                    .eq('id', matchedActivity.id)
                    
                  if (error) {
                    console.error(`[handleGoogleCalendarSync] Failed to soft-delete matched activity ${matchedActivity.id}:`, error)
                  } else {
                    await logSyncHistory(supabase, { userId, activityId: matchedActivity.id, googleEventId: event.id as string, calendarId: event.__calendarId || calendarId, action: 'DELETED', activityTitle: event.summary || matchedActivity.title || '제목 없음' })
                  }
                })()
              )
            } else if (!isCancelled && shouldUpdate) {
              const start = event.start?.dateTime || event.start?.date
              const end = event.end?.dateTime || event.end?.date
              const isAllDay = !!event.start?.date
              const reminders = (event.reminders?.useDefault === false && event.reminders?.overrides)
                ? event.reminders.overrides.map((r: any) => ({ method: r.method, minutes: r.minutes }))
                : []
                
                updateTasks.push(
                  (async () => {
                    await supabase
                      .from('activities')
                      .update({
                        title: event.summary || '제목 없음',
                        memo: event.description || '',
                        start_time: start,
                        end_time: end,
                        is_all_day: isAllDay,
                        reminders,
                        google_event_id: event.id as string,
                        updated_at: new Date(event.updated as string).toISOString()
                      })
                      .eq('id', matchedActivity.id)
                    
                    // 서드파티가 지운 calentask_id 복구
                    try {
                      await calendar.events.patch({
                        calendarId: event.__calendarId || calendarId,
                        eventId: event.id as string,
                        requestBody: {
                          extendedProperties: {
                            private: {
                              calentask_id: matchedActivity.id,
                              type: 'EVENT'
                            }
                          }
                        }
                      })
                    } catch (patchErr) {
                      console.warn(`Failed to restore calentask_id for ${event.id}:`, patchErr)
                    }

                    await logSyncHistory(supabase, { userId, activityId: matchedActivity.id, googleEventId: event.id as string, calendarId: event.__calendarId || calendarId, action: 'UPDATED', activityTitle: event.summary || '제목 없음', activityStartTime: start })
                  })()
                )
            }
          } else if (!isCancelled && conflictStrategy !== 'CALENTASK_WINS') {
            // This is a new event created in Google Calendar!
            const start = event.start?.dateTime || event.start?.date
            const end = event.end?.dateTime || event.end?.date
            const isAllDay = !!event.start?.date
            
            const reminders = (event.reminders?.useDefault === false && event.reminders?.overrides)
              ? event.reminders.overrides.map((r: any) => ({ method: r.method, minutes: r.minutes }))
              : []

            // 삽입 + 구글 이벤트에 calentask_id 패치를 순차 처리해야 함 (의존성 있음)
            insertTasks.push(
              (async () => {
                const newActivity = {
                  user_id: userId,
                  title: event.summary || '제목 없음',
                  memo: event.description || '',
                  start_time: start,
                  end_time: end,
                  is_all_day: isAllDay,
                  type: 'EVENT', // default type for imports
                  reminders,
                  google_event_id: event.id as string,
                }
                
                const { data: insertedActivity } = await supabase
                  .from('activities')
                  .insert(newActivity)
                  .select()
                  .single()

                if (insertedActivity) {
                  // [강화] 스마트 카테고리 라우팅 로직 시작
                  const sourceCalendarId = event.__calendarId || calendarId
                  
                  // 해당 캘린더를 목적지로 삼는 모든 카테고리 ID 추출
                  const mappedCategoryIds = Object.entries(settings.groupMapping || {})
                    .filter(([_, calId]) => calId === sourceCalendarId)
                    .map(([catId]) => catId)

                  if (mappedCategoryIds.length > 0) {
                    let targetCategoryId = mappedCategoryIds[0] // 기본값: 매핑된 첫 번째 카테고리 (Fallback)
                    
                    if (mappedCategoryIds.length > 1) {
                      // N:1 매핑 시, 제목(summary) 또는 메모(description)에 카테고리 이름이 포함되어 있는지 검사 (스마트 라우팅)
                      const searchStr = `${event.summary || ''} ${event.description || ''}`.toLowerCase()
                      for (const catId of mappedCategoryIds) {
                        const cat = userCategories.find(c => c.id === catId)
                        if (cat && searchStr.includes(cat.name.toLowerCase())) {
                          targetCategoryId = catId
                          break
                        }
                      }
                    }

                    // activity_category_map 에 연결 정보 INSERT
                    try {
                      await supabase.from('activity_category_map').insert({
                        activity_id: insertedActivity.id,
                        category_id: targetCategoryId
                      })
                    } catch (mapErr) {
                      console.warn(`[handleGoogleCalendarSync] Failed to insert category mapping for ${insertedActivity.id}:`, mapErr)
                    }
                  }
                  // [강화] 스마트 카테고리 라우팅 로직 끝

                  try {
                    await calendar.events.patch({
                      calendarId: event.__calendarId || calendarId,
                      eventId: event.id as string,
                      requestBody: {
                        extendedProperties: {
                          private: {
                            calentask_id: insertedActivity.id,
                            type: 'EVENT'
                          }
                        }
                      }
                    })
                  } catch (patchErr) {
                    console.warn(`[handleGoogleCalendarSync] Failed to patch calentask_id for inserted activity ${insertedActivity.id}:`, patchErr)
                  }
                  await logSyncHistory(supabase, { userId, activityId: insertedActivity.id, googleEventId: event.id as string, calendarId: event.__calendarId || calendarId, action: 'CREATED', activityTitle: event.summary || '제목 없음', activityStartTime: start })
                }
              })()
            )
          }
        }
      }

      // 병렬 실행
      await Promise.allSettled([...updateTasks, ...insertTasks])
    }



  } catch (error) {
    console.error('Error in handleGoogleCalendarSync:', error)
  }
}

export async function fetchGoogleCalendars(userId: string) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return []

    const calendar = google.calendar({ version: 'v3', auth })
    const calendarList = await calendar.calendarList.list()
    
    return calendarList.data.items?.map(item => ({
      id: item.id,
      summary: item.summary,
      description: item.description,
      primary: item.primary,
      backgroundColor: item.backgroundColor
    })) || []
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
    const newCalendar = await calendar.calendars.insert({
      requestBody: {
        summary: name,
        description: `Created by Calentask for group mapping`,
      },
    })

    if (newCalendar.data.id) {
      return { id: newCalendar.data.id, summary: newCalendar.data.summary || name }
    }
    return null
  } catch (error) {
    console.error('Failed to create Google Calendar:', error)
    return null
  }
}

export interface SyncProgressEvent {
  id?: string
  title: string
  status: 'synced' | 'skipped' | 'failed' | 'task_skipped'
  current: number
  error?: string
}

/**
 * Batch syncs activities to Google Calendar.
 * 최적화: p-limit(1) 안정 처리, Auth/CalendarId 루프 외부 캐싱,
 * Custom Event ID 사용, onProgress 콜백으로 실시간 진행 상태 전송.
 */
export async function syncBatchActivitiesToGoogle(userId: string, activities: any[], onProgress?: (event: SyncProgressEvent) => void) {
  const result = {
    synced: 0,
    skipped: 0,
    failed: 0,
    failedItems: [] as any[]
  }
  
  if (!activities || activities.length === 0) return result

  try {
    const supabase = createAdminClient()
    const { data: user } = await supabase.from('users').select('google_sync_settings').eq('id', userId).single()
    const settings: GoogleSyncSettings = user?.google_sync_settings || {}

    if (settings.direction === 'IMPORT_ONLY') return result

    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) throw new Error('No auth client')

    // 기본 캘린더 ID를 루프 밖에서 1회만 조회
    const defaultCalendarId = await getSyncCalendarId(userId, auth, supabase, [], settings)
    if (!defaultCalendarId) throw new Error('No calendar ID')

    const calendar = google.calendar({ version: 'v3', auth })

    // 그룹 매핑 사전 캐싱: categoryId → calendarId
    const groupCalendarCache = new Map<string, string>()
    if (settings.groupMapping) {
      for (const [catId, calId] of Object.entries(settings.groupMapping)) {
        groupCalendarCache.set(catId, calId)
      }
    }

    const limit = pLimit(1) // 동시 1건 처리로 구글 Rate Limit 회피

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    const executeWithRetry = async <T>(operation: () => Promise<T>, maxRetries = 4): Promise<T> => {
      let retries = 0;
      while (true) {
        try {
          return await operation();
        } catch (error: any) {
          if ((error.code === 403 || error.code === 429 || error.code >= 500) && retries < maxRetries) {
            retries++;
            const backoffDelay = Math.pow(2, retries) * 500; // 1초, 2초, 4초, 8초 대기
            console.warn(`Google API Rate limit or server error. Retrying in ${backoffDelay}ms... (Attempt ${retries})`);
            await delay(backoffDelay);
          } else {
            throw error;
          }
        }
      }
    };

    let processedCount = 0

    const tasks = activities.map(activity =>
      limit(async () => {
        try {
          await delay(500); // 각 항목마다 기본 500ms 딜레이를 주어 초당 요청 수 엄격히 제어
          if (activity.type === 'TASK') {
            processedCount++
            onProgress?.({ title: activity.title || '(할 일)', status: 'task_skipped', current: processedCount })
            return
          }

          let categories: any[] = []
          if (activity.activity_category_map && Array.isArray(activity.activity_category_map)) {
            categories = activity.activity_category_map.map((acm: any) => acm.categories).filter(Boolean)
          }
          
          // 그룹 매핑에서 캘린더 ID를 O(1)로 결정 (DB 조회 제거)
          let targetCalendarId = defaultCalendarId
          for (const cat of categories) {
            const mappedCalId = groupCalendarCache.get(cat.id)
            if (mappedCalId) {
              targetCalendarId = mappedCalId
              break
            }
          }

          // [핵심 로직] 외부에서 가져온 일정(google_event_id 보유)이라면, 
          // 카테고리와 무관하게 원래 저장되어 있던 달력으로 타겟 캘린더를 덮어씁니다.
          if (activity.google_event_id) {
            try {
              const { data: historyData } = await executeWithRetry<any>(async () => await supabase
                .from('sync_history')
                .select('calendar_id')
                .eq('google_event_id', activity.google_event_id)
                .not('calendar_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
              )
              if (historyData?.calendar_id) {
                targetCalendarId = historyData.calendar_id
              }
            } catch (historyErr) {
              // 내역이 없거나 에러인 경우 기존 targetCalendarId(카테고리 기반) 유지
            }
          }

          const eventBody = mapActivityToGoogleEvent(activity, categories, settings)
          const googleEventId = activity.google_event_id || toGoogleEventId(activity.id)

          if (activity.parent_activity_id) {
            const parentEventId = toGoogleEventId(activity.parent_activity_id)
            try {
              await executeWithRetry(() => calendar.events.get({ calendarId: targetCalendarId, eventId: parentEventId }))
              ;(eventBody as any).recurringEventId = parentEventId
              if (activity.original_start_time) {
                const originalStart = activity.is_all_day 
                  ? { date: activity.original_start_time.split('T')[0] }
                  : { dateTime: activity.original_start_time }
                ;(eventBody as any).originalStartTime = originalStart
              }
            } catch (parentErr: any) {
              if (parentErr.code === 404) {
                // Fallback: 기존 extendedProperty 검색
                const parentSearchResult = await executeWithRetry(() => calendar.events.list({
                  calendarId: targetCalendarId,
                  privateExtendedProperty: [`calentask_id=${activity.parent_activity_id}`],
                }))
                const existingParentEvent = parentSearchResult.data.items?.[0]
                if (existingParentEvent?.id) {
                  (eventBody as any).recurringEventId = existingParentEvent.id
                  if (activity.original_start_time) {
                    const originalStart = activity.is_all_day 
                      ? { date: activity.original_start_time.split('T')[0] }
                      : { dateTime: activity.original_start_time }
                    ;(eventBody as any).originalStartTime = originalStart
                  }
                }
              }
            }
          }

          // Custom ID로 update 시도 → 404면 insert
          let batchFinalEventId = googleEventId
          try {
            await executeWithRetry(() => calendar.events.update({
              calendarId: targetCalendarId,
              eventId: googleEventId,
              requestBody: eventBody,
            }))
            result.synced++ // 업데이트 성공도 동기화 완료로 분류
            processedCount++
            onProgress?.({ id: activity.id, title: activity.title, status: 'synced', current: processedCount })
          } catch (updateErr: any) {
            const isNotFound = updateErr.code === 404 || updateErr.status === 404 || updateErr.message?.includes('Not Found')
            if (isNotFound) {
              let searchResult
              try {
                searchResult = await executeWithRetry(() => calendar.events.list({
                  calendarId: targetCalendarId,
                  privateExtendedProperty: [`calentask_id=${activity.id}`],
                }))
              } catch (listErr: any) {
                const isCalendarNotFound = listErr.code === 404 || listErr.status === 404 || listErr.message?.includes('Not Found')
                if (isCalendarNotFound) {
                  if (defaultCalendarId && defaultCalendarId !== targetCalendarId) {
                    try {
                      const insertedBatch = await executeWithRetry(() => calendar.events.insert({
                        calendarId: defaultCalendarId,
                        requestBody: { ...eventBody, id: googleEventId },
                      }))
                      batchFinalEventId = insertedBatch.data.id || googleEventId
                      result.synced++
                      processedCount++
                      onProgress?.({ id: activity.id, title: activity.title, status: 'synced', current: processedCount })
                      return // Arrow function success return
                    } catch (retryErr: any) {
                      throw retryErr
                    }
                  } else {
                    throw listErr
                  }
                }
                throw listErr
              }

              const existingEvent = searchResult.data.items?.[0]
              if (existingEvent?.id) {
                try {
                  await executeWithRetry(() => calendar.events.update({
                    calendarId: targetCalendarId,
                    eventId: existingEvent.id as string,
                    requestBody: eventBody,
                  }))
                  batchFinalEventId = existingEvent.id as string
                  result.synced++
                  processedCount++
                  onProgress?.({ id: activity.id, title: activity.title, status: 'synced', current: processedCount })
                } catch (fallbackUpdateErr) {
                  throw fallbackUpdateErr
                }
              } else {
                try {
                  await executeWithRetry(() => calendar.events.insert({
                    calendarId: targetCalendarId,
                    requestBody: { ...eventBody, id: googleEventId },
                  }))
                  result.synced++
                  processedCount++
                  onProgress?.({ id: activity.id, title: activity.title, status: 'synced', current: processedCount })
                } catch (insertErr: any) {
                  const isInsertNotFound = insertErr.code === 404 || insertErr.status === 404 || insertErr.message?.includes('Not Found')
                  if (isInsertNotFound && (eventBody as any).recurringEventId) {
                    delete (eventBody as any).recurringEventId
                    try {
                      const retryInsert = await executeWithRetry(() => calendar.events.insert({
                        calendarId: targetCalendarId,
                        requestBody: { ...eventBody, id: googleEventId }
                      }))
                      batchFinalEventId = retryInsert.data.id || googleEventId
                      result.synced++
                      processedCount++
                      onProgress?.({ id: activity.id, title: activity.title, status: 'synced', current: processedCount })
                      return // Arrow function success return
                    } catch (retryInsertErr) {
                      // fall through to final fallback
                    }
                  }

                  try {
                    const fallbackInserted = await executeWithRetry(() => calendar.events.insert({
                      calendarId: targetCalendarId,
                      requestBody: eventBody,
                    }))
                    batchFinalEventId = fallbackInserted.data.id || googleEventId
                    result.synced++
                    processedCount++
                    onProgress?.({ id: activity.id, title: activity.title, status: 'synced', current: processedCount })
                  } catch (finalErr) {
                    throw finalErr
                  }
                }
              }
            } else {
              throw updateErr
            }
          }

          // activities 테이블에 google_event_id 저장
          try {
            await supabase.from('activities').update({ google_event_id: batchFinalEventId }).eq('id', activity.id)
          } catch (dbErr) {
            console.error('Failed to save google_event_id (batch):', dbErr)
          }
        } catch (err: any) {
          console.error(`Failed to sync activity ${activity.id}:`, err)
          result.failed++
          result.failedItems.push({ id: activity.id, title: activity.title, error: err.message })
          processedCount++
          onProgress?.({ id: activity.id, title: activity.title, status: 'failed', current: processedCount, error: err.message })
        }
      })
    )

    await Promise.allSettled(tasks)
    
    await logSyncHistory(supabase, {
      userId,
      calendarId: 'ALL',
      action: 'BATCH_SYNC',
      activityTitle: `배치 동기화: ${result.synced}건 생성, ${result.skipped}건 업데이트, ${result.failed}건 실패`
    })

  } catch (error: any) {
    console.error('Failed to process batch sync:', error)
    await logSyncHistory(createAdminClient(), { userId, calendarId: 'unknown', action: 'ERROR', errorMessage: `배치 동기화 실패: ${error.message}` })
    throw error
  }

  return result
}

export async function updateGoogleCalendarMeta(userId: string, calendarId: string, summary?: string, backgroundColor?: string) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return null

    const calendar = google.calendar({ version: 'v3', auth })
    
    if (summary) {
       await calendar.calendars.patch({
         calendarId,
         requestBody: { summary }
       })
    }
    
    if (backgroundColor) {
       await calendar.calendarList.patch({
         calendarId,
         colorRgbFormat: true,
         requestBody: { backgroundColor }
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
    return true
  } catch (error) {
    console.error('Failed to delete Google Calendar:', error)
    throw error
  }
}

/**
 * Migrates events from one calendar to another.
 * 최적화: p-limit(5) 병렬 이동, setTimeout(200) 제거.
 */
export async function migrateCategoryActivitiesToCalendar(userId: string, categoryId: string, oldCalendarId: string, newCalendarId: string) {
   try {
    const supabase = createAdminClient()
    
    const { data: activityMaps } = await supabase
      .from('activity_category_map')
      .select('activity_id')
      .eq('category_id', categoryId)
      
    if (!activityMaps || activityMaps.length === 0) return { success: true, movedCount: 0 }
    
    const calentaskIdSet = new Set(activityMaps.map(m => m.activity_id))
    
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return { success: false, reason: 'no_auth' }

    const calendar = google.calendar({ version: 'v3', auth })
    let movedCount = 0
    const limit = pLimit(5) // 병렬 이동 동시성 제어

    let pageToken: string | null | undefined = undefined
    do {
      const res: any = await calendar.events.list({
        calendarId: oldCalendarId,
        maxResults: 250,
        singleEvents: false,
        showDeleted: false,
        pageToken: pageToken || undefined,
      })
      
      if (res.data.items) {
        const eventsToMove = res.data.items.filter((event: any) => {
          const calentaskId = event.extendedProperties?.private?.calentask_id
          return calentaskId && calentaskIdSet.has(calentaskId)
        })

        // p-limit 병렬 이동
        const moveResults = await Promise.allSettled(
          eventsToMove.map((event: any) =>
            limit(async () => {
              await calendar.events.move({
                calendarId: oldCalendarId,
                eventId: event.id as string,
                destination: newCalendarId,
              })
              movedCount++
            })
          )
        )

        moveResults.forEach((result, i) => {
          if (result.status === 'rejected') {
            console.warn(`Failed to move event ${eventsToMove[i]?.id}:`, result.reason?.message)
          }
        })
      }
      pageToken = res.data.nextPageToken
    } while (pageToken)
    
    if (movedCount > 0) {
      await logSyncHistory(supabase, {
        userId,
        calendarId: newCalendarId,
        action: 'MIGRATED',
        categoryId,
        activityTitle: `카테고리 캘린더 이동 (${movedCount}건)`,
        metadata: { from: oldCalendarId, to: newCalendarId }
      })
    }
    
    return { success: true, movedCount }
  } catch (error: any) {
    console.error('Failed to migrate activities:', error)
    await logSyncHistory(createAdminClient(), { userId, calendarId: newCalendarId, action: 'ERROR', errorMessage: `캘린더 이동 실패: ${error.message}`, categoryId })
    throw error
  }
}
