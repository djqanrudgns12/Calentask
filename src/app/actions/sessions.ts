'use server'

import { createClient } from '@/lib/supabase/server'

export async function getUserSessions() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { sessions: [], error: 'Not authenticated' }
    }

    const { data, error } = await supabase.rpc('get_my_sessions')
    
    if (error) {
      console.error('Failed to get sessions:', error)
      return { sessions: [], error: error.message }
    }
    
    return { sessions: data || [] }
  } catch (err) {
    console.error('getUserSessions unexpected error:', err)
    return { sessions: [], error: 'Unexpected error' }
  }
}

export async function deleteUserSession(sessionId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase.rpc('delete_my_session', {
      target_session_id: sessionId
    })
    
    if (error) {
      console.error('Failed to delete session:', error)
      return { success: false, error: error.message }
    }
    
    return { success: !!data }
  } catch (err) {
    console.error('deleteUserSession unexpected error:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

export async function signOutOtherDevices() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    
    if (error) {
      console.error('Failed to sign out others:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err) {
    console.error('signOutOtherDevices unexpected error:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

export async function signOutAllDevices() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    
    if (error) {
      console.error('Failed to sign out all:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err) {
    console.error('signOutAllDevices unexpected error:', err)
    return { success: false, error: 'Unexpected error' }
  }
}
