import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActivityTemplates, createActivityTemplate, updateActivityTemplate, deleteActivityTemplate, createActivityFromTemplate, getInsightsData, getSubjectDetails } from '@/app/actions/insights'
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
    enabled: !!startDate && !!endDate
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
