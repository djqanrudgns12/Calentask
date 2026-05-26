import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActivities, getCategories, createActivity, updateActivity, deleteActivity, createCategory, updateCategory, deleteCategory, getDeletedActivities, restoreActivity, hardDeleteActivity, emptyTrash, searchActivities, getCategoryPresets, createCategoryPreset, updateCategoryPreset, deleteCategoryPreset, type Activity, type Category, type CategoryPreset } from '@/app/actions/calendar'
import { getUserProfile, updateUserProfile } from '@/app/actions/profile'

export const SYS_ANNIVERSARY_CATEGORY: Category = {
  id: 'sys-anniversary',
  name: '기념일',
  hex_color: '#8B5CF6',
  is_default: true,
  user_id: 'system'
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const data = await getCategories()
      return [...data, SYS_ANNIVERSARY_CATEGORY]
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, hexColor }: { name: string, hexColor: string }) => createCategory(name, hexColor),
    onMutate: async (newCategory) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] })
      const previousCategories = queryClient.getQueryData<Category[]>(['categories'])
      
      const optimisticCategory: Category = {
        id: `temp-${Date.now()}`,
        name: newCategory.name,
        hex_color: newCategory.hexColor,
        is_default: false,
        user_id: 'temp-user'
      }
      
      queryClient.setQueryData<Category[]>(['categories'], (old) => old ? [...old, optimisticCategory] : [optimisticCategory])
      return { previousCategories }
    },
    onError: (err, newCategory, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories'], context.previousCategories)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name, hexColor }: { id: string, name: string, hexColor: string }) => updateCategory(id, name, hexColor),
    onMutate: async (updatedCat) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] })
      const previousCategories = queryClient.getQueryData<Category[]>(['categories'])
      
      queryClient.setQueryData<Category[]>(['categories'], (old) => 
        old?.map(cat => cat.id === updatedCat.id ? { ...cat, name: updatedCat.name, hex_color: updatedCat.hexColor } : cat)
      )
      return { previousCategories }
    },
    onError: (err, newCategory, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories'], context.previousCategories)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] })
      const previousCategories = queryClient.getQueryData<Category[]>(['categories'])
      
      queryClient.setQueryData<Category[]>(['categories'], (old) => 
        old?.filter(cat => cat.id !== id)
      )
      return { previousCategories }
    },
    onError: (err, id, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories'], context.previousCategories)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })
}

export function useCategoryPresets() {
  return useQuery({
    queryKey: ['category_presets'],
    queryFn: () => getCategoryPresets(),
  })
}

export function useCreateCategoryPreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, categoryIds }: { name: string, categoryIds: string[] }) => createCategoryPreset(name, categoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_presets'] })
    }
  })
}

export function useUpdateCategoryPreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string, name: string }) => updateCategoryPreset(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_presets'] })
    }
  })
}

export function useDeleteCategoryPreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategoryPreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_presets'] })
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

export function useUpdateActivity(startDate: string, endDate: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload, categoryIds }: { id: string, payload: Partial<Omit<Activity, 'id' | 'user_id' | 'deleted_at' | 'categories'>>, categoryIds: string[] }) => 
      updateActivity(id, payload, categoryIds),
    onMutate: async (newActivityData) => {
      await queryClient.cancelQueries({ queryKey: ['activities', startDate, endDate] })
      
      const previousActivities = queryClient.getQueryData<Activity[]>(['activities', startDate, endDate])
      
      if (previousActivities) {
        queryClient.setQueryData(['activities', startDate, endDate], 
          previousActivities.map(activity => 
            activity.id === newActivityData.id 
              ? { ...activity, ...newActivityData.payload, categories: [] } // 카테고리는 낙관적 업데이트에 포함 생략(단순화)
              : activity
          )
        )
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
    mutationFn: (payload: { full_name?: string; username?: string; avatar_url?: string; recovery_email?: string }) => updateUserProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    }
  })
}

import { updateUserPassword } from '@/app/actions/profile'

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (password: string) => updateUserPassword(password),
  })
}

export function useSearchActivities(query: string) {
  return useQuery({
    queryKey: ['searchActivities', query],
    queryFn: () => searchActivities(query),
    enabled: query.length > 1, // 2글자 이상일 때만 검색
  })
}
