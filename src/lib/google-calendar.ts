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
    : { dateTime: activity.start_time }
  
  const end = activity.is_all_day
    ? { date: activity.end_time.split('T')[0] }
    : { dateTime: activity.end_time }

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
 * Creates or updates an event in Google Calendar.
 * Uses Custom Event ID for O(1) lookup instead of list API search.
 */
export async function syncActivityToGoogle(userId: string, activity: any, categories: any[] = []) {
  try {
    const supabase = createAdminClient()
    const { data: user } = await supabase.from('users').select('google_sync_settings').eq('id', userId).single()
    const settings: GoogleSyncSettings = user?.google_sync_settings || {}

    if (settings.direction === 'IMPORT_ONLY') return
    if (activity.type === 'TASK') return // Selective sync: do not sync un-timed tasks

    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return

    const calendarId = await getSyncCalendarId(userId, auth, supabase, categories, settings)
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
            : { dateTime: activity.original_start_time }
          ;(eventBody as any).originalStartTime = originalStart
        }
      } catch (parentErr: any) {
        // Fallback: Custom ID로 부모를 못 찾으면 기존 extendedProperty 검색
        if (parentErr.code === 404) {
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
                : { dateTime: activity.original_start_time }
              ;(eventBody as any).originalStartTime = originalStart
            }
          }
        }
      }
    }

    const googleEventId = toGoogleEventId(activity.id)

    // 전략: Custom ID로 update 시도 → 404면 Custom ID로 insert
    try {
      await calendar.events.update({
        calendarId,
        eventId: googleEventId,
        requestBody: eventBody,
      })
    } catch (updateErr: any) {
      if (updateErr.code === 404) {
        // Custom ID로 존재하지 않음 → 기존 extendedProperty로 검색 (마이그레이션)
        try {
          const searchResult = await calendar.events.list({
            calendarId,
            privateExtendedProperty: [`calentask_id=${activity.id}`],
          })
          const existingEvent = searchResult.data.items?.[0]

          if (existingEvent?.id) {
            // 기존 이벤트가 있으면 업데이트
            await calendar.events.update({
              calendarId,
              eventId: existingEvent.id,
              requestBody: eventBody,
            })
          } else {
            // 완전히 새로운 이벤트 → Custom ID로 insert
            await calendar.events.insert({
              calendarId,
              requestBody: { ...eventBody, id: googleEventId },
            })
          }
        } catch (fallbackErr: any) {
          // Fallback도 실패하면 그냥 insert 시도 (ID 없이)
          await calendar.events.insert({
            calendarId,
            requestBody: eventBody,
          })
        }
      } else {
        throw updateErr
      }
    }
  } catch (error) {
    console.error('Failed to sync activity to Google Calendar:', error)
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
 * Bulk deletes all Calentask synced events from Google Calendar without unlinking.
 * 최적화: Calentask 전용 캘린더는 통째로 삭제 후 재생성하여 즉시 초기화.
 */
export async function clearSyncedActivitiesFromGoogle(userId: string) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return { success: false, reason: 'no_auth' }

    // We fetch all mapped calendars from settings to clear them all
    const { data: user } = await supabase.from('users').select('google_sync_settings, google_sync_calendar_id').eq('id', userId).single()
    const settings: GoogleSyncSettings = user?.google_sync_settings || {}
    
    const calendarIdsToClear = new Set<string>()
    if (user?.google_sync_calendar_id) calendarIdsToClear.add(user.google_sync_calendar_id)
    if (settings.groupMapping) {
      Object.values(settings.groupMapping).forEach(id => calendarIdsToClear.add(id))
    }

    const calendar = google.calendar({ version: 'v3', auth })
    let deletedCount = 0
    const limit = pLimit(5) // 병렬 삭제 동시성 제어

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

        // 개인 캘린더: 이벤트를 병렬로 삭제
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
            
            // p-limit 병렬 삭제 (setTimeout 200ms 제거)
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
            
            // 실패 로그
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

    // 캘린더 초기화 후 DB의 동기화 설정도 완벽히 초기화
    await supabase.from('users').update({
      google_sync_calendar_id: null,
      google_sync_calendar_name: null,
      google_sync_settings: {}
    }).eq('id', userId)

    return { success: true, deletedCount }
  } catch (error: any) {
    console.error('Failed to clear synced activities from Google:', error)
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

    const calendarId = await getSyncCalendarId(userId, auth, supabase)
    if (!calendarId) return

    const calendar = google.calendar({ version: 'v3', auth })
    const channelId = `calentask-sync-${userId}-${Date.now()}`
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://calentask-orcin.vercel.app'
    const webhookUrl = `${siteUrl}/api/webhooks/google`

    const response = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
      }
    })
    
    await supabase
      .from('users')
      .update({
        google_channel_id: channelId,
        google_resource_id: response.data.resourceId,
        google_channel_expiration: response.data.expiration ? new Date(parseInt(response.data.expiration)).toISOString() : null,
      })
      .eq('id', userId)

    await handleGoogleCalendarSync(userId, supabase)

    return response.data
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
    let syncToken = user?.google_sync_token

    let requestParams: any = {
      calendarId,
    }

    if (syncToken) {
      requestParams.syncToken = syncToken
    } else {
      requestParams.timeMin = new Date().toISOString()
    }

    let items: any[] = []
    let pageToken = undefined

    try {
      do {
        requestParams.pageToken = pageToken
        const response = await calendar.events.list(requestParams)
        
        if (response.data.items) {
          items = items.concat(response.data.items)
        }
        
        pageToken = response.data.nextPageToken
        if (response.data.nextSyncToken) {
          syncToken = response.data.nextSyncToken
        }
      } while (pageToken)
    } catch (err: any) {
      if (err.code === 410) {
        console.warn('Sync token invalid, doing full sync')
        await supabase.from('users').update({ google_sync_token: null }).eq('id', userId)
        return handleGoogleCalendarSync(userId, supabase) // retry
      }
      throw err
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

            if (shouldUpdate) {
              if (isCancelled && !activity.deleted_at) {
                updateTasks.push(
                  supabase
                    .from('activities')
                    .update({ deleted_at: new Date().toISOString() })
                    .eq('id', calentaskId)
                )
              } else if (!isCancelled) {
                const start = event.start?.dateTime || event.start?.date
                const end = event.end?.dateTime || event.end?.date
                const isAllDay = !!event.start?.date
                const reminders = (event.reminders?.useDefault === false && event.reminders?.overrides)
                  ? event.reminders.overrides.map((r: any) => ({ method: r.method, minutes: r.minutes }))
                  : []
                
                updateTasks.push(
                  supabase
                    .from('activities')
                    .update({
                      title: event.summary || '제목 없음',
                      memo: event.description || '',
                      start_time: start,
                      end_time: end,
                      is_all_day: isAllDay,
                      reminders,
                      updated_at: new Date(event.updated as string).toISOString()
                    })
                    .eq('id', calentaskId)
                )
              }
            }
          }
        } else {
          // This is a new event created in Google Calendar!
          if (!isCancelled && conflictStrategy !== 'CALENTASK_WINS') {
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
                }
                
                const { data: insertedActivity } = await supabase
                  .from('activities')
                  .insert(newActivity)
                  .select()
                  .single()

                if (insertedActivity) {
                  await calendar.events.patch({
                    calendarId,
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
                }
              })()
            )
          }
        }
      }

      // 병렬 실행
      await Promise.allSettled([...updateTasks, ...insertTasks])
    }

    if (syncToken) {
      await supabase
        .from('users')
        .update({ google_sync_token: syncToken })
        .eq('id', userId)
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
      primary: item.primary
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

/**
 * Batch syncs activities to Google Calendar.
 * 최적화: p-limit(5) 병렬 처리, Auth/CalendarId 루프 외부 캐싱,
 * Custom Event ID 사용, setTimeout(200) 제거.
 */
export async function syncBatchActivitiesToGoogle(userId: string, activities: any[]) {
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

    const limit = pLimit(5) // 동시 5건 병렬 처리

    const tasks = activities.map(activity =>
      limit(async () => {
        try {
          if (activity.type === 'TASK') return // skip

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

          const eventBody = mapActivityToGoogleEvent(activity, categories, settings)
          const googleEventId = toGoogleEventId(activity.id)

          if (activity.parent_activity_id) {
            const parentEventId = toGoogleEventId(activity.parent_activity_id)
            try {
              await calendar.events.get({ calendarId: targetCalendarId, eventId: parentEventId })
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
                const parentSearchResult = await calendar.events.list({
                  calendarId: targetCalendarId,
                  privateExtendedProperty: [`calentask_id=${activity.parent_activity_id}`],
                })
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
          try {
            await calendar.events.update({
              calendarId: targetCalendarId,
              eventId: googleEventId,
              requestBody: eventBody,
            })
            result.skipped++ // 이미 존재하여 업데이트
          } catch (updateErr: any) {
            if (updateErr.code === 404) {
              // 기존 extendedProperty로 검색 (마이그레이션 Fallback)
              try {
                const searchResult = await calendar.events.list({
                  calendarId: targetCalendarId,
                  privateExtendedProperty: [`calentask_id=${activity.id}`],
                })
                const existingEvent = searchResult.data.items?.[0]
                if (existingEvent?.id) {
                  await calendar.events.update({
                    calendarId: targetCalendarId,
                    eventId: existingEvent.id,
                    requestBody: eventBody,
                  })
                  result.skipped++
                } else {
                  await calendar.events.insert({
                    calendarId: targetCalendarId,
                    requestBody: { ...eventBody, id: googleEventId },
                  })
                  result.synced++
                }
              } catch {
                await calendar.events.insert({
                  calendarId: targetCalendarId,
                  requestBody: eventBody,
                })
                result.synced++
              }
            } else {
              throw updateErr
            }
          }
        } catch (err: any) {
          console.error(`Failed to sync activity ${activity.id}:`, err)
          result.failed++
          result.failedItems.push({ id: activity.id, title: activity.title, error: err.message })
        }
      })
    )

    await Promise.allSettled(tasks)
  } catch (error: any) {
    console.error('Failed to process batch sync:', error)
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
    
    return { success: true, movedCount }
  } catch (error: any) {
    console.error('Failed to migrate activities:', error)
    throw error
  }
}
