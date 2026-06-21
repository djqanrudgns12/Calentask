import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const stateUserId = searchParams.get('state')
    const errorParam = searchParams.get('error')

    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const origin = `${protocol}://${host}`

    if (errorParam) {
      console.error('Google OAuth Error:', errorParam)
      return NextResponse.redirect(`${origin}/?tab=profile&error=google_oauth_failed`)
    }

    if (!code || !stateUserId) {
      return NextResponse.redirect(`${origin}/?tab=profile&error=missing_code`)
    }

    // 본인 확인 (세션의 유저와 state의 유저가 일치하는지)
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user || user.id !== stateUserId) {
      return NextResponse.redirect(`${origin}/?tab=profile&error=unauthorized_callback`)
    }

    const redirectUri = `${origin}/api/auth/google/callback`

    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    )

    // 코드 교환
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // 구글 프로필 정보 가져오기
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2.userinfo.get()

    // DB 업데이트
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = createAdminClient()

    let updatePayload: any = {
      is_google_linked: true,
      google_email: userInfo.email,
      google_name: userInfo.name,
      google_avatar_url: userInfo.picture,
    }

    if (tokens.refresh_token) {
      updatePayload.google_refresh_token = tokens.refresh_token
      console.log('[Custom Google Callback] Refresh token successfully acquired and saved.')
    } else {
      console.warn('[Custom Google Callback] No refresh_token in response! User might have already authorized without prompt=consent.')
    }

    const { error: updateError } = await adminClient
      .from('users')
      .update(updatePayload)
      .eq('id', user.id)

    if (updateError) {
      console.error('[Custom Google Callback] DB Update Error:', updateError.message)
      return NextResponse.redirect(`${origin}/?tab=profile&error=db_update_failed`)
    }

    return NextResponse.redirect(`${origin}/?tab=profile&success=google_linked`)
  } catch (error) {
    console.error('Google Callback Processing Error:', error)
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    return NextResponse.redirect(`${protocol}://${host}/?tab=profile&error=internal_server_error`)
  }
}
