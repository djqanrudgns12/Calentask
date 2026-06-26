'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'

export async function login(formData: FormData) {
  const keepLoggedIn = formData.get('keepLoggedIn') === 'on'
  
  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === 'production'
  if (keepLoggedIn) {
    cookieStore.set('sb-keep-logged-in', 'true', { 
      httpOnly: true, 
      sameSite: 'lax', 
      secure: isProduction,
      path: '/',
      maxAge: 60 * 60 * 24 * 365
    })
  } else {
    cookieStore.set('sb-keep-logged-in', 'false', { 
      httpOnly: true, 
      sameSite: 'lax', 
      secure: isProduction,
      path: '/' 
    })
  }

  const supabase = await createClient()
  
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  const adminClient = createAdminClient()
  
  // 1. Get the user ID from public.users using username
  const { data: publicUser } = await adminClient
    .from('users')
    .select('id')
    .eq('username', username)
    .single()

  if (!publicUser) {
    return redirect('/login?error=user_not_found')
  }

  // 2. Get the real email from auth.users using admin client
  const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(publicUser.id)
  
  if (authUserError || !authUser.user || !authUser.user.email) {
    return redirect('/login?error=user_not_found')
  }

  const email = authUser.user.email

  // 3. Sign in using the real email
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?error=invalid_password')
  }

  // 실제 클라이언트 IP/UA를 session_metadata에 저장
  try {
    const headersList = await headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : null
    const clientUA = headersList.get('user-agent')

    if (authData.session?.access_token) {
      const payload = authData.session.access_token.split('.')[1]
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
      const sessionId = decoded.session_id

      if (sessionId && authData.user) {
        await supabase.from('session_metadata').upsert({
          session_id: sessionId,
          user_id: authData.user.id,
          client_ip: clientIp,
          client_user_agent: clientUA,
        }, { onConflict: 'session_id' })
      }
    }
  } catch (e) {
    console.error('Failed to save session metadata:', e)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const fullName = formData.get('fullName') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('passwordConfirm') as string
  const recoveryEmail = formData.get('recoveryEmail') as string
  
  if (!fullName || !username || !password || !passwordConfirm) {
    return redirect('/signup?error=missing_fields')
  }

  if (password.length < 8) {
    return redirect('/signup?error=password_too_short')
  }

  if (password !== passwordConfirm) {
    return redirect('/signup?error=password_mismatch')
  }

  // 우회 로직: 아이디 -> 가짜 이메일 변환
  const email = `${username}@calentask.com`

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
        recovery_email: recoveryEmail || null
      }
    }
  })

  if (error) {
    return redirect(`/signup?error=signup_failed`)
  }

  // 실제 클라이언트 IP/UA를 session_metadata에 저장
  try {
    const headersList = await headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : null
    const clientUA = headersList.get('user-agent')

    if (authData.session?.access_token) {
      const payload = authData.session.access_token.split('.')[1]
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
      const sessionId = decoded.session_id

      if (sessionId && authData.user) {
        await supabase.from('session_metadata').upsert({
          session_id: sessionId,
          user_id: authData.user.id,
          client_ip: clientIp,
          client_user_agent: clientUA,
        }, { onConflict: 'session_id' })
      }
    }
  } catch (e) {
    console.error('Failed to save session metadata:', e)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('sb-keep-logged-in')
  
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent', // Forces Google to issue a refresh token every time
      },
    },
  })

  if (error) {
    console.error('Google OAuth error:', error.message)
    return redirect('/login?error=oauth_failed')
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function linkLocalAccount(formData: FormData) {
  const supabase = await createClient()

  const fullName = formData.get('fullName') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('passwordConfirm') as string
  const recoveryEmail = formData.get('recoveryEmail') as string

  if (!fullName || !username || !password || !passwordConfirm) {
    return { success: false, error: '모든 필수 항목을 입력해주세요.' }
  }

  if (password.length < 8) {
    return { success: false, error: '비밀번호는 8자 이상이어야 합니다.' }
  }

  if (password !== passwordConfirm) {
    return { success: false, error: '비밀번호가 일치하지 않습니다.' }
  }

  // 중복 아이디 체크
  const adminClient = createAdminClient()
  const { data: existingUser } = await adminClient
    .from('users')
    .select('id')
    .eq('username', username)
    .single()

  if (existingUser) {
    return { success: false, error: '이미 사용 중인 아이디입니다.' }
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: '인증에 실패했습니다.' }
  }

  // 1. Update Auth User (Only Password, preserving original email)
  const { error: updateAuthError } = await supabase.auth.updateUser({
    password,
  })

  if (updateAuthError) {
    console.error('Failed to update auth user:', updateAuthError.message)
    return { success: false, error: '계정 설정에 실패했습니다. (Auth 오류)' }
  }

  // 2. Update Public Users Table
  const { error: updatePublicError } = await supabase
    .from('users')
    .update({
      username,
      full_name: fullName,
      recovery_email: recoveryEmail || null
    })
    .eq('id', user.id)

  if (updatePublicError) {
    console.error('Failed to update public user:', updatePublicError.message)
    return { success: false, error: '계정 설정에 실패했습니다. (DB 오류)' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
