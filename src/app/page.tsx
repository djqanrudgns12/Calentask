import { redirect } from 'next/navigation'
import { CalendarClient } from '@/components/calendar/CalendarClient'
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <CalendarClient />
}
