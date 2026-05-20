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

export async function updateUserProfile(payload: { full_name?: string; username?: string; avatar_url?: string }) {
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
