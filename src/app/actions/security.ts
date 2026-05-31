'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSecurityPinStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('user_security_pin')
    .select('enabled, security_question')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to get security pin status:', error)
    throw new Error('Failed to get status')
  }

  return {
    isSetup: !!data?.enabled,
    question: data?.security_question || null
  }
}

export async function setupSecurityPin(hashedPin: string, question: string, hashedAnswer: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
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
    })

  if (error) {
    console.error('Failed to setup pin:', error)
    throw new Error('Failed to setup pin')
  }

  revalidatePath('/archive')
  revalidatePath('/profile')
  return { success: true }
}

export async function verifySecurityPin(hashedPin: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
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
}

export async function verifySecurityAnswer(hashedAnswer: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
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
}
