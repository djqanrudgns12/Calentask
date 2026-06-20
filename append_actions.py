import os

file_path = "src/app/actions/calendar.ts"

with open(file_path, "a") as f:
    f.write("""
export async function getGoogleSyncSettingsAction() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('users')
    .select('google_sync_settings')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data.google_sync_settings || {}
}

export async function updateGoogleSyncSettingsAction(settings: any) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('users')
    .update({ google_sync_settings: settings })
    .eq('id', user.id)

  if (error) throw error
  return { success: true }
}

export async function clearGoogleSyncDataAction() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { clearSyncedActivitiesFromGoogle } = await import('@/lib/google-calendar')
  const result = await clearSyncedActivitiesFromGoogle(user.id)
  
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to clear sync data')
  }
  
  return result
}
""")
