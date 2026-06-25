import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const keepLoggedIn = request.cookies.get('sb-keep-logged-in')?.value === 'true'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = { ...options }
            if (!keepLoggedIn) {
              delete cookieOptions.maxAge
              delete cookieOptions.expires
            }
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = 
    request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/auth')
    
  const isPublicApi =
    request.nextUrl.pathname.startsWith('/api/webhooks') ||
    request.nextUrl.pathname.startsWith('/api/cron')
  
  if (!user && !isAuthPage && !isPublicApi) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    // Set cookies for the redirected response
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    const redirectResponse = NextResponse.redirect(url)
    // Set cookies for the redirected response
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  return supabaseResponse
}
