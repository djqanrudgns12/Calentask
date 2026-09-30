import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useEffect } from 'react'
import { loadViewData } from '@/lib/loadViewData'
import { invalidateQueryRoots } from '@/lib/queryDependencies'
import { overviewDashboardQueryOptions, templatesSummaryQueryOptions } from '@/lib/insightsQueryOptions'
import type { PeriodDates, PeriodPreset } from '@/store/useSharedPeriodStore'
import { getActivityTemplates, createActivityTemplate, updateActivityTemplate, deleteActivityTemplate, createActivityFromTemplate, getSubjectDetails, getTemplateFullAnalytics, getCategoryMonthlyTrend, getOverviewKPI, getTemplateLinkedActivities, linkActivityToTemplate, unlinkActivityFromTemplate, searchActivitiesForLinking, getAnnualGoalProgress } from '@/app/actions/insights'
import type { ActivityTemplate } from '@/app/actions/insights'

export function useActivityTemplates() {
  return useQuery({
    queryKey: ['activityTemplates'],
    queryFn: () => getActivityTemplates(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useOverviewDashboard(dates: PeriodDates, preset: PeriodPreset) {
  const queryClient = useQueryClient()
  const query = useQuery({ ...overviewDashboardQueryOptions(dates, preset), placeholderData: keepPreviousData })
  useEffect(() => {
    if (!query.data || query.isPlaceholderData) return
    const timestamp = { updatedAt: query.dataUpdatedAt }
    // 같은 스냅샷의 원본을 시간 분석·편집 화면에서도 재사용한다.
    queryClient.setQueryData(['insights', dates.startDate, dates.endDate], query.data.insights, timestamp)
    queryClient.setQueryData(['activityTemplates'], query.data.templates, timestamp)
  }, [queryClient, query.data, query.dataUpdatedAt, query.isPlaceholderData, dates.startDate, dates.endDate])
  return query
}

export function useCreateActivityFromTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, customDate, durationMinutes }: { templateId: string, customDate?: Date, durationMinutes?: number }) => createActivityFromTemplate(templateId, customDate, durationMinutes),
    onSuccess: () => invalidateQueryRoots(queryClient, ['activities', 'calendar-month', 'templatesSummary', 'overviewDashboard', 'insights'])
  })
}

export function useInsightsData(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['insights', startDate, endDate],
    queryFn: ({ signal }) => loadViewData('time', { startDate, endDate }, signal),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

export function useSubjectDetails(subjectId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['subjectDetails', subjectId, startDate, endDate],
    queryFn: () => getSubjectDetails(subjectId, startDate, endDate),
    enabled: !!subjectId && !!startDate && !!endDate
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<ActivityTemplate, 'id'>) => {
      const result = await createActivityTemplate(payload)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: async () => {
      await invalidateQueryRoots(queryClient, ['activityTemplates', 'templatesSummary'])
    }
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: Partial<Omit<ActivityTemplate, 'id'>> }) => {
      const result = await updateActivityTemplate(id, payload)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: async () => {
      await invalidateQueryRoots(queryClient, ['activityTemplates', 'templatesSummary', 'templateLinkedActivities', 'activities', 'calendar-month'])
    }
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteActivityTemplate(id),
    onSuccess: async () => {
      await invalidateQueryRoots(queryClient, ['activityTemplates', 'templatesSummary'])
    }
  })
}

// ─── 템플릿 센터 Hooks ───

