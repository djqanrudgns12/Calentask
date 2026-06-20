import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Find Google Identity
    const googleIdentity = user.identities?.find(i => i.provider === 'google')
    if (!googleIdentity) {
      return NextResponse.json({ error: 'Google account is not linked' }, { status: 400 })
    }

    // 2. Unlink the identity
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity)
    if (unlinkError) {
      console.error('Failed to unlink identity:', unlinkError.message)
      return NextResponse.json({ error: 'Failed to unlink Google account' }, { status: 500 })
    }

    // 3. Clear google fields in users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        google_email: null,
        google_name: null,
        google_avatar_url: null,
        is_google_linked: false,
        google_refresh_token: null,
        google_channel_id: null,
        google_resource_id: null,
        google_sync_token: null
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to clear google info:', updateError.message)
      return NextResponse.json({ error: 'Failed to clear Google info' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google Unlink Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
