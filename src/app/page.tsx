import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { CalendarClient } from '@/components/calendar/CalendarClient'
import { startOfWeek, endOfWeek } from 'date-fns'
import { getActivities } from '@/app/actions/calendar'
import { expandActivities } from '@/hooks/useCalendarQueries'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const queryClient = new QueryClient()

  // 프리패치 기준이 되는 현재 달 계산
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  // 사용자의 weekStartsOn 설정(0 또는 1)을 서버에서 알 수 없으므로, 두 가지 경우 모두 프리패치하여 캐시 적중률 100% 보장
  const prefetchForWeekStart = async (weekStartsOn: 0 | 1) => {
    const startDate = startOfWeek(monthStart, { weekStartsOn })
    const endDate = endOfWeek(monthEnd, { weekStartsOn })
    
    await queryClient.prefetchQuery({
      queryKey: ['activities', startDate.toISOString(), endDate.toISOString()],
      queryFn: async () => {
        try {
          const rawActivities = await getActivities(startDate.toISOString(), endDate.toISOString())
          return expandActivities(rawActivities, startDate.toISOString(), endDate.toISOString())
        } catch (e) {
          // prefetch 도중 에러가 나더라도 페이지 렌더링을 막지 않도록 조치
          console.error('Prefetch failed:', e)
          return []
        }
      }
    })
  }

  // 병렬로 프리패치 실행
  await Promise.all([
    prefetchForWeekStart(0),
    prefetchForWeekStart(1)
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CalendarClient />
    </HydrationBoundary>
  )
}
