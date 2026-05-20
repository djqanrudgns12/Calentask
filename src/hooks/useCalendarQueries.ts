import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActivities, getCategories, createActivity, deleteActivity, createCategory, deleteCategory, getDeletedActivities, restoreActivity, hardDeleteActivity, emptyTrash, type Activity, type Category } from '@/app/actions/calendar'
import { getUserProfile, updateUserProfile } from '@/app/actions/profile'

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

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
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
    mutationFn: ({ payload, categoryIds }: { payload: Omit<Activity, 'id' | 'user_id' | 'deleted_at' | 'categories'>, categoryIds: string[] }) => 
      createActivity(payload, categoryIds),
    onMutate: async (newActivityData) => {
      await queryClient.cancelQueries({ queryKey: ['activities', startDate, endDate] })
      
      const previousActivities = queryClient.getQueryData<Activity[]>(['activities', startDate, endDate])
      
      if (previousActivities) {
        const optimisticActivity: Activity = {
          id: `temp-${Date.now()}`,
          user_id: 'temp',
          title: newActivityData.payload.title,
          start_time: newActivityData.payload.start_time,
          end_time: newActivityData.payload.end_time,
          is_all_day: newActivityData.payload.is_all_day,
          memo: newActivityData.payload.memo || null,
          type: newActivityData.payload.type,
          hex_color: newActivityData.payload.hex_color || null,
          deleted_at: null,
          categories: []
        }
        
        queryClient.setQueryData(['activities', startDate, endDate], [...previousActivities, optimisticActivity])
      }
      return { previousActivities }
    },
    onError: (err, newActivityData, context) => {
      if (context?.previousActivities) {
        queryClient.setQueryData(['activities', startDate, endDate], context.previousActivities)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    }
  })
}

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

export function useDeletedActivities() {
  return useQuery({
    queryKey: ['deleted_activities'],
    queryFn: () => getDeletedActivities(),
  })
}

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

export function useHardDeleteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => hardDeleteActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_activities'] })
    }
  })
}

export function useEmptyTrash() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => emptyTrash(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_activities'] })
    }
  })
}

export function useUserProfile() {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: () => getUserProfile(),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { full_name?: string; username?: string; avatar_url?: string }) => updateUserProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    }
  })
}
