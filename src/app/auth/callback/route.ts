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
    
    if (!error && data?.session) {
      // Extract Google Refresh Token if it exists and store it in users table
      const providerRefreshToken = data.session.provider_refresh_token

      if (data.session.user) {
        // Find Google identity to extract profile info
        const googleIdentity = data.session.user.identities?.find(i => i.provider === 'google')
        
        let updatePayload: any = {}

        if (providerRefreshToken) {
          updatePayload.google_refresh_token = providerRefreshToken
        }

        if (googleIdentity) {
          updatePayload.google_email = googleIdentity.identity_data?.email
          updatePayload.google_name = googleIdentity.identity_data?.full_name || googleIdentity.identity_data?.name
          updatePayload.google_avatar_url = googleIdentity.identity_data?.avatar_url || googleIdentity.identity_data?.picture
          updatePayload.is_google_linked = true
        }

        if (Object.keys(updatePayload).length > 0) {
          // NOTE: We update the users table directly via admin client or RLS allowed policy
          // Since the user is authenticated, if RLS allows updating their own profile, this works.
          const { error: updateError } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', data.session.user.id)
            
          if (updateError) {
            console.error('Failed to store google info:', updateError.message)
          }
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
