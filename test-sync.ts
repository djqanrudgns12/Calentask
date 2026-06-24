import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { handleGoogleCalendarSync } from './src/lib/google-calendar'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testSync() {
  const { data: users, error } = await supabase.from('users').select('id, google_sync_token').limit(1)
  if (error || !users || users.length === 0) {
    console.error('Failed to fetch user', error)
    return
  }
  
  const userId = users[0].id
  console.log('Running sync for User ID:', userId)
  
  try {
    await handleGoogleCalendarSync(userId, supabase)
    console.log('Sync completed!')
  } catch(e) {
    console.error('Sync failed:', e)
  }
}

testSync()
