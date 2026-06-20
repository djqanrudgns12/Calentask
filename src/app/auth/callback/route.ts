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

      if (providerRefreshToken && data.session.user) {
        // NOTE: We update the users table directly via admin client or RLS allowed policy
        // Since the user is authenticated, if RLS allows updating their own profile, this works.
        // If not, we might need an admin client. Let's try regular client first.
        const { error: updateError } = await supabase
          .from('users')
          .update({ google_refresh_token: providerRefreshToken })
          .eq('id', data.session.user.id)
          
        if (updateError) {
          console.error('Failed to store google_refresh_token:', updateError.message)
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
