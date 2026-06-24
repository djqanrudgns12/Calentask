import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { getGoogleAuthClient } from './src/lib/google-calendar'
import { google } from 'googleapis'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testFetch() {
  const { data: users, error } = await supabase.from('users').select('id, google_calendar_id').not('google_refresh_token', 'is', null).limit(1)
  if (error || !users || users.length === 0) return
  
  const userId = users[0].id
  const calendarId = users[0].google_calendar_id || 'primary'
  
  const auth = await getGoogleAuthClient(userId, supabase)
  if (!auth) return console.log('no auth')
  
  const calendar = google.calendar({ version: 'v3', auth })
  const response = await calendar.events.list({
    calendarId,
    maxResults: 10,
    singleEvents: true,
    orderBy: 'updated',
    showDeleted: true
  })
  
  console.log(JSON.stringify(response.data.items, null, 2))
}

testFetch()