export function useAllTemplatesSummary(startDate: string, endDate: string, prevStartDate: string, prevEndDate: string, trendType: 'daily' | 'weekly' | 'monthly' = 'daily') {
  return useQuery({
    ...templatesSummaryQueryOptions({ startDate, endDate, prevStartDate, prevEndDate, trendType, currentLabel: '', prevLabel: '' }),
    enabled: !!startDate && !!endDate && !!prevStartDate && !!prevEndDate,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useTemplateFullAnalytics(templateId: string | null) {
  return useQuery({
    queryKey: ['templateFullAnalytics', templateId],
    queryFn: () => getTemplateFullAnalytics(templateId!),
    enabled: !!templateId,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// ─── 시간 분석 탭 Hooks ───

export function useCategoryMonthlyTrend(categoryId: string | null) {
  return useQuery({
    queryKey: ['categoryMonthlyTrend', categoryId],
    queryFn: () => getCategoryMonthlyTrend(categoryId!),
    enabled: !!categoryId
  })
}



// ─── 종합 현황 탭 Hooks ───

export function useOverviewKPI(startDate: string, endDate: string, periodType: string = 'week') {
  return useQuery({
    queryKey: ['overviewKPI', startDate, endDate, periodType],
    queryFn: () => getOverviewKPI(startDate, endDate, periodType),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

// ─── 실행력 탭 Hooks ───

export function useExecutionAnalytics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['executionAnalytics', startDate, endDate],
    queryFn: ({ signal }) => loadViewData('execution', { startDate: startDate ?? '', endDate: endDate ?? '' }, signal),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

// ─── FEAT-01: 템플릿-일정 연결 Hooks ───

export function useTemplateLinkedActivities(templateId: string | null) {
  return useQuery({
    queryKey: ['templateLinkedActivities', templateId],
    queryFn: () => getTemplateLinkedActivities(templateId!),
    enabled: !!templateId
  })
}

export function useLinkActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, activityId }: { templateId: string; activityId: string }) =>
      linkActivityToTemplate(templateId, activityId),
    onMutate: async ({ templateId, activityId }) => {
      await queryClient.cancelQueries({ queryKey: ['searchForLinking', templateId] })
      const previousData = queryClient.getQueryData(['searchForLinking', templateId])
      queryClient.setQueriesData(
        { queryKey: ['searchForLinking', templateId] },
        (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.map((act: any) => 
            act.id === activityId ? { ...act, isLinked: true } : act
          );
        }
      )
      return { previousData, templateId }
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['searchForLinking', context.templateId], context.previousData)
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templateLinkedActivities', variables.templateId] })
      queryClient.invalidateQueries({ queryKey: ['templatesSummary'] })
      queryClient.invalidateQueries({ queryKey: ['templateUsageStats'] })
      queryClient.invalidateQueries({ queryKey: ['searchForLinking', variables.templateId] })
    }
  })
}

export function useUnlinkActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, activityId }: { templateId: string; activityId: string }) =>
      unlinkActivityFromTemplate(templateId, activityId),
    onMutate: async ({ templateId, activityId }) => {
      await queryClient.cancelQueries({ queryKey: ['searchForLinking', templateId] })
      const previousData = queryClient.getQueryData(['searchForLinking', templateId])
      queryClient.setQueriesData(
        { queryKey: ['searchForLinking', templateId] },
        (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.map((act: any) => 
            act.id === activityId ? { ...act, isLinked: false } : act
          );
        }
      )
      return { previousData, templateId }
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['searchForLinking', context.templateId], context.previousData)
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templateLinkedActivities', variables.templateId] })
      queryClient.invalidateQueries({ queryKey: ['templatesSummary'] })
      queryClient.invalidateQueries({ queryKey: ['templateUsageStats'] })
      queryClient.invalidateQueries({ queryKey: ['searchForLinking', variables.templateId] })
    }
  })
}

export function useSearchActivitiesForLinking(templateId: string | null, query: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['searchForLinking', templateId, query, dateFrom, dateTo],
    queryFn: () => searchActivitiesForLinking(templateId!, query, dateFrom, dateTo),
    enabled: !!templateId
  })
}

export function useAnnualGoalProgress(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['annualGoalProgress', startDate, endDate],
    queryFn: () => getAnnualGoalProgress(startDate, endDate),
    staleTime: 10 * 60 * 1000 // 10분 캐시 (연간 데이터는 자주 안바뀜)
  })
}
