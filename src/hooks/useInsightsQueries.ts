import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActivityTemplates, createActivityTemplate, updateActivityTemplate, deleteActivityTemplate, createActivityFromTemplate, getInsightsData, getSubjectDetails, getAllTemplatesSummary, getTemplateUsageStats, getTemplateMonthlyTrend, getTemplateWeeklyTrend, getTemplateDailyTrend, getCategoryMonthlyTrend, getCategoryDailyTrend, getOverviewKPI, getExecutionAnalytics, getTemplateLinkedActivities, linkActivityToTemplate, unlinkActivityFromTemplate, searchActivitiesForLinking } from '@/app/actions/insights'
import type { ActivityTemplate } from '@/app/actions/insights'

export function useActivityTemplates() {
  return useQuery({
    queryKey: ['activityTemplates'],
    queryFn: () => getActivityTemplates()
  })
}

export function useCreateActivityFromTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, customDate, durationMinutes }: { templateId: string, customDate?: Date, durationMinutes?: number }) => createActivityFromTemplate(templateId, customDate, durationMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['insights'] })
    }
  })
}

export function useInsightsData(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['insights', startDate, endDate],
    queryFn: () => getInsightsData(startDate, endDate),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityTemplates'] })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityTemplates'] })
    }
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteActivityTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityTemplates'] })
    }
  })
}

// ─── 템플릿 센터 Hooks ───

export function useAllTemplatesSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['templatesSummary', startDate, endDate],
    queryFn: () => getAllTemplatesSummary(startDate, endDate),
    enabled: !!startDate && !!endDate
  })
}

export function useTemplateUsageStats(templateId: string | null) {
  return useQuery({
    queryKey: ['templateUsageStats', templateId],
    queryFn: () => getTemplateUsageStats(templateId!, '', ''),
    enabled: !!templateId
  })
}

export function useTemplateMonthlyTrend(templateId: string | null) {
  return useQuery({
    queryKey: ['templateMonthlyTrend', templateId],
    queryFn: () => getTemplateMonthlyTrend(templateId!),
    enabled: !!templateId
  })
}

export function useTemplateWeeklyTrend(templateId: string | null) {
  return useQuery({
    queryKey: ['templateWeeklyTrend', templateId],
    queryFn: () => getTemplateWeeklyTrend(templateId!),
    enabled: !!templateId
  })
}

export function useTemplateDailyTrend(templateId: string | null, days: number = 30) {
  return useQuery({
    queryKey: ['templateDailyTrend', templateId, days],
    queryFn: () => getTemplateDailyTrend(templateId!, days),
    enabled: !!templateId
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

export function useCategoryDailyTrend(categoryId: string | null, days: number = 7) {
  return useQuery({
    queryKey: ['categoryDailyTrend', categoryId, days],
    queryFn: () => getCategoryDailyTrend(categoryId!, days),
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

export function useExecutionAnalytics() {
  return useQuery({
    queryKey: ['executionAnalytics'],
    queryFn: () => getExecutionAnalytics()
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templateLinkedActivities', variables.templateId] })
      queryClient.invalidateQueries({ queryKey: ['templatesSummary'] })
      queryClient.invalidateQueries({ queryKey: ['templateUsageStats'] })
    }
  })
}

export function useUnlinkActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, activityId }: { templateId: string; activityId: string }) =>
      unlinkActivityFromTemplate(templateId, activityId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templateLinkedActivities', variables.templateId] })
      queryClient.invalidateQueries({ queryKey: ['templatesSummary'] })
      queryClient.invalidateQueries({ queryKey: ['templateUsageStats'] })
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
