import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export async function createClient() {
  const cookieStore = await cookies()
  const keepLoggedIn = cookieStore.get('sb-keep-logged-in')?.value === 'true'

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = { ...options }
              if (keepLoggedIn) {
                // Actively extend cookie lifetime to 1 year
                cookieOptions.maxAge = ONE_YEAR_SECONDS
                delete cookieOptions.expires
              } else {
                // Session cookie: browser will delete on close
                delete cookieOptions.maxAge
                delete cookieOptions.expires
              }
              cookieStore.set(name, value, cookieOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // Admin client doesn't need to set cookies
        }
      }
    }
  )
}
