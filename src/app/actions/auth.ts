'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
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
    return redirect('/login?error=Invalid login credentials')
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
    return redirect('/signup?error=모든 필수 항목을 입력해주세요.')
  }

  if (password.length < 8) {
    return redirect('/signup?error=비밀번호는 8자 이상이어야 합니다.')
  }

  if (password !== passwordConfirm) {
    return redirect('/signup?error=비밀번호가 일치하지 않습니다.')
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
    return redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
