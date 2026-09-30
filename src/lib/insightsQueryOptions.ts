import { queryOptions } from '@tanstack/react-query'
import { loadViewData } from '@/lib/loadViewData'
import type { PeriodDates, PeriodPreset } from '@/store/useSharedPeriodStore'

export function templatesSummaryQueryOptions(dates: PeriodDates) {
  const { startDate, endDate, prevStartDate, prevEndDate, trendType } = dates
  return queryOptions({
    queryKey: ['templatesSummary', startDate, endDate, prevStartDate, prevEndDate, trendType],
    queryFn: ({ signal }) => loadViewData('templates', { startDate, endDate, prevStartDate, prevEndDate, trendType }, signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function overviewDashboardQueryOptions(dates: PeriodDates, preset: PeriodPreset) {
  const { startDate, endDate, prevStartDate, prevEndDate } = dates
  const year = new Date().getFullYear()
  const yearStart = new Date(year, 0, 1).toISOString()
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999).toISOString()
  return queryOptions({
    queryKey: ['overviewDashboard', startDate, endDate, prevStartDate, prevEndDate, preset, year],
    queryFn: ({ signal }) => loadViewData('overview', { startDate, endDate, prevStartDate, prevEndDate, periodType: preset, yearStart, yearEnd }, signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}
