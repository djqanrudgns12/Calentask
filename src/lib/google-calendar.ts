import { google } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/server'

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
export async function getSyncCalendarId(userId: string, auth: any, customSupabase?: any): Promise<string | null> {
  const supabase = customSupabase || createAdminClient()
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
function mapActivityToGoogleEvent(activity: any, categories: any[]) {
  // Convert color to a similar Google Calendar color ID (1-11)
  // Google Colors: 1=Lavender, 2=Sage, 3=Grape, 4=Flamingo, 5=Banana, 6=Tangerine, 7=Peacock, 8=Graphite, 9=Blueberry, 10=Basil, 11=Tomato
  // Default to 9 (Blue)
  let colorId = '9'
  if (activity.hex_color) {
    // Simple heuristic (can be improved)
    colorId = '11' // tomato (red-ish) etc. 
    // We'll just pass the actual hex color in extended properties
  }

  const start = activity.is_all_day 
    ? { date: activity.start_time.split('T')[0] }
    : { dateTime: activity.start_time }
  
  const end = activity.is_all_day
    ? { date: activity.end_time.split('T')[0] }
    : { dateTime: activity.end_time }

  let reminders: any = { useDefault: true }
  if (activity.reminders && Array.isArray(activity.reminders) && activity.reminders.length > 0) {
    reminders = {
      useDefault: false,
      overrides: activity.reminders
    }
  }

  return {
    summary: activity.title,
    description: activity.memo || '',
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
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return

    const calendarId = await getSyncCalendarId(userId, auth, supabase)
    if (!calendarId) return

    const calendar = google.calendar({ version: 'v3', auth })
    const eventBody = mapActivityToGoogleEvent(activity, categories)

    if (activity.parent_activity_id) {
      // Find parent event to set recurringEventId
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

    // Check if the event already exists in Google
    // We use the Calentask ID stored in extended properties to find it
    const searchResult = await calendar.events.list({
      calendarId,
      privateExtendedProperty: [`calentask_id=${activity.id}`],
    })

    const existingEvent = searchResult.data.items?.[0]

    if (existingEvent?.id) {
      // Update
      await calendar.events.update({
        calendarId,
        eventId: existingEvent.id,
        requestBody: eventBody,
      })
    } else {
      // Insert
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

    const calendarId = await getSyncCalendarId(userId, auth, supabase)
    if (!calendarId) return

    const calendar = google.calendar({ version: 'v3', auth })
    
    // Find the Google Event ID using Calentask ID
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
 * Note: The webhookUrl MUST be an HTTPS URL (e.g. Vercel deployment URL)
 */
export async function watchGoogleCalendar(userId: string) {
  try {
    const supabase = createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return

    const calendarId = await getSyncCalendarId(userId, auth, supabase)
    if (!calendarId) return

    const calendar = google.calendar({ version: 'v3', auth })
    
    // Unique ID for this channel
    const channelId = `calentask-sync-${userId}-${Date.now()}`
    
    // Webhook URL (Must be Vercel URL in production, not localhost)
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

    console.log('Successfully subscribed to Google Calendar webhooks:', response.data)
    
    // Save channelId, resourceId, and expiration to the users table
    await supabase
      .from('users')
      .update({
        google_channel_id: channelId,
        google_resource_id: response.data.resourceId,
        google_channel_expiration: response.data.expiration ? new Date(parseInt(response.data.expiration)).toISOString() : null,
      })
      .eq('id', userId)

    // Initial full sync to get the first syncToken
    await handleGoogleCalendarSync(userId, supabase)

    return response.data
  } catch (error) {
    console.error('Failed to watch Google Calendar:', error)
  }
}

/**
 * Handles delta sync with Google Calendar using syncToken.
 * Implements Last Write Wins for collision resolution.
 */
export async function handleGoogleCalendarSync(userId: string, customSupabase?: any) {
  try {
    const supabase = customSupabase || createAdminClient()
    const auth = await getGoogleAuthClient(userId, supabase)
    if (!auth) return

    const calendarId = await getSyncCalendarId(userId, auth, supabase)
    if (!calendarId) return

    const calendar = google.calendar({ version: 'v3', auth })
    
    // Get user's current syncToken
    const { data: user } = await supabase
      .from('users')
      .select('google_sync_token')
      .eq('id', userId)
      .single()
      
    let syncToken = user?.google_sync_token

    let requestParams: any = {
      calendarId,
    }

    if (syncToken) {
      requestParams.syncToken = syncToken
    } else {
      // If no syncToken, we can't use it. We must do a full sync from now to get initial syncToken.
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
      // If syncToken is invalid (410 Gone), clear it and retry without syncToken
      if (err.code === 410) {
        console.warn('Sync token invalid, doing full sync')
        await supabase.from('users').update({ google_sync_token: null }).eq('id', userId)
        return handleGoogleCalendarSync(userId, supabase) // retry
      }
      throw err
    }

    // Process items (Delta)
    for (const event of items) {
      const isCancelled = event.status === 'cancelled'
      const calentaskId = event.extendedProperties?.private?.calentask_id

      if (calentaskId) {
        // Find existing activity
        const { data: activity } = await supabase
          .from('activities')
          .select('id, updated_at, deleted_at')
          .eq('id', calentaskId)
          .single()

        if (activity) {
          // Last Write Wins
          const eventUpdated = new Date(event.updated as string).getTime()
          const activityUpdated = new Date(activity.updated_at).getTime()
          
          // Add a small buffer (e.g. 2000ms) to avoid ping-pong updates due to sync latency
          if (eventUpdated > activityUpdated + 2000) {
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
                ? event.reminders.overrides
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
        if (!isCancelled) {
          const start = event.start?.dateTime || event.start?.date
          const end = event.end?.dateTime || event.end?.date
          const isAllDay = !!event.start?.date
          
          const reminders = (event.reminders?.useDefault === false && event.reminders?.overrides)
            ? event.reminders.overrides
            : []
          const newActivity = {
            user_id: userId,
            title: event.summary || '제목 없음',
            memo: event.description || '',
            start_time: start,
            end_time: end,
            is_all_day: isAllDay,
            type: 'event', // default type
            reminders,
          }
          
          const { data: insertedActivity } = await supabase
            .from('activities')
            .insert(newActivity)
            .select()
            .single()

          if (insertedActivity) {
            // Update Google Event to include the new Calentask ID
            await calendar.events.patch({
              calendarId,
              eventId: event.id as string,
              requestBody: {
                extendedProperties: {
                  private: {
                    calentask_id: insertedActivity.id,
                    type: 'event'
                  }
                }
              }
            })
          }
        }
      }
    }

    // Save the nextSyncToken
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

export async function syncAllActivitiesToGoogle(userId: string, customSupabase?: any) {
  try {
    const supabase = customSupabase || createAdminClient()
    
    // Fetch all non-deleted activities for the user
    const { data: activities } = await supabase
      .from('activities')
      .select('*, activity_category_map(categories(*))')
      .eq('user_id', userId)
      .is('deleted_at', null)
      
    if (!activities || activities.length === 0) return

    for (const activity of activities) {
      await syncActivityToGoogle(userId, activity, activity.categories || [])
    }
    
    console.log(`Successfully synced ${activities.length} activities to Google Calendar for user ${userId}.`)
  } catch (error) {
    console.error('Failed to sync all activities to Google:', error)
  }
}
