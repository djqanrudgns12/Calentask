import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

/**
 * Creates an authenticated Google OAuth2 client for the given user.
 * It retrieves the google_refresh_token from the users table.
 */
export async function getGoogleAuthClient(userId: string) {
  const supabase = await createClient()
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
 * Ensures a dedicated "Calentask" calendar exists.
 * Returns the calendar ID.
 */
export async function getOrCreateCalentaskCalendar(auth: any): Promise<string | null> {
  const calendar = google.calendar({ version: 'v3', auth })
  
  try {
    // Check if Calentask calendar already exists
    const calendarList = await calendar.calendarList.list()
    const existing = calendarList.data.items?.find(
      (item) => item.summary === 'Calentask' && !item.deleted
    )

    if (existing && existing.id) {
      return existing.id
    }

    // Create a new calendar
    const newCalendar = await calendar.calendars.insert({
      requestBody: {
        summary: 'Calentask',
        description: 'Sync calendar for Calentask app',
      },
    })

    return newCalendar.data.id || null
  } catch (error) {
    console.error('Failed to get/create Calentask Google calendar:', error)
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

  return {
    summary: activity.title,
    description: activity.memo || '',
    start,
    end,
    colorId,
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
    const auth = await getGoogleAuthClient(userId)
    if (!auth) return

    const calendarId = await getOrCreateCalentaskCalendar(auth)
    if (!calendarId) return

    const calendar = google.calendar({ version: 'v3', auth })
    const eventBody = mapActivityToGoogleEvent(activity, categories)

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
    const auth = await getGoogleAuthClient(userId)
    if (!auth) return

    const calendarId = await getOrCreateCalentaskCalendar(auth)
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
    const auth = await getGoogleAuthClient(userId)
    if (!auth) return

    const calendarId = await getOrCreateCalentaskCalendar(auth)
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
    
    // In a real implementation, you would save this `channelId` and `resourceId` 
    // to the `users` table to match incoming webhooks to the correct user.
    return response.data
  } catch (error) {
    console.error('Failed to watch Google Calendar:', error)
  }
}

