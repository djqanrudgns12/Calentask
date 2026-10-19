import { redirect } from 'next/navigation'
import { CalendarClient } from '@/components/calendar/CalendarClient'
import { createClient } from '@/lib/supabase/server'
import { canUserViewTidyStats } from '@/lib/tidy-stats/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const canViewTidyStats = await canUserViewTidyStats(supabase, user)
  return <CalendarClient canViewTidyStats={canViewTidyStats} />
}
