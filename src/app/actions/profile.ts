'use server'

import { createClient } from '@/lib/supabase/server'

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  
  if (!userData.user) return null

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userData.user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return profile
}

export async function updateUserProfile(payload: { full_name?: string; username?: string; avatar_url?: string; recovery_email?: string; neis_office_code?: string; neis_school_code?: string; neis_school_name?: string }) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not logged in')

  const { error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', userData.user.id)

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }
  return true
}

export async function updateUserPassword(password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    throw error
  }
  return true
}

export async function verifyCurrentPassword(currentPassword: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { success: false, error: 'Not authenticated' }

  // 현재 이메일로 비밀번호 재인증 시도
  const email = userData.user.email
  if (!email) return { success: false, error: 'No email found' }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })

  if (error) {
    return { success: false, error: '현재 비밀번호가 올바르지 않습니다.' }
  }

  return { success: true }
}
