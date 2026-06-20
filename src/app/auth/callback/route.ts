import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('[Auth Callback] exchangeCodeForSession result:', {
      hasSession: !!data?.session,
      hasError: !!error,
      errorMsg: error?.message,
      provider: data?.session?.user?.app_metadata?.provider,
      hasRefreshToken: !!data?.session?.provider_refresh_token,
      hasProviderToken: !!data?.session?.provider_token,
    })

    if (!error && data?.session) {
      // Extract Google Refresh Token if it exists and store it in users table
      const providerRefreshToken = data.session.provider_refresh_token
      const providerToken = data.session.provider_token

      if (data.session.user) {
        // Find Google identity to extract profile info
        const googleIdentity = data.session.user.identities?.find(i => i.provider === 'google')
        
        let updatePayload: any = {}

        if (providerRefreshToken) {
          updatePayload.google_refresh_token = providerRefreshToken
          console.log('[Auth Callback] Saving refresh token for user:', data.session.user.id)
        } else {
          console.warn('[Auth Callback] No provider_refresh_token received! Google sync will not work.')
        }

        if (googleIdentity) {
          updatePayload.google_email = googleIdentity.identity_data?.email
          updatePayload.google_name = googleIdentity.identity_data?.full_name || googleIdentity.identity_data?.name
          updatePayload.google_avatar_url = googleIdentity.identity_data?.avatar_url || googleIdentity.identity_data?.picture
          updatePayload.is_google_linked = true
        }

        if (Object.keys(updatePayload).length > 0) {
          // Use Admin client to ensure RLS doesn't block the update
          const { createAdminClient } = await import('@/lib/supabase/server')
          const adminClient = createAdminClient()
          const { error: updateError } = await adminClient
            .from('users')
            .update(updatePayload)
            .eq('id', data.session.user.id)
            
          if (updateError) {
            console.error('[Auth Callback] Failed to store google info:', updateError.message)
          } else {
            console.log('[Auth Callback] Successfully updated user profile with google info')
          }

          // Trigger initial sync in background if refresh token was saved
          if (providerRefreshToken && googleIdentity) {
            Promise.resolve().then(async () => {
              try {
                const { watchGoogleCalendar, syncAllActivitiesToGoogle } = await import('@/lib/google-calendar')
                await watchGoogleCalendar(data.session.user.id)
                await syncAllActivitiesToGoogle(data.session.user.id, adminClient)
                console.log('[Auth Callback] Background initial sync completed')
              } catch (err) {
                console.error('[Auth Callback] Background initial sync failed:', err)
              }
            })
          }
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Handle specific OAuth errors like Identity already linked
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  if (errorParam === 'server_error' && errorDescription?.includes('Identity is already linked')) {
    return NextResponse.redirect(`${origin}/?tab=profile&error=identity_already_linked`)
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
