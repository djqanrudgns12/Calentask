'use client'

import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { calendarMonthQueryOptions } from '@/hooks/useCalendarMonth'
import { toCalendarMonthKey } from '@/lib/calendarMonth'
import { overviewDashboardQueryOptions, templatesSummaryQueryOptions } from '@/lib/insightsQueryOptions'
import { useCalendarStore, type ViewMode } from '@/store/useCalendarStore'
import { getDatesForPreset, useSharedPeriodStore } from '@/store/useSharedPeriodStore'
import { useInsightsFilterStore } from '@/store/useInsightsFilterStore'
import { loadViewData } from '@/lib/loadViewData'

export function useViewWarmup() {
  const queryClient = useQueryClient()
  const warm = useCallback((view: ViewMode) => {
    if (view === 'monthly') {
      void import('@/components/calendar/MonthlyView').catch(() => {})
      void queryClient.prefetchQuery(calendarMonthQueryOptions(toCalendarMonthKey(useCalendarStore.getState().currentDate)))
    } else if (view === 'template_center') {
      void import('@/components/insights/TemplateCenterTab').catch(() => {})
      const { preset, customRange } = useSharedPeriodStore.getState()
      void queryClient.prefetchQuery(templatesSummaryQueryOptions(getDatesForPreset(preset, customRange)))
    } else if (view === 'insights') {
      void import('@/app/insights/InsightsClient').catch(() => {})
      const tab = useInsightsFilterStore.getState().activeTab
      if (tab === 'overview') {
        void import('@/components/insights/OverviewTab').catch(() => {})
        const { preset, customRange } = useSharedPeriodStore.getState()
        void queryClient.prefetchQuery(overviewDashboardQueryOptions(getDatesForPreset(preset, customRange), preset))
      } else if (tab === 'time') {
        void import('@/components/insights/TimeAnalysisTab').catch(() => {})
        const { preset, customRange } = useSharedPeriodStore.getState()
        const { startDate, endDate } = getDatesForPreset(preset, customRange)
        void queryClient.prefetchQuery({ queryKey: ['insights', startDate, endDate], queryFn: ({ signal }) => loadViewData('time', { startDate, endDate }, signal), staleTime: 5 * 60 * 1000 })
      } else {
        void import('@/components/insights/ExecutionTab').catch(() => {})
        const { preset, customRange } = useSharedPeriodStore.getState()
        const { startDate, endDate } = getDatesForPreset(preset, customRange)
        void queryClient.prefetchQuery({ queryKey: ['executionAnalytics', startDate, endDate], queryFn: ({ signal }) => loadViewData('execution', { startDate, endDate }, signal), staleTime: 5 * 60 * 1000 })
      }
    }
  }, [queryClient])

  // 모든 진입점(모바일·단축 동작 포함)에서 화면 코드와 데이터를 함께 시작한다.
  useEffect(() => useCalendarStore.subscribe((state, previous) => {
    if (state.viewMode !== previous.viewMode) warm(state.viewMode)
  }), [warm])

  return warm
}
