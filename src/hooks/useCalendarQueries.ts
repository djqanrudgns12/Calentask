import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActivities, getCategories, createActivity, deleteActivity, createCategory, getDeletedActivities, restoreActivity, type Activity, type Category } from '@/app/actions/calendar'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, hexColor }: { name: string, hexColor: string }) => createCategory(name, hexColor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })
}

export function useActivities(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['activities', startDate, endDate],
    queryFn: () => getActivities(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useCreateActivity(startDate: string, endDate: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ payload, categoryIds }: { payload: any, categoryIds: string[] }) => 
      createActivity(payload, categoryIds),
    onMutate: async (newActivityData) => {
      // 낙관적 업데이트 로직 (Optimistic UI)
      await queryClient.cancelQueries({ queryKey: ['activities', startDate, endDate] })
      
      const previousActivities = queryClient.getQueryData<Activity[]>(['activities', startDate, endDate])
      
      if (previousActivities) {
        // 임시 ID 부여 및 프론트엔드 카테고리 매핑 (빠른 렌더링용)
        const optimisticActivity: Activity = {
          id: `temp-${Date.now()}`,
          user_id: 'temp',
          title: newActivityData.payload.title,
          start_time: newActivityData.payload.start_time,
          end_time: newActivityData.payload.end_time,
          is_all_day: newActivityData.payload.is_all_day,
          memo: newActivityData.payload.memo || null,
          type: newActivityData.payload.type,
          deleted_at: null,
          categories: [] // 임시 처리
        }
        
        queryClient.setQueryData(['activities', startDate, endDate], [...previousActivities, optimisticActivity])
      }
      return { previousActivities }
    },
    onError: (err, newActivityData, context) => {
      // 에러 발생 시 롤백
      if (context?.previousActivities) {
        queryClient.setQueryData(['activities', startDate, endDate], context.previousActivities)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    }
  })
}

// 소프트 삭제(휴지통으로 이동)
export function useDeleteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['deleted_activities'] })
    }
  })
}

// 휴지통 조회
export function useDeletedActivities() {
  return useQuery({
    queryKey: ['deleted_activities'],
    queryFn: () => getDeletedActivities(),
  })
}

// 휴지통에서 복구
export function useRestoreActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restoreActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['deleted_activities'] })
    }
  })
}
