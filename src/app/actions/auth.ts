'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const keepLoggedIn = formData.get('keepLoggedIn') === 'on'
  
  const cookieStore = await cookies()
  if (!keepLoggedIn) {
    cookieStore.set('sb-keep-logged-in', 'false', { 
      httpOnly: false, 
      sameSite: 'lax', 
      path: '/' 
    })
  } else {
    cookieStore.delete('sb-keep-logged-in')
  }

  const supabase = await createClient()
  
  // 우회 로직: 아이디 -> 가짜 이메일 변환
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const email = `${username}@calentask.com`

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?error=invalid_credentials')
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

  const { error } = await supabase.auth.signUp({
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
