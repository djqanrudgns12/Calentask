'use server'

import { createClient } from '@/lib/supabase/server'

export async function getSecurityPinStatus() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { isSetup: false, question: null, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from('user_security_pin')
      .select('enabled, security_question')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to get security pin status:', error)
      return { isSetup: false, question: null, error: error.message }
    }

    return {
      isSetup: !!data?.enabled,
      question: data?.security_question || null
    }
  } catch (err) {
    console.error('getSecurityPinStatus unexpected error:', err)
    return { isSetup: false, question: null, error: 'Unexpected error' }
  }
}

export async function setupSecurityPin(hashedPin: string, question: string, hashedAnswer: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('user_security_pin')
      .upsert({
        user_id: user.id,
        hashed_pin: hashedPin,
        security_question: question,
        security_answer: hashedAnswer,
        enabled: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('Failed to setup pin:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('setupSecurityPin unexpected error:', err)
    return { success: false, error: 'Unexpected server error' }
  }
}

export async function verifySecurityPin(hashedPin: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from('user_security_pin')
      .select('hashed_pin')
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return { success: false }
    }

    return { success: data.hashed_pin === hashedPin }
  } catch (err) {
    console.error('verifySecurityPin unexpected error:', err)
    return { success: false, error: 'Unexpected server error' }
  }
}

export async function verifySecurityAnswer(hashedAnswer: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from('user_security_pin')
      .select('security_answer')
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return { success: false }
    }

    const isValid = data.security_answer === hashedAnswer;
    
    if (isValid) {
      // Answer is correct, disable current PIN so they can set a new one
      await supabase
        .from('user_security_pin')
        .update({ enabled: false })
        .eq('user_id', user.id)
    }

    return { success: isValid }
  } catch (err) {
    console.error('verifySecurityAnswer unexpected error:', err)
    return { success: false, error: 'Unexpected server error' }
  }
}
