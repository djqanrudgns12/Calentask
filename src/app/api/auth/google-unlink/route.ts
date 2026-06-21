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
    
    // 만약 Identity가 없다면 이미 unlink 된 상태일 수 있으므로 바로 DB 클리어로 넘어감
    if (googleIdentity) {
      // 2. Unlink the identity
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity)
      if (unlinkError) {
        console.error('Failed to unlink identity:', unlinkError.message)
        // unlink에 실패하더라도 DB 정보는 지워주도록 아래로 통과시킴 (강제 해제)
      }
    }

    // 3. Clear google fields in users table (use admin client to bypass any RLS issues)
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()

    const { error: updateError } = await adminClient
      .from('users')
      .update({
        google_email: null,
        google_name: null,
        google_avatar_url: null,
        is_google_linked: false,
        google_refresh_token: null,
        google_channel_id: null,
        google_resource_id: null,
        google_sync_token: null,
        google_sync_calendar_id: null,
        google_sync_calendar_name: null
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to clear google info:', updateError.message)
      return NextResponse.json({ error: `DB 업데이트 실패: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Google Unlink Error:', error)
    return NextResponse.json({ error: `서버 오류: ${error.message}` }, { status: 500 })
  }
}
