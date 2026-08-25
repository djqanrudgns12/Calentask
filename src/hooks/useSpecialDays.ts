import { useQuery } from '@tanstack/react-query'
import type { SpecialDaysMap } from '@/types/calendarMonth'

export function useSpecialDays(year: number) {
  return useQuery({
    queryKey: ['special-days', year],
    queryFn: async (): Promise<SpecialDaysMap> => {
      const res = await fetch(`/api/holidays?year=${year}`)
      if (!res.ok) {
        throw new Error('Failed to fetch special days')
      }
      return res.json()
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (data rarely changes)
    refetchOnWindowFocus: false,
  })
}
