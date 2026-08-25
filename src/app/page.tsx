import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { CalendarClient } from '@/components/calendar/CalendarClient'
import { getCalendarMonthSnapshot } from '@/app/actions/calendarMonth'
import { createClient } from '@/lib/supabase/server'
import type { CalendarMonthKey } from '@/types/calendarMonth'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const queryClient = new QueryClient()
  const seoulParts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())
  const year = seoulParts.find(part => part.type === 'year')?.value
  const month = seoulParts.find(part => part.type === 'month')?.value
  const monthKey = `${year}-${month}` as CalendarMonthKey

  await queryClient.prefetchQuery({
    queryKey: ['calendar-month', monthKey],
    queryFn: () => getCalendarMonthSnapshot(monthKey),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  }).catch(error => console.error('월간 캘린더 사전 조회 실패', error))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CalendarClient />
    </HydrationBoundary>
  )
}
