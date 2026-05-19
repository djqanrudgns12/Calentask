'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  // 우회 로직: 아이디 -> 가짜 이메일 변환
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const email = `${username}@calentask.local`

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

  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const recoveryEmail = formData.get('recoveryEmail') as string
  
  // 우회 로직: 아이디 -> 가짜 이메일 변환
  const email = `${username}@calentask.local`

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: username,
        recovery_email: recoveryEmail || null
      }
    }
  })

  if (error) {
    return redirect('/signup?error=Could not authenticate user')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
