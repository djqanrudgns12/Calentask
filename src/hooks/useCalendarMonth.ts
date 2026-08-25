'use client'

import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCalendarMonthSnapshot } from '@/app/actions/calendarMonth'
import type { CalendarMonthKey } from '@/types/calendarMonth'

export const calendarMonthQueryKey = (monthKey: CalendarMonthKey) => ['calendar-month', monthKey] as const

export function calendarMonthQueryOptions(monthKey: CalendarMonthKey) {
  return queryOptions({
    queryKey: calendarMonthQueryKey(monthKey),
    queryFn: () => getCalendarMonthSnapshot(monthKey),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useCalendarMonth(monthKey: CalendarMonthKey, enabled = true) {
  return useQuery({
    ...calendarMonthQueryOptions(monthKey),
    enabled,
  })
}

export function usePrefetchCalendarMonth() {
  const queryClient = useQueryClient()
  return (monthKey: CalendarMonthKey) => queryClient.prefetchQuery(calendarMonthQueryOptions(monthKey))
}
