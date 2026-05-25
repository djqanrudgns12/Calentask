import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActivityTemplates, createActivityFromTemplate, getInsightsData, getSubjectDetails } from '@/app/actions/insights'

export function useActivityTemplates() {
  return useQuery({
    queryKey: ['activityTemplates'],
    queryFn: () => getActivityTemplates()
  })
}

export function useCreateActivityFromTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, customDate }: { templateId: string, customDate?: Date }) => createActivityFromTemplate(templateId, customDate),
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
