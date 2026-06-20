import os

file_path = "src/lib/google-calendar.ts"

with open(file_path, "r") as f:
    content = f.read()

new_content = """import { google } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/server'

export interface GoogleSyncSettings {
  direction?: 'TWO_WAY' | 'EXPORT_ONLY' | 'IMPORT_ONLY'
  conflictStrategy?: 'LATEST_WINS' | 'CALENTASK_WINS' | 'GOOGLE_WINS'
  colorMapping?: Record<string, string>
  groupMapping?: Record<string, string>
  privacyMapping?: Record<string, boolean>
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
 * Creates or updates an event in Google Calendar
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

    const searchResult = await calendar.events.list({
      calendarId,
      privateExtendedProperty: [`calentask_id=${activity.id}`],
    })

    const existingEvent = searchResult.data.items?.[0]

    if (existingEvent?.id) {
      await calendar.events.update({
        calendarId,
        eventId: existingEvent.id,
        requestBody: eventBody,
      })
    } else {
      await calendar.events.insert({
        calendarId,
        requestBody: eventBody,
      })
    }
  } catch (error) {
    console.error('Failed to sync activity to Google Calendar:', error)
  }
}

/**
 * Deletes an event from Google Calendar
 */
export async function deleteActivityFromGoogle(userId: string, activityId: string) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return

    // Note: If using group mapping, it might be in a different calendar. We try default first, 
    // or search across all mapped calendars. For simplicity, we just use the default or we could pass categories.
    // Ideally we should list from all calendars, but let's check the default for now.
    const calendarId = await getSyncCalendarId(userId, auth, supabase)
    if (!calendarId) return

    const calendar = google.calendar({ version: 'v3', auth })
    
    const searchResult = await calendar.events.list({
      calendarId,
      privateExtendedProperty: [`calentask_id=${activityId}`],
    })

    const existingEvent = searchResult.data.items?.[0]

    if (existingEvent?.id) {
      await calendar.events.delete({
        calendarId,
        eventId: existingEvent.id,
      })
    }
  } catch (error) {
    console.error('Failed to delete activity from Google Calendar:', error)
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

      for (const event of items) {
        const isCancelled = event.status === 'cancelled'
        const calentaskId = event.extendedProperties?.private?.calentask_id

        if (calentaskId) {
          const { data: activity } = await supabase
            .from('activities')
            .select('id, updated_at, deleted_at')
            .eq('id', calentaskId)
            .single()

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
                await supabase
                  .from('activities')
                  .update({ deleted_at: new Date().toISOString() })
                  .eq('id', calentaskId)
              } else if (!isCancelled) {
                const start = event.start?.dateTime || event.start?.date
                const end = event.end?.dateTime || event.end?.date
                const isAllDay = !!event.start?.date
                const reminders = (event.reminders?.useDefault === false && event.reminders?.overrides)
                  ? event.reminders.overrides.map((r: any) => ({ method: r.method, minutes: r.minutes }))
                  : []
                
                await supabase
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
          }
        }
      }
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

    const calendarId = await getSyncCalendarId(userId, auth, supabase, [], settings)
    if (!calendarId) throw new Error('No calendar ID')

    const calendar = google.calendar({ version: 'v3', auth })

    for (const activity of activities) {
      try {
        if (activity.type === 'TASK') continue

        let categories: any[] = []
        if (activity.activity_category_map && Array.isArray(activity.activity_category_map)) {
          categories = activity.activity_category_map.map((acm: any) => acm.categories).filter(Boolean)
        }
        
        const targetCalendarId = await getSyncCalendarId(userId, auth, supabase, categories, settings) || calendarId

        const eventBody = mapActivityToGoogleEvent(activity, categories, settings)

        if (activity.parent_activity_id) {
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
            requestBody: eventBody,
          })
          result.synced++
        }
        await new Promise(r => setTimeout(r, 200))
      } catch (err: any) {
        console.error(`Failed to sync activity ${activity.id}:`, err)
        result.failed++
        result.failedItems.push({ id: activity.id, title: activity.title, error: err.message })
      }
    }
  } catch (error: any) {
    console.error('Failed to process batch sync:', error)
    throw error
  }

  return result
}
"""

with open(file_path, "w") as f:
    f.write(new_content)
